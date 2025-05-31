"""
SkillForge AI - Security Middleware
Implements comprehensive security controls including CSRF, rate limiting, and input validation
"""

import time
import json
import re
import html
import urllib.parse
from typing import Dict, Any, Optional, List, Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import redis
import logging
from datetime import datetime, timedelta
import secrets
import hashlib
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis client for rate limiting and session management
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add comprehensive security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        security_headers = {
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Enable XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy
            "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.skillforge.ai; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://fonts.gstatic.com; "
                "connect-src 'self' https://api.skillforge.ai; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            ),
            
            # Remove server information
            "Server": "SkillForge-AI",
            
            # Cache control for sensitive pages
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
            "Expires": "0"
        }
        
        # Add headers to response
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Remove potentially sensitive headers
        response.headers.pop("X-Powered-By", None)
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting with different limits for different endpoints"""
    
    RATE_LIMITS = {
        # Authentication endpoints
        "/api/v1/auth/login": {"requests": 10, "window": 900},  # 10 requests per 15 minutes
        "/api/v1/auth/register": {"requests": 3, "window": 3600},  # 3 requests per hour
        "/api/v1/auth/password-reset": {"requests": 5, "window": 3600},  # 5 requests per hour
        "/api/v1/auth/verify-email": {"requests": 10, "window": 3600},  # 10 requests per hour
        
        # AI endpoints
        "/api/v1/ai/": {"requests": 50, "window": 60},  # 50 requests per minute
        "/api/v1/skills/extract": {"requests": 30, "window": 60},  # 30 requests per minute
        "/api/v1/jobs/match": {"requests": 20, "window": 60},  # 20 requests per minute
        
        # General API
        "default": {"requests": 100, "window": 60}  # 100 requests per minute
    }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/metrics"] or request.url.path.startswith("/static"):
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_identifier(request)
        
        # Get rate limit for endpoint
        rate_limit = self._get_rate_limit(request.url.path)
        
        # Check rate limit
        if self._is_rate_limited(client_id, request.url.path, rate_limit):
            logger.warning(f"Rate limit exceeded for {client_id} on {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {rate_limit['requests']} per {rate_limit['window']} seconds",
                    "retry_after": rate_limit["window"]
                },
                headers={"Retry-After": str(rate_limit["window"])}
            )
        
        # Record request
        self._record_request(client_id, request.url.path, rate_limit)
        
        return await call_next(request)
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier for rate limiting"""
        # Try to get user ID from token if authenticated
        auth_header = request.headers.get("Authorization")
        if auth_header:
            # Extract user ID from JWT token (simplified)
            try:
                # In real implementation, decode JWT and extract user_id
                user_id = "user_123"  # Placeholder
                return f"user:{user_id}"
            except:
                pass
        
        # Fall back to IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host
        
        return f"ip:{client_ip}"
    
    def _get_rate_limit(self, path: str) -> Dict[str, int]:
        """Get rate limit configuration for path"""
        # Check for exact match
        if path in self.RATE_LIMITS:
            return self.RATE_LIMITS[path]
        
        # Check for prefix match
        for pattern, limit in self.RATE_LIMITS.items():
            if pattern != "default" and path.startswith(pattern):
                return limit
        
        # Return default
        return self.RATE_LIMITS["default"]
    
    def _is_rate_limited(self, client_id: str, path: str, rate_limit: Dict[str, int]) -> bool:
        """Check if client is rate limited"""
        key = f"rate_limit:{client_id}:{path}"
        current_time = int(time.time())
        window_start = current_time - rate_limit["window"]
        
        # Remove old entries
        redis_client.zremrangebyscore(key, 0, window_start)
        
        # Count current requests
        current_requests = redis_client.zcard(key)
        
        return current_requests >= rate_limit["requests"]
    
    def _record_request(self, client_id: str, path: str, rate_limit: Dict[str, int]):
        """Record a request for rate limiting"""
        key = f"rate_limit:{client_id}:{path}"
        current_time = int(time.time())
        
        # Add current request
        redis_client.zadd(key, {str(current_time): current_time})
        
        # Set expiration
        redis_client.expire(key, rate_limit["window"])

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """CSRF protection for state-changing operations"""
    
    CSRF_EXEMPT_PATHS = [
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/health",
        "/metrics"
    ]
    
    STATE_CHANGING_METHODS = ["POST", "PUT", "DELETE", "PATCH"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip CSRF protection for exempt paths and safe methods
        if (request.url.path in self.CSRF_EXEMPT_PATHS or 
            request.method not in self.STATE_CHANGING_METHODS):
            return await call_next(request)
        
        # Check CSRF token
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "CSRF token missing", "message": "X-CSRF-Token header required"}
            )
        
        # Validate CSRF token
        if not self._validate_csrf_token(csrf_token, request):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "Invalid CSRF token", "message": "CSRF token validation failed"}
            )
        
        return await call_next(request)
    
    def _validate_csrf_token(self, token: str, request: Request) -> bool:
        """Validate CSRF token"""
        # Get session ID from request (simplified)
        session_id = request.headers.get("X-Session-ID")
        if not session_id:
            return False
        
        # Check token in Redis
        stored_token = redis_client.get(f"csrf_token:{session_id}")
        return stored_token == token
    
    @staticmethod
    def generate_csrf_token(session_id: str) -> str:
        """Generate CSRF token for session"""
        token = secrets.token_urlsafe(32)
        redis_client.setex(f"csrf_token:{session_id}", 3600, token)  # 1 hour expiry
        return token

class InputValidationMiddleware(BaseHTTPMiddleware):
    """Comprehensive input validation and sanitization"""
    
    # Dangerous patterns to detect
    DANGEROUS_PATTERNS = [
        # SQL Injection patterns
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(OR|AND)\s+\d+\s*=\s*\d+)",
        
        # XSS patterns
        r"(<script[^>]*>.*?</script>)",
        r"(javascript:)",
        r"(on\w+\s*=)",
        r"(<iframe[^>]*>)",
        
        # Command injection patterns
        r"(;|\||&|`|\$\(|\${)",
        r"(\b(rm|cat|ls|ps|kill|chmod|chown)\b)",
        
        # Path traversal patterns
        r"(\.\./|\.\.\\)",
        r"(/etc/passwd|/etc/shadow)",
        
        # LDAP injection patterns
        r"(\*|\(|\)|\\|\||&)",
    ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip validation for GET requests and health checks
        if request.method == "GET" or request.url.path in ["/health", "/metrics"]:
            return await call_next(request)
        
        # Validate request body
        if hasattr(request, "_body"):
            body = await request.body()
            if body:
                try:
                    # Parse JSON body
                    json_body = json.loads(body.decode('utf-8'))
                    
                    # Validate and sanitize
                    validation_result = self._validate_input(json_body)
                    if not validation_result["valid"]:
                        logger.warning(f"Input validation failed: {validation_result['errors']}")
                        return JSONResponse(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            content={
                                "error": "Input validation failed",
                                "message": "Request contains potentially dangerous content",
                                "details": validation_result["errors"]
                            }
                        )
                except json.JSONDecodeError:
                    pass  # Not JSON, skip validation
        
        # Validate query parameters
        for param, value in request.query_params.items():
            if self._contains_dangerous_patterns(str(value)):
                logger.warning(f"Dangerous pattern in query param {param}: {value}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={
                        "error": "Invalid query parameter",
                        "message": f"Query parameter '{param}' contains potentially dangerous content"
                    }
                )
        
        return await call_next(request)
    
    def _validate_input(self, data: Any, path: str = "") -> Dict[str, Any]:
        """Recursively validate input data"""
        errors = []
        
        if isinstance(data, dict):
            for key, value in data.items():
                current_path = f"{path}.{key}" if path else key
                result = self._validate_input(value, current_path)
                errors.extend(result["errors"])
        
        elif isinstance(data, list):
            for i, item in enumerate(data):
                current_path = f"{path}[{i}]"
                result = self._validate_input(item, current_path)
                errors.extend(result["errors"])
        
        elif isinstance(data, str):
            if self._contains_dangerous_patterns(data):
                errors.append(f"Dangerous pattern detected in field: {path}")
            
            # Additional string validations
            if len(data) > 10000:  # Prevent extremely long strings
                errors.append(f"Field too long: {path}")
        
        return {"valid": len(errors) == 0, "errors": errors}
    
    def _contains_dangerous_patterns(self, text: str) -> bool:
        """Check if text contains dangerous patterns"""
        text_lower = text.lower()
        
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False

class SecurityLoggingMiddleware(BaseHTTPMiddleware):
    """Log security-relevant events"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Log request details
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")
        
        # Process request
        response = await call_next(request)
        
        # Calculate response time
        process_time = time.time() - start_time
        
        # Log security events
        self._log_security_event(request, response, client_ip, user_agent, process_time)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get real client IP address"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host
    
    def _log_security_event(self, request: Request, response: Response, 
                          client_ip: str, user_agent: str, process_time: float):
        """Log security-relevant events"""
        
        # Determine if this is a security event
        is_security_event = (
            response.status_code in [401, 403, 429] or  # Auth/rate limit failures
            request.url.path.startswith("/api/v1/auth/") or  # Auth endpoints
            request.method in ["POST", "PUT", "DELETE"] or  # State-changing operations
            "admin" in request.url.path  # Admin operations
        )
        
        if is_security_event:
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": "security_event",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "process_time": process_time,
                "query_params": dict(request.query_params),
                "headers": {
                    "authorization": "***" if request.headers.get("Authorization") else None,
                    "content_type": request.headers.get("Content-Type"),
                    "referer": request.headers.get("Referer")
                }
            }
            
            # Log to security log
            logger.info(f"Security Event: {json.dumps(log_data)}")
            
            # Store in Redis for real-time monitoring
            redis_client.lpush("security_events", json.dumps(log_data))
            redis_client.ltrim("security_events", 0, 9999)  # Keep last 10k events

# Utility functions for input sanitization
class InputSanitizer:
    """Utility class for input sanitization"""
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """Sanitize HTML content"""
        return html.escape(text)
    
    @staticmethod
    def sanitize_sql(text: str) -> str:
        """Basic SQL sanitization (use parameterized queries instead)"""
        # Remove dangerous SQL keywords and characters
        dangerous_chars = ["'", '"', ";", "--", "/*", "*/"]
        sanitized = text
        for char in dangerous_chars:
            sanitized = sanitized.replace(char, "")
        return sanitized
    
    @staticmethod
    def sanitize_url(url: str) -> str:
        """Sanitize URL"""
        return urllib.parse.quote(url, safe=":/?#[]@!$&'()*+,;=")
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number (E.164 format)"""
        pattern = r'^\+[1-9]\d{1,14}$'
        return re.match(pattern, phone) is not None
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path traversal attempts
        filename = filename.replace("..", "").replace("/", "").replace("\\", "")
        
        # Remove dangerous characters
        dangerous_chars = ['<', '>', ':', '"', '|', '?', '*']
        for char in dangerous_chars:
            filename = filename.replace(char, "_")
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        return filename
