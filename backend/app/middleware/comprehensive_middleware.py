"""
SkillForge AI - Comprehensive Middleware System
Advanced middleware for authentication, rate limiting, caching, logging, and security
"""

import asyncio
import json
import time
import uuid
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import redis.asyncio as redis
import jwt
from cryptography.fernet import Fernet
import hashlib
import ipaddress
from user_agents import parse as parse_user_agent

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserSession
from app.utils.cache import cache_manager

logger = logging.getLogger(__name__)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Advanced authentication middleware with JWT and session management"""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or [
            "/", "/health", "/metrics", "/docs", "/openapi.json",
            "/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh"
        ]
        self.security = HTTPBearer(auto_error=False)
    
    async def dispatch(self, request: Request, call_next):
        # Skip authentication for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Extract token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Authentication required", "message": "Missing or invalid authorization header"}
            )
        
        token = authorization.split(" ")[1]
        
        try:
            # Verify JWT token
            payload = jwt.decode(
                token,
                getattr(settings, 'SECRET_KEY', 'dev-secret'),
                algorithms=["HS256"]
            )
            
            user_id = payload.get("user_id")
            session_id = payload.get("session_id")
            
            if not user_id or not session_id:
                raise jwt.InvalidTokenError("Invalid token payload")
            
            # Verify session is still active
            session_valid = await self._verify_session(user_id, session_id, request)
            if not session_valid:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"error": "Session expired", "message": "Please login again"}
                )
            
            # Add user context to request
            request.state.user_id = user_id
            request.state.session_id = session_id
            request.state.authenticated = True
            
            # Update session activity
            await self._update_session_activity(user_id, session_id)
            
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Token expired", "message": "Please refresh your token"}
            )
        except jwt.InvalidTokenError as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Invalid token", "message": str(e)}
            )
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Authentication service error"}
            )
        
        return await call_next(request)
    
    async def _verify_session(self, user_id: int, session_id: str, request: Request) -> bool:
        """Verify session is valid and active"""
        try:
            # Get session from Redis
            redis_client = redis.from_url(f"redis://{getattr(settings, 'REDIS_HOST', 'localhost')}:6379")
            session_data = await redis_client.get(f"session:{session_id}")
            
            if not session_data:
                return False
            
            session = json.loads(session_data)
            
            # Verify session belongs to user
            if session.get("user_id") != user_id:
                return False
            
            # Verify IP address (optional security check)
            if getattr(settings, 'VERIFY_SESSION_IP', False):
                if session.get("ip_address") != request.client.host:
                    logger.warning(f"Session IP mismatch for user {user_id}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Session verification error: {e}")
            return False
    
    async def _update_session_activity(self, user_id: int, session_id: str):
        """Update session last activity timestamp"""
        try:
            redis_client = redis.from_url(f"redis://{getattr(settings, 'REDIS_HOST', 'localhost')}:6379")
            await redis_client.hset(
                f"session:{session_id}",
                "last_activity",
                datetime.utcnow().isoformat()
            )
        except Exception as e:
            logger.error(f"Failed to update session activity: {e}")

class RateLimitingMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware with multiple strategies"""
    
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        self._initialize_redis()
        
        # Rate limit configurations
        self.rate_limits = {
            "/api/v1/auth/login": {"requests": 5, "window": 900},  # 5 requests per 15 minutes
            "/api/v1/auth/register": {"requests": 3, "window": 3600},  # 3 requests per hour
            "/api/v1/ai/": {"requests": 50, "window": 60},  # 50 requests per minute for AI endpoints
            "default": {"requests": 100, "window": 60}  # 100 requests per minute default
        }
    
    def _initialize_redis(self):
        """Initialize Redis connection for rate limiting"""
        try:
            self.redis_client = redis.from_url(
                f"redis://{getattr(settings, 'REDIS_HOST', 'localhost')}:6379"
            )
        except Exception as e:
            logger.warning(f"Redis not available for rate limiting: {e}")
    
    async def dispatch(self, request: Request, call_next):
        if not self.redis_client:
            return await call_next(request)
        
        # Determine rate limit for this endpoint
        rate_limit = self._get_rate_limit(request.url.path)
        
        # Create rate limit key
        identifier = self._get_client_identifier(request)
        rate_limit_key = f"rate_limit:{identifier}:{request.url.path}"
        
        try:
            # Check current request count
            current_requests = await self.redis_client.get(rate_limit_key)
            current_requests = int(current_requests) if current_requests else 0
            
            if current_requests >= rate_limit["requests"]:
                # Rate limit exceeded
                ttl = await self.redis_client.ttl(rate_limit_key)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Try again in {ttl} seconds.",
                        "retry_after": ttl
                    },
                    headers={"Retry-After": str(ttl)}
                )
            
            # Increment request count
            pipe = self.redis_client.pipeline()
            pipe.incr(rate_limit_key)
            pipe.expire(rate_limit_key, rate_limit["window"])
            await pipe.execute()
            
            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(rate_limit["requests"])
            response.headers["X-RateLimit-Remaining"] = str(rate_limit["requests"] - current_requests - 1)
            response.headers["X-RateLimit-Reset"] = str(int(time.time()) + rate_limit["window"])
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            return await call_next(request)
    
    def _get_rate_limit(self, path: str) -> Dict[str, int]:
        """Get rate limit configuration for path"""
        for pattern, limit in self.rate_limits.items():
            if pattern != "default" and path.startswith(pattern):
                return limit
        return self.rate_limits["default"]
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Use user ID if authenticated, otherwise IP address
        if hasattr(request.state, 'user_id'):
            return f"user:{request.state.user_id}"
        return f"ip:{request.client.host}"

class CachingMiddleware(BaseHTTPMiddleware):
    """Intelligent caching middleware for API responses"""
    
    def __init__(self, app):
        super().__init__(app)
        self.redis_client = None
        self._initialize_redis()
        
        # Cacheable endpoints and their TTL
        self.cache_config = {
            "/api/v1/skills": 300,  # 5 minutes
            "/api/v1/jobs": 180,    # 3 minutes
            "/health": 60,          # 1 minute
            "/api/v1/ai/models": 3600,  # 1 hour
        }
    
    def _initialize_redis(self):
        """Initialize Redis connection for caching"""
        try:
            self.redis_client = redis.from_url(
                f"redis://{getattr(settings, 'REDIS_HOST', 'localhost')}:6379"
            )
        except Exception as e:
            logger.warning(f"Redis not available for caching: {e}")
    
    async def dispatch(self, request: Request, call_next):
        # Only cache GET requests
        if request.method != "GET" or not self.redis_client:
            return await call_next(request)
        
        # Check if endpoint is cacheable
        ttl = self._get_cache_ttl(request.url.path)
        if not ttl:
            return await call_next(request)
        
        # Generate cache key
        cache_key = self._generate_cache_key(request)
        
        try:
            # Try to get cached response
            cached_response = await self.redis_client.get(cache_key)
            if cached_response:
                cached_data = json.loads(cached_response)
                return JSONResponse(
                    content=cached_data["content"],
                    status_code=cached_data["status_code"],
                    headers={**cached_data["headers"], "X-Cache": "HIT"}
                )
            
            # Get fresh response
            response = await call_next(request)
            
            # Cache successful responses
            if 200 <= response.status_code < 300:
                # Read response body
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk
                
                # Parse response content
                try:
                    content = json.loads(response_body.decode())
                except:
                    content = response_body.decode()
                
                # Cache the response
                cache_data = {
                    "content": content,
                    "status_code": response.status_code,
                    "headers": dict(response.headers)
                }
                
                await self.redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(cache_data)
                )
                
                # Create new response with cache headers
                return JSONResponse(
                    content=content,
                    status_code=response.status_code,
                    headers={**dict(response.headers), "X-Cache": "MISS"}
                )
            
            return response
            
        except Exception as e:
            logger.error(f"Caching error: {e}")
            return await call_next(request)
    
    def _get_cache_ttl(self, path: str) -> Optional[int]:
        """Get cache TTL for path"""
        for pattern, ttl in self.cache_config.items():
            if path.startswith(pattern):
                return ttl
        return None
    
    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key for request"""
        # Include path, query parameters, and user context
        key_parts = [
            request.url.path,
            str(sorted(request.query_params.items())),
        ]
        
        # Include user ID for personalized content
        if hasattr(request.state, 'user_id'):
            key_parts.append(f"user:{request.state.user_id}")
        
        key_string = "|".join(key_parts)
        return f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Security headers middleware for enhanced protection"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """Comprehensive logging middleware with structured logging"""
    
    async def dispatch(self, request: Request, call_next):
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Parse user agent
        user_agent = parse_user_agent(request.headers.get("User-Agent", ""))
        
        # Start timing
        start_time = time.time()
        
        # Log request
        logger.info(
            "Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_ip": request.client.host,
                "user_agent": {
                    "browser": user_agent.browser.family,
                    "os": user_agent.os.family,
                    "device": user_agent.device.family
                },
                "user_id": getattr(request.state, 'user_id', None)
            }
        )
        
        try:
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "duration": duration,
                    "response_size": response.headers.get("content-length", 0)
                }
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            
            return response
            
        except Exception as e:
            # Log error
            duration = time.time() - start_time
            logger.error(
                "Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                    "duration": duration
                },
                exc_info=True
            )
            raise

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except HTTPException:
            # Re-raise HTTP exceptions (they're handled by FastAPI)
            raise
        except Exception as e:
            # Log unexpected errors
            request_id = getattr(request.state, 'request_id', 'unknown')
            logger.error(
                f"Unhandled exception in request {request_id}: {e}",
                exc_info=True
            )
            
            # Return generic error response
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "request_id": request_id
                }
            )
