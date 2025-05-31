"""
SkillForge AI - Authentication Service Tests
Comprehensive unit tests for authentication, authorization, and security
"""

import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
import redis

from app.security.authentication import (
    AuthenticationService, PasswordPolicy, MFAManager, SessionManager
)
from app.security.encryption import FieldEncryption
from app.models.user import User, UserSession, LoginAttempt
from tests.conftest import UserFactory

class TestPasswordPolicy:
    """Test password policy validation."""
    
    def test_valid_password(self):
        """Test validation of a strong password."""
        password = "SecurePassword123!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is True
        assert len(result['errors']) == 0
        assert result['strength_score'] > 80
    
    def test_password_too_short(self):
        """Test password length validation."""
        password = "Short1!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("at least 12 characters" in error for error in result['errors'])
    
    def test_password_missing_uppercase(self):
        """Test uppercase requirement."""
        password = "lowercase123!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("uppercase letter" in error for error in result['errors'])
    
    def test_password_missing_lowercase(self):
        """Test lowercase requirement."""
        password = "UPPERCASE123!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("lowercase letter" in error for error in result['errors'])
    
    def test_password_missing_numbers(self):
        """Test number requirement."""
        password = "NoNumbersHere!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("number" in error for error in result['errors'])
    
    def test_password_missing_special_chars(self):
        """Test special character requirement."""
        password = "NoSpecialChars123"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("special character" in error for error in result['errors'])
    
    def test_password_with_sequential_chars(self):
        """Test detection of sequential characters."""
        password = "Password123abc!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("forbidden patterns" in error for error in result['errors'])
    
    def test_password_with_repeated_chars(self):
        """Test detection of repeated characters."""
        password = "Passwordaaa123!"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("forbidden patterns" in error for error in result['errors'])
    
    def test_common_password_rejection(self):
        """Test rejection of common passwords."""
        password = "password123"
        result = PasswordPolicy.validate_password(password)
        
        assert result['valid'] is False
        assert any("too common" in error for error in result['errors'])
    
    def test_password_with_personal_info(self):
        """Test rejection of passwords containing personal information."""
        user_info = {
            'email': 'john.doe@example.com',
            'first_name': 'John',
            'last_name': 'Doe'
        }
        password = "JohnPassword123!"
        result = PasswordPolicy.validate_password(password, user_info)
        
        assert result['valid'] is False
        assert any("personal information" in error for error in result['errors'])
    
    def test_password_strength_calculation(self):
        """Test password strength scoring."""
        weak_password = "Weak1!"
        medium_password = "MediumPassword123!"
        strong_password = "VeryStrongPassword123!@#$%"
        
        weak_result = PasswordPolicy.validate_password(weak_password)
        medium_result = PasswordPolicy.validate_password(medium_password)
        strong_result = PasswordPolicy.validate_password(strong_password)
        
        assert weak_result['strength_score'] < medium_result['strength_score']
        assert medium_result['strength_score'] < strong_result['strength_score']

class TestMFAManager:
    """Test Multi-Factor Authentication functionality."""
    
    def test_generate_totp_secret(self):
        """Test TOTP secret generation."""
        secret = MFAManager.generate_totp_secret()
        
        assert isinstance(secret, str)
        assert len(secret) == 32  # Base32 encoded secret
        assert secret.isalnum()
    
    def test_generate_qr_code(self):
        """Test QR code generation for TOTP setup."""
        secret = MFAManager.generate_totp_secret()
        qr_code = MFAManager.generate_qr_code("test@example.com", secret)
        
        assert isinstance(qr_code, bytes)
        assert len(qr_code) > 0
    
    @patch('pyotp.TOTP')
    def test_verify_totp_valid(self, mock_totp):
        """Test TOTP token verification with valid token."""
        mock_totp_instance = Mock()
        mock_totp_instance.verify.return_value = True
        mock_totp.return_value = mock_totp_instance
        
        result = MFAManager.verify_totp("test_secret", "123456")
        
        assert result is True
        mock_totp.assert_called_once_with("test_secret")
        mock_totp_instance.verify.assert_called_once_with("123456", valid_window=1)
    
    @patch('pyotp.TOTP')
    def test_verify_totp_invalid(self, mock_totp):
        """Test TOTP token verification with invalid token."""
        mock_totp_instance = Mock()
        mock_totp_instance.verify.return_value = False
        mock_totp.return_value = mock_totp_instance
        
        result = MFAManager.verify_totp("test_secret", "invalid")
        
        assert result is False
    
    def test_generate_backup_codes(self):
        """Test backup code generation."""
        codes = MFAManager.generate_backup_codes(10)
        
        assert len(codes) == 10
        assert all(isinstance(code, str) for code in codes)
        assert all(len(code) == 9 for code in codes)  # Format: XXXX-XXXX
        assert all('-' in code for code in codes)
        
        # Ensure codes are unique
        assert len(set(codes)) == 10

class TestSessionManager:
    """Test session management functionality."""
    
    @patch('redis.Redis')
    def test_create_session(self, mock_redis):
        """Test session creation."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        
        mock_request = Mock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-user-agent"
        
        session_id = SessionManager.create_session(1, mock_request, remember_me=False)
        
        assert isinstance(session_id, str)
        assert len(session_id) > 0
        mock_redis_instance.setex.assert_called()
        mock_redis_instance.sadd.assert_called()
    
    @patch('redis.Redis')
    def test_get_session_valid(self, mock_redis):
        """Test retrieving valid session."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.get.return_value = str({
            'user_id': 1,
            'created_at': datetime.utcnow().isoformat(),
            'ip_address': '127.0.0.1'
        })
        
        session_data = SessionManager.get_session("test_session_id")
        
        assert session_data is not None
        assert session_data['user_id'] == 1
    
    @patch('redis.Redis')
    def test_get_session_invalid(self, mock_redis):
        """Test retrieving invalid session."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.get.return_value = None
        
        session_data = SessionManager.get_session("invalid_session_id")
        
        assert session_data is None
    
    @patch('redis.Redis')
    def test_invalidate_session(self, mock_redis):
        """Test session invalidation."""
        mock_redis_instance = Mock()
        mock_redis.return_value = mock_redis_instance
        mock_redis_instance.get.return_value = str({'user_id': 1})
        
        SessionManager.invalidate_session("test_session_id")
        
        mock_redis_instance.delete.assert_called()
        mock_redis_instance.srem.assert_called()

class TestAuthenticationService:
    """Test main authentication service functionality."""
    
    def test_register_user_success(self, db_session, sample_user_data):
        """Test successful user registration."""
        auth_service = AuthenticationService(db_session)
        
        result = auth_service.register_user(**sample_user_data)
        
        assert result['user_id'] is not None
        assert result['email_verification_sent'] is True
        
        # Verify user was created in database
        user = db_session.query(User).filter(User.email == sample_user_data['email']).first()
        assert user is not None
        assert user.email == sample_user_data['email']
        assert user.first_name == sample_user_data['first_name']
    
    def test_register_user_duplicate_email(self, db_session, sample_user_data):
        """Test registration with duplicate email."""
        auth_service = AuthenticationService(db_session)
        
        # Create first user
        auth_service.register_user(**sample_user_data)
        
        # Try to create second user with same email
        with pytest.raises(HTTPException) as exc_info:
            auth_service.register_user(**sample_user_data)
        
        assert exc_info.value.status_code == 400
        assert "already exists" in str(exc_info.value.detail)
    
    def test_register_user_weak_password(self, db_session, sample_user_data):
        """Test registration with weak password."""
        auth_service = AuthenticationService(db_session)
        
        # Use weak password
        sample_user_data['password'] = 'weak'
        
        with pytest.raises(HTTPException) as exc_info:
            auth_service.register_user(**sample_user_data)
        
        assert exc_info.value.status_code == 400
        assert "security requirements" in str(exc_info.value.detail)
    
    @patch('app.security.authentication.password_hasher')
    def test_authenticate_user_success(self, mock_hasher, db_session, sample_user_data):
        """Test successful user authentication."""
        auth_service = AuthenticationService(db_session)
        
        # Create user first
        user_result = auth_service.register_user(**sample_user_data)
        
        # Mock password verification
        mock_hasher.verify.return_value = None  # No exception means success
        mock_hasher.check_needs_rehash.return_value = False
        
        mock_request = Mock()
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get.return_value = "test-user-agent"
        
        with patch.object(SessionManager, 'create_session', return_value='test_session'):
            with patch.object(auth_service, '_create_access_token', return_value='test_token'):
                result = auth_service.authenticate_user(
                    sample_user_data['email'],
                    sample_user_data['password'],
                    mock_request
                )
        
        assert result['access_token'] == 'test_token'
        assert result['user_id'] == user_result['user_id']
    
    def test_authenticate_user_invalid_email(self, db_session):
        """Test authentication with invalid email."""
        auth_service = AuthenticationService(db_session)
        
        mock_request = Mock()
        mock_request.client.host = "127.0.0.1"
        
        with pytest.raises(HTTPException) as exc_info:
            auth_service.authenticate_user(
                "nonexistent@example.com",
                "password",
                mock_request
            )
        
        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in str(exc_info.value.detail)
    
    @patch('app.security.authentication.password_hasher')
    def test_authenticate_user_invalid_password(self, mock_hasher, db_session, sample_user_data):
        """Test authentication with invalid password."""
        auth_service = AuthenticationService(db_session)
        
        # Create user first
        auth_service.register_user(**sample_user_data)
        
        # Mock password verification failure
        from argon2.exceptions import VerifyMismatchError
        mock_hasher.verify.side_effect = VerifyMismatchError()
        
        mock_request = Mock()
        mock_request.client.host = "127.0.0.1"
        
        with pytest.raises(HTTPException) as exc_info:
            auth_service.authenticate_user(
                sample_user_data['email'],
                "wrong_password",
                mock_request
            )
        
        assert exc_info.value.status_code == 401
        assert "Invalid credentials" in str(exc_info.value.detail)
    
    def test_authenticate_user_locked_account(self, db_session, sample_user_data):
        """Test authentication with locked account."""
        auth_service = AuthenticationService(db_session)
        
        # Create user and lock account
        user_result = auth_service.register_user(**sample_user_data)
        user = db_session.query(User).filter(User.id == user_result['user_id']).first()
        user.is_locked = True
        db_session.commit()
        
        mock_request = Mock()
        mock_request.client.host = "127.0.0.1"
        
        with pytest.raises(HTTPException) as exc_info:
            auth_service.authenticate_user(
                sample_user_data['email'],
                sample_user_data['password'],
                mock_request
            )
        
        assert exc_info.value.status_code == 423
        assert "locked" in str(exc_info.value.detail)

class TestAuthenticationIntegration:
    """Integration tests for authentication flow."""
    
    def test_complete_registration_flow(self, client, sample_user_data):
        """Test complete user registration flow."""
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data['user_id'] is not None
        assert data['email_verification_sent'] is True
    
    def test_complete_login_flow(self, client, sample_user_data):
        """Test complete user login flow."""
        # Register user first
        client.post("/api/v1/auth/register", json=sample_user_data)
        
        # Login
        login_data = {
            "email": sample_user_data['email'],
            "password": sample_user_data['password']
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['token_type'] == 'bearer'
    
    def test_protected_endpoint_access(self, client, authenticated_user):
        """Test access to protected endpoints with valid token."""
        response = client.get(
            "/api/v1/users/profile",
            headers=authenticated_user['headers']
        )
        
        assert response.status_code == 200
    
    def test_protected_endpoint_no_token(self, client):
        """Test access to protected endpoints without token."""
        response = client.get("/api/v1/users/profile")
        
        assert response.status_code == 401
