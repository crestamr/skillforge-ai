"""
Dependency injection for SkillForge AI Backend
Provides reusable dependencies for FastAPI endpoints
"""

from typing import Generator, Optional, AsyncGenerator
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis import Redis
import logging
from datetime import datetime, timedelta

from app.core.database import get_db, get_mongodb, get_redis
from app.core.security import verify_token, get_subject_from_token
from app.core.config import settings
from app.models.user import User
from app.services.user_service import UserService
from app.services.cache_service import CacheService
from app.services.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Extract user ID from JWT token
    Returns None if no token or invalid token (for optional authentication)
    """
    if not credentials:
        return None
    
    try:
        user_id = get_subject_from_token(credentials.credentials, "access")
        return user_id
    except Exception as e:
        logger.warning(f"Error extracting user ID from token: {e}")
        return None


async def get_current_user_id_required(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extract user ID from JWT token (required authentication)
    Raises HTTPException if no token or invalid token
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = get_subject_from_token(credentials.credentials, "access")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


async def get_current_user(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id_required)
) -> User:
    """
    Get current authenticated user from database
    """
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (alias for get_current_user for clarity)
    """
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify admin privileges
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


async def get_current_enterprise_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current user and verify enterprise privileges
    """
    if current_user.role not in ["admin", "enterprise"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enterprise privileges required"
        )
    
    return current_user


async def get_user_service(
    db: Session = Depends(get_db)
) -> UserService:
    """
    Get UserService instance
    """
    return UserService(db)


async def get_cache_service(
    redis_client: Redis = Depends(get_redis)
) -> CacheService:
    """
    Get CacheService instance
    """
    return CacheService(redis_client)


async def get_rate_limiter(
    request: Request,
    redis_client: Redis = Depends(get_redis)
) -> RateLimiter:
    """
    Get RateLimiter instance for the current request
    """
    # Use IP address as identifier, but could be enhanced with user ID
    client_ip = request.client.host
    return RateLimiter(redis_client, client_ip)


async def check_rate_limit(
    request: Request,
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """
    Check rate limit for the current request
    """
    if not settings.ENABLE_RATE_LIMITING:
        return
    
    endpoint = f"{request.method}:{request.url.path}"
    
    # Check if rate limit is exceeded
    if not await rate_limiter.is_allowed(
        endpoint, 
        limit=settings.RATE_LIMIT_PER_MINUTE,
        window=60
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "60"}
        )


class CommonQueryParams:
    """Common query parameters for list endpoints"""
    
    def __init__(
        self,
        page: int = 1,
        size: int = settings.DEFAULT_PAGE_SIZE,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        search: Optional[str] = None
    ):
        # Validate page
        if page < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Page must be greater than 0"
            )
        
        # Validate size
        if size < 1 or size > settings.MAX_PAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Size must be between 1 and {settings.MAX_PAGE_SIZE}"
            )
        
        # Validate sort order
        if sort_order.lower() not in ["asc", "desc"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sort order must be 'asc' or 'desc'"
            )
        
        self.page = page
        self.size = size
        self.offset = (page - 1) * size
        self.sort_by = sort_by
        self.sort_order = sort_order.lower()
        self.search = search


async def get_common_params(
    page: int = 1,
    size: int = settings.DEFAULT_PAGE_SIZE,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    search: Optional[str] = None
) -> CommonQueryParams:
    """
    Get common query parameters dependency
    """
    return CommonQueryParams(page, size, sort_by, sort_order, search)


class DatabaseDeps:
    """Database dependencies container"""
    
    def __init__(
        self,
        db: Session = Depends(get_db),
        mongodb: AsyncIOMotorDatabase = Depends(get_mongodb),
        redis: Redis = Depends(get_redis)
    ):
        self.db = db
        self.mongodb = mongodb
        self.redis = redis


async def get_database_deps() -> DatabaseDeps:
    """
    Get all database dependencies
    """
    return DatabaseDeps()


# Optional authentication dependency
async def get_optional_current_user(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Depends(get_current_user_id)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    Useful for endpoints that work with or without authentication
    """
    if not user_id:
        return None
    
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    
    if user and user.account_status == "active":
        return user
    
    return None


# Refresh token dependency
async def get_refresh_token_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extract user ID from refresh token
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = get_subject_from_token(credentials.credentials, "refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_id


# Feature flag dependencies
async def require_registration_enabled():
    """
    Require registration to be enabled
    """
    if not settings.ENABLE_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Registration is currently disabled"
        )


async def require_oauth_enabled():
    """
    Require OAuth to be enabled
    """
    if not settings.ENABLE_OAUTH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth authentication is currently disabled"
        )


# Request context dependency
class RequestContext:
    """Request context information"""
    
    def __init__(self, request: Request):
        self.request = request
        self.client_ip = request.client.host
        self.user_agent = request.headers.get("user-agent", "")
        self.timestamp = datetime.utcnow()
        self.request_id = request.headers.get("x-request-id", "")


async def get_request_context(request: Request) -> RequestContext:
    """
    Get request context information
    """
    return RequestContext(request)
