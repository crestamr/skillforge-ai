"""
Authentication endpoints for SkillForge AI Backend
"""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import timedelta
import logging

from app.core.database import get_db
from app.core.security import (
    create_access_token, 
    create_refresh_token,
    verify_password_reset_token,
    verify_email_verification_token,
    generate_password_reset_token,
    generate_email_verification_token,
    get_password_hash
)
from app.core.config import settings
from app.schemas.user import (
    UserLogin, 
    UserRegister, 
    Token, 
    UserResponse,
    PasswordReset,
    PasswordResetConfirm,
    EmailVerification,
    TokenRefresh
)
from app.services.user_service import UserService
from app.api.deps import (
    get_current_user_id_required,
    get_refresh_token_user_id,
    require_registration_enabled,
    check_rate_limit,
    get_request_context,
    RequestContext
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=UserResponse, dependencies=[Depends(require_registration_enabled)])
async def register(
    user_data: UserRegister,
    request_context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
    _: Any = Depends(check_rate_limit)
) -> Any:
    """
    Register a new user account
    """
    try:
        user_service = UserService(db)
        
        # Create user
        user = await user_service.create_user(user_data)
        
        # Log activity with request context
        await user_service.log_activity(
            user_id=str(user.id),
            activity_type="user_registered",
            activity_data={
                "email": user_data.email,
                "registration_method": "email"
            },
            ip_address=request_context.client_ip,
            user_agent=request_context.user_agent
        )
        
        logger.info(f"New user registered: {user_data.email}")
        return user
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=Token)
async def login(
    user_credentials: UserLogin,
    request_context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db),
    _: Any = Depends(check_rate_limit)
) -> Any:
    """
    User login with email and password
    """
    try:
        user_service = UserService(db)
        
        # Authenticate user
        user = await user_service.authenticate_user(
            user_credentials.email, 
            user_credentials.password
        )
        
        if not user:
            # Log failed login attempt
            await user_service.log_activity(
                user_id="anonymous",
                activity_type="login_failed",
                activity_data={
                    "email": user_credentials.email,
                    "reason": "invalid_credentials"
                },
                ip_address=request_context.client_ip,
                user_agent=request_context.user_agent
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if account is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active"
            )
        
        # Create tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        # Extend token expiry if "remember me" is checked
        if user_credentials.remember_me:
            access_token_expires = timedelta(days=1)
            refresh_token_expires = timedelta(days=30)
        
        access_token = create_access_token(
            subject=str(user.id),
            expires_delta=access_token_expires,
            additional_claims={
                "email": user.email,
                "role": user.role.value
            }
        )
        
        refresh_token = create_refresh_token(
            subject=str(user.id),
            expires_delta=refresh_token_expires
        )
        
        # Log successful login
        await user_service.log_activity(
            user_id=str(user.id),
            activity_type="user_login",
            activity_data={
                "email": user.email,
                "remember_me": user_credentials.remember_me
            },
            ip_address=request_context.client_ip,
            user_agent=request_context.user_agent
        )
        
        logger.info(f"User logged in: {user.email}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    user_id: str = Depends(get_refresh_token_user_id),
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_by_id(user_id)
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Create new tokens
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        
        access_token = create_access_token(
            subject=str(user.id),
            expires_delta=access_token_expires,
            additional_claims={
                "email": user.email,
                "role": user.role.value
            }
        )
        
        refresh_token = create_refresh_token(
            subject=str(user.id),
            expires_delta=refresh_token_expires
        )
        
        # Log token refresh
        await user_service.log_activity(
            user_id=str(user.id),
            activity_type="token_refreshed",
            activity_data={}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout")
async def logout(
    user_id: str = Depends(get_current_user_id_required),
    request_context: RequestContext = Depends(get_request_context),
    db: Session = Depends(get_db)
) -> Any:
    """
    User logout (invalidate tokens)
    """
    try:
        user_service = UserService(db)
        
        # Log logout activity
        await user_service.log_activity(
            user_id=user_id,
            activity_type="user_logout",
            activity_data={},
            ip_address=request_context.client_ip,
            user_agent=request_context.user_agent
        )
        
        # Note: In a production system, you would typically:
        # 1. Add tokens to a blacklist in Redis
        # 2. Or use shorter-lived tokens with a token rotation strategy
        # For now, we just log the logout
        
        logger.info(f"User logged out: {user_id}")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.post("/password-reset")
async def request_password_reset(
    password_reset: PasswordReset,
    db: Session = Depends(get_db),
    _: Any = Depends(check_rate_limit)
) -> Any:
    """
    Request password reset email
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_by_email(password_reset.email)
        
        # Always return success to prevent email enumeration
        if user:
            # Generate password reset token
            reset_token = generate_password_reset_token(user.email)
            
            # Log password reset request
            await user_service.log_activity(
                user_id=str(user.id),
                activity_type="password_reset_requested",
                activity_data={"email": user.email}
            )
            
            # TODO: Send email with reset token
            # For now, we just log it (in production, integrate with email service)
            logger.info(f"Password reset requested for: {user.email}")
        
        return {"message": "If the email exists, a password reset link has been sent"}
        
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    password_reset_confirm: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm password reset with token
    """
    try:
        # Verify reset token
        email = verify_password_reset_token(password_reset_confirm.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        user_service = UserService(db)
        user = await user_service.get_by_email(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.hashed_password = get_password_hash(password_reset_confirm.new_password)
        user.login_attempts = 0  # Reset login attempts
        user.locked_until = None  # Unlock account if locked
        
        db.commit()
        
        # Log password reset
        await user_service.log_activity(
            user_id=str(user.id),
            activity_type="password_reset_completed",
            activity_data={"email": user.email}
        )
        
        logger.info(f"Password reset completed for: {user.email}")
        
        return {"message": "Password has been reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirmation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/verify-email")
async def verify_email(
    email_verification: EmailVerification,
    db: Session = Depends(get_db)
) -> Any:
    """
    Verify email address with token
    """
    try:
        # Verify email token
        email = verify_email_verification_token(email_verification.token)
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )
        
        user_service = UserService(db)
        user = await user_service.get_by_email(email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.email_verified:
            return {"message": "Email is already verified"}
        
        # Verify email
        success = await user_service.verify_email(str(user.id))
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email verification failed"
            )
        
        logger.info(f"Email verified for: {user.email}")
        
        return {"message": "Email has been verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user_id: str = Depends(get_current_user_id_required),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get current user information
    """
    try:
        user_service = UserService(db)
        user = await user_service.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )
