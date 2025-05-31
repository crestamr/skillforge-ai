"""
Security utilities for SkillForge AI Backend
Handles JWT tokens, password hashing, and authentication
"""

from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt
import secrets
import string
from fastapi import HTTPException, status
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict] = None
) -> str:
    """
    Create a JWT access token
    
    Args:
        subject: The subject (usually user ID) for the token
        expires_delta: Token expiration time
        additional_claims: Additional claims to include in the token
    
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "access",
        "iat": datetime.utcnow()
    }
    
    if additional_claims:
        to_encode.update(additional_claims)
    
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )


def create_refresh_token(
    subject: Union[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT refresh token
    
    Args:
        subject: The subject (usually user ID) for the token
        expires_delta: Token expiration time
    
    Returns:
        Encoded JWT refresh token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "iat": datetime.utcnow()
    }
    
    try:
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating refresh token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create refresh token"
        )


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """
    Verify and decode a JWT token
    
    Args:
        token: The JWT token to verify
        token_type: Expected token type ("access" or "refresh")
    
    Returns:
        Decoded token payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Check token type
        if payload.get("type") != token_type:
            logger.warning(f"Invalid token type. Expected: {token_type}, Got: {payload.get('type')}")
            return None
        
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
            logger.warning("Token has expired")
            return None
        
        return payload
        
    except JWTError as e:
        logger.warning(f"JWT verification failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}")
        return None


def get_subject_from_token(token: str, token_type: str = "access") -> Optional[str]:
    """
    Extract subject (user ID) from a JWT token
    
    Args:
        token: The JWT token
        token_type: Expected token type
    
    Returns:
        Subject string or None if invalid
    """
    payload = verify_token(token, token_type)
    if payload:
        return payload.get("sub")
    return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
    
    Returns:
        True if password matches, False otherwise
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: The plain text password to hash
    
    Returns:
        Hashed password string
    """
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not hash password"
        )


def generate_password_reset_token(email: str) -> str:
    """
    Generate a password reset token
    
    Args:
        email: User email address
    
    Returns:
        Password reset token
    """
    delta = timedelta(hours=1)  # Reset token expires in 1 hour
    now = datetime.utcnow()
    expires = now + delta
    
    to_encode = {
        "exp": expires,
        "sub": email,
        "type": "password_reset",
        "iat": now
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset token and return the email
    
    Args:
        token: The password reset token
    
    Returns:
        Email address if token is valid, None otherwise
    """
    payload = verify_token(token, "password_reset")
    if payload:
        return payload.get("sub")
    return None


def generate_email_verification_token(email: str) -> str:
    """
    Generate an email verification token
    
    Args:
        email: User email address
    
    Returns:
        Email verification token
    """
    delta = timedelta(days=7)  # Verification token expires in 7 days
    now = datetime.utcnow()
    expires = now + delta
    
    to_encode = {
        "exp": expires,
        "sub": email,
        "type": "email_verification",
        "iat": now
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_email_verification_token(token: str) -> Optional[str]:
    """
    Verify an email verification token and return the email
    
    Args:
        token: The email verification token
    
    Returns:
        Email address if token is valid, None otherwise
    """
    payload = verify_token(token, "email_verification")
    if payload:
        return payload.get("sub")
    return None


def generate_random_password(length: int = 12) -> str:
    """
    Generate a random password
    
    Args:
        length: Length of the password to generate
    
    Returns:
        Random password string
    """
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


def generate_api_key() -> str:
    """
    Generate a random API key
    
    Returns:
        Random API key string
    """
    return secrets.token_urlsafe(32)


def validate_password_strength(password: str) -> dict:
    """
    Validate password strength
    
    Args:
        password: Password to validate
    
    Returns:
        Dictionary with validation results
    """
    result = {
        "valid": True,
        "errors": [],
        "score": 0
    }
    
    # Minimum length
    if len(password) < 8:
        result["valid"] = False
        result["errors"].append("Password must be at least 8 characters long")
    else:
        result["score"] += 1
    
    # Contains uppercase
    if any(c.isupper() for c in password):
        result["score"] += 1
    else:
        result["errors"].append("Password must contain at least one uppercase letter")
    
    # Contains lowercase
    if any(c.islower() for c in password):
        result["score"] += 1
    else:
        result["errors"].append("Password must contain at least one lowercase letter")
    
    # Contains digit
    if any(c.isdigit() for c in password):
        result["score"] += 1
    else:
        result["errors"].append("Password must contain at least one digit")
    
    # Contains special character
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if any(c in special_chars for c in password):
        result["score"] += 1
    else:
        result["errors"].append("Password must contain at least one special character")
    
    # Set validity based on score
    if result["score"] < 3:
        result["valid"] = False
    
    return result


class SecurityHeaders:
    """Security headers for HTTP responses"""
    
    @staticmethod
    def get_security_headers() -> dict:
        """Get recommended security headers"""
        return {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        }
