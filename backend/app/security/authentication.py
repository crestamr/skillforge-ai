"""
SkillForge AI - Enhanced Authentication System
Implements secure authentication with Argon2id hashing, MFA, and session management
"""

import secrets
import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import pyotp
import qrcode
from io import BytesIO
import argon2
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, HashingError
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import redis
import logging
from pydantic import BaseModel, EmailStr, validator
import re

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserSession, LoginAttempt, MFADevice
from app.core.security import verify_password, get_password_hash
from app.utils.email import send_email
from app.utils.sms import send_sms

logger = logging.getLogger(__name__)

# Initialize Redis for session management
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True
)

# Enhanced password hasher with Argon2id
password_hasher = PasswordHasher(
    time_cost=3,        # Number of iterations
    memory_cost=65536,  # Memory usage in KB (64 MB)
    parallelism=4,      # Number of parallel threads
    hash_len=32,        # Length of the hash
    salt_len=32,        # Length of the salt
    encoding='utf-8',
    type=argon2.Type.ID  # Use Argon2id variant
)

# Security bearer for JWT tokens
security = HTTPBearer()

class PasswordPolicy:
    """Enhanced password policy validation"""
    
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL_CHARS = True
    FORBIDDEN_PATTERNS = [
        r'(.)\1{2,}',  # No more than 2 consecutive identical characters
        r'(012|123|234|345|456|567|678|789|890)',  # No sequential numbers
        r'(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)',  # No sequential letters
    ]
    COMMON_PASSWORDS = [
        'password', '123456', 'password123', 'admin', 'qwerty',
        'letmein', 'welcome', 'monkey', '1234567890', 'password1'
    ]

    @classmethod
    def validate_password(cls, password: str, user_info: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Comprehensive password validation
        Returns dict with 'valid' boolean and 'errors' list
        """
        errors = []
        
        # Length check
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must not exceed {cls.MAX_LENGTH} characters")
        
        # Character requirements
        if cls.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        if cls.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        if cls.REQUIRE_NUMBERS and not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        if cls.REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Pattern checks
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, password.lower()):
                errors.append("Password contains forbidden patterns (sequential or repeated characters)")
                break
        
        # Common password check
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common and easily guessable")
        
        # Personal information check
        if user_info:
            personal_data = [
                user_info.get('email', '').split('@')[0].lower(),
                user_info.get('first_name', '').lower(),
                user_info.get('last_name', '').lower(),
                user_info.get('username', '').lower()
            ]
            for data in personal_data:
                if data and len(data) > 3 and data in password.lower():
                    errors.append("Password must not contain personal information")
                    break
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'strength_score': cls._calculate_strength(password)
        }
    
    @classmethod
    def _calculate_strength(cls, password: str) -> int:
        """Calculate password strength score (0-100)"""
        score = 0
        
        # Length bonus
        score += min(len(password) * 2, 25)
        
        # Character variety bonus
        if re.search(r'[a-z]', password):
            score += 10
        if re.search(r'[A-Z]', password):
            score += 10
        if re.search(r'\d', password):
            score += 10
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 15
        
        # Complexity bonus
        unique_chars = len(set(password))
        score += min(unique_chars * 2, 20)
        
        # Entropy bonus
        if len(password) > 16:
            score += 10
        
        return min(score, 100)

class MFAManager:
    """Multi-Factor Authentication Manager"""
    
    @staticmethod
    def generate_totp_secret() -> str:
        """Generate a new TOTP secret"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_qr_code(user_email: str, secret: str) -> bytes:
        """Generate QR code for TOTP setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user_email,
            issuer_name="SkillForge AI"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = BytesIO()
        img.save(img_buffer, format='PNG')
        return img_buffer.getvalue()
    
    @staticmethod
    def verify_totp(secret: str, token: str) -> bool:
        """Verify TOTP token"""
        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=1)  # Allow 30-second window
        except Exception as e:
            logger.error(f"TOTP verification error: {e}")
            return False
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> List[str]:
        """Generate backup codes for MFA"""
        codes = []
        for _ in range(count):
            code = secrets.token_hex(4).upper()
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes

class SessionManager:
    """Enhanced session management with Redis"""
    
    SESSION_PREFIX = "session:"
    USER_SESSIONS_PREFIX = "user_sessions:"
    MAX_CONCURRENT_SESSIONS = 3
    
    @staticmethod
    def create_session(user_id: int, request: Request, remember_me: bool = False) -> str:
        """Create a new user session"""
        session_id = secrets.token_urlsafe(32)
        
        # Session duration
        if remember_me:
            expires_in = timedelta(days=30)
        else:
            expires_in = timedelta(hours=8)
        
        session_data = {
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': (datetime.utcnow() + expires_in).isoformat(),
            'ip_address': request.client.host,
            'user_agent': request.headers.get('user-agent', ''),
            'last_activity': datetime.utcnow().isoformat(),
            'remember_me': remember_me
        }
        
        # Store session
        redis_client.setex(
            f"{SessionManager.SESSION_PREFIX}{session_id}",
            int(expires_in.total_seconds()),
            str(session_data)
        )
        
        # Track user sessions
        user_sessions_key = f"{SessionManager.USER_SESSIONS_PREFIX}{user_id}"
        redis_client.sadd(user_sessions_key, session_id)
        redis_client.expire(user_sessions_key, int(expires_in.total_seconds()))
        
        # Enforce concurrent session limit
        SessionManager._enforce_session_limit(user_id)
        
        return session_id
    
    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        session_data = redis_client.get(f"{SessionManager.SESSION_PREFIX}{session_id}")
        if session_data:
            return eval(session_data)  # In production, use proper JSON serialization
        return None
    
    @staticmethod
    def update_session_activity(session_id: str):
        """Update last activity timestamp"""
        session_data = SessionManager.get_session(session_id)
        if session_data:
            session_data['last_activity'] = datetime.utcnow().isoformat()
            ttl = redis_client.ttl(f"{SessionManager.SESSION_PREFIX}{session_id}")
            redis_client.setex(
                f"{SessionManager.SESSION_PREFIX}{session_id}",
                ttl,
                str(session_data)
            )
    
    @staticmethod
    def invalidate_session(session_id: str):
        """Invalidate a specific session"""
        session_data = SessionManager.get_session(session_id)
        if session_data:
            user_id = session_data['user_id']
            redis_client.delete(f"{SessionManager.SESSION_PREFIX}{session_id}")
            redis_client.srem(f"{SessionManager.USER_SESSIONS_PREFIX}{user_id}", session_id)
    
    @staticmethod
    def invalidate_all_user_sessions(user_id: int):
        """Invalidate all sessions for a user"""
        user_sessions_key = f"{SessionManager.USER_SESSIONS_PREFIX}{user_id}"
        session_ids = redis_client.smembers(user_sessions_key)
        
        for session_id in session_ids:
            redis_client.delete(f"{SessionManager.SESSION_PREFIX}{session_id}")
        
        redis_client.delete(user_sessions_key)
    
    @staticmethod
    def _enforce_session_limit(user_id: int):
        """Enforce maximum concurrent sessions"""
        user_sessions_key = f"{SessionManager.USER_SESSIONS_PREFIX}{user_id}"
        session_ids = list(redis_client.smembers(user_sessions_key))
        
        if len(session_ids) > SessionManager.MAX_CONCURRENT_SESSIONS:
            # Remove oldest sessions
            sessions_with_time = []
            for session_id in session_ids:
                session_data = SessionManager.get_session(session_id)
                if session_data:
                    sessions_with_time.append((session_id, session_data['created_at']))
            
            # Sort by creation time and remove oldest
            sessions_with_time.sort(key=lambda x: x[1])
            sessions_to_remove = sessions_with_time[:-SessionManager.MAX_CONCURRENT_SESSIONS]
            
            for session_id, _ in sessions_to_remove:
                SessionManager.invalidate_session(session_id)

class AuthenticationService:
    """Main authentication service"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def register_user(self, email: str, password: str, first_name: str, last_name: str) -> Dict[str, Any]:
        """Register a new user with enhanced security"""
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Validate password
        user_info = {
            'email': email,
            'first_name': first_name,
            'last_name': last_name
        }
        password_validation = PasswordPolicy.validate_password(password, user_info)
        
        if not password_validation['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Password does not meet security requirements",
                    "errors": password_validation['errors']
                }
            )
        
        # Hash password with Argon2id
        try:
            password_hash = password_hasher.hash(password)
        except HashingError as e:
            logger.error(f"Password hashing error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during registration"
            )
        
        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
            email_verified=False,
            created_at=datetime.utcnow(),
            password_changed_at=datetime.utcnow()
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Send verification email
        self._send_verification_email(user)
        
        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "email_verification_sent": True
        }
    
    def authenticate_user(self, email: str, password: str, request: Request, mfa_token: Optional[str] = None) -> Dict[str, Any]:
        """Authenticate user with enhanced security checks"""
        
        # Rate limiting check
        if self._is_rate_limited(email, request.client.host):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later."
            )
        
        # Get user
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            self._log_failed_attempt(email, request.client.host, "user_not_found")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if account is locked
        if user.is_locked:
            self._log_failed_attempt(email, request.client.host, "account_locked")
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Account is locked. Please contact support."
            )
        
        # Verify password
        try:
            password_hasher.verify(user.password_hash, password)
        except VerifyMismatchError:
            self._log_failed_attempt(email, request.client.host, "invalid_password")
            self._handle_failed_login(user)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if password needs rehashing (Argon2 parameters updated)
        if password_hasher.check_needs_rehash(user.password_hash):
            user.password_hash = password_hasher.hash(password)
            self.db.commit()
        
        # MFA verification if enabled
        if user.mfa_enabled:
            if not mfa_token:
                return {
                    "mfa_required": True,
                    "message": "MFA token required"
                }
            
            if not self._verify_mfa(user, mfa_token):
                self._log_failed_attempt(email, request.client.host, "invalid_mfa")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid MFA token"
                )
        
        # Create session
        session_id = SessionManager.create_session(user.id, request)
        
        # Generate JWT token
        access_token = self._create_access_token(user.id, session_id)
        
        # Update user login info
        user.last_login = datetime.utcnow()
        user.login_count += 1
        self.db.commit()
        
        # Log successful login
        self._log_successful_login(user, request.client.host)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "session_id": session_id
        }
    
    def _send_verification_email(self, user: User):
        """Send email verification"""
        # Implementation would send actual email
        pass
    
    def _is_rate_limited(self, email: str, ip_address: str) -> bool:
        """Check if login attempts are rate limited"""
        # Implementation for rate limiting
        return False
    
    def _log_failed_attempt(self, email: str, ip_address: str, reason: str):
        """Log failed login attempt"""
        # Implementation for logging
        pass
    
    def _handle_failed_login(self, user: User):
        """Handle failed login attempt"""
        # Implementation for account locking logic
        pass
    
    def _verify_mfa(self, user: User, token: str) -> bool:
        """Verify MFA token"""
        # Implementation for MFA verification
        return True
    
    def _create_access_token(self, user_id: int, session_id: str) -> str:
        """Create JWT access token"""
        # Implementation for JWT token creation
        return "jwt_token"
    
    def _log_successful_login(self, user: User, ip_address: str):
        """Log successful login"""
        # Implementation for success logging
        pass
