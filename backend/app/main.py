"""
SkillForge AI - Main FastAPI Application
Comprehensive FastAPI application with modular architecture, middleware, and enterprise features
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any
import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
import redis.asyncio as redis
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration

from app.core.config import settings
from app.core.database import engine, get_db
from app.core.logging import setup_logging
from app.core.exceptions import (
    ValidationException, AuthenticationException, AuthorizationException,
    ResourceNotFoundException, RateLimitException, ServiceUnavailableException
)

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Initialize Sentry for error tracking
if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(auto_enabling=True),
            SqlAlchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment=getattr(settings, 'ENVIRONMENT', 'development'),
    )

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ERROR_COUNT = Counter('http_errors_total', 'Total HTTP errors', ['error_type'])

# Redis connection for caching and sessions
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting SkillForge AI application...")

    # Initialize Redis connection
    global redis_client
    try:
        redis_client = redis.from_url(
            f"redis://{getattr(settings, 'REDIS_HOST', 'localhost')}:{getattr(settings, 'REDIS_PORT', 6379)}",
            password=getattr(settings, 'REDIS_PASSWORD', None),
            decode_responses=True
        )
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
        redis_client = None

    # Test database connection
    try:
        from app.core.database import get_db
        db = next(get_db())
        db.execute("SELECT 1")
        logger.info("Database connection established")
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")

    logger.info("SkillForge AI application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down SkillForge AI application...")

    # Close Redis connection
    if redis_client:
        await redis_client.close()

    logger.info("SkillForge AI application shutdown complete")

# Create FastAPI application
app = FastAPI(
    title="SkillForge AI API",
    description="Intelligent career development platform with AI-powered features",
    version="1.0.0",
    docs_url=None,  # Disable default docs for custom implementation
    redoc_url=None,
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan
)

# Custom middleware for metrics collection
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        response = await call_next(request)

        # Record metrics
        duration = time.time() - start_time
        REQUEST_DURATION.observe(duration)
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()

        if response.status_code >= 400:
            ERROR_COUNT.labels(error_type=f"http_{response.status_code}").inc()

        return response

# Add middleware (order matters!)
app.add_middleware(MetricsMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, 'ALLOWED_ORIGINS', ["http://localhost:3000", "*"]),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted host middleware
if getattr(settings, 'ENVIRONMENT', 'development') == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=getattr(settings, 'ALLOWED_HOSTS', ["*"])
    )

# Session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=getattr(settings, 'SECRET_KEY', 'dev-secret-key'),
    max_age=getattr(settings, 'SESSION_EXPIRE_SECONDS', 3600),
    same_site="lax",
    https_only=getattr(settings, 'ENVIRONMENT', 'development') == "production"
)

# Exception handlers
@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation Error",
            "message": str(exc),
            "details": exc.details if hasattr(exc, 'details') else None
        }
    )

@app.exception_handler(AuthenticationException)
async def authentication_exception_handler(request: Request, exc: AuthenticationException):
    return JSONResponse(
        status_code=401,
        content={
            "error": "Authentication Error",
            "message": str(exc)
        }
    )

@app.exception_handler(AuthorizationException)
async def authorization_exception_handler(request: Request, exc: AuthorizationException):
    return JSONResponse(
        status_code=403,
        content={
            "error": "Authorization Error",
            "message": str(exc)
        }
    )

@app.exception_handler(ResourceNotFoundException)
async def not_found_exception_handler(request: Request, exc: ResourceNotFoundException):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Resource Not Found",
            "message": str(exc)
        }
    )

@app.exception_handler(RateLimitException)
async def rate_limit_exception_handler(request: Request, exc: RateLimitException):
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate Limit Exceeded",
            "message": str(exc),
            "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else 60
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred"
        }
    )

# Health check endpoints
@app.get("/health", tags=["Health"])
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/health/detailed", tags=["Health"])
async def detailed_health_check():
    """Detailed health check with dependency verification"""
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }

    # Check database
    try:
        from app.core.database import get_db
        db = next(get_db())
        db.execute("SELECT 1")
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Check Redis
    try:
        if redis_client:
            await redis_client.ping()
            health_status["services"]["redis"] = "healthy"
        else:
            health_status["services"]["redis"] = "not_configured"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    return health_status

@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "name": "SkillForge AI API",
        "version": "1.0.0",
        "description": "Intelligent career development platform",
        "docs_url": "/docs",
        "health_url": "/health",
        "metrics_url": "/metrics"
    }

@app.get("/api/v1/status")
async def api_status():
    """API status endpoint"""
    return {
        "status": "operational",
        "version": "1.0.0",
        "api_version": "v1",
        "service": "skillforge-backend-api",
        "features": {
            "authentication": "ready",
            "user_management": "ready",
            "skill_assessment": "ready",
            "job_matching": "ready",
            "ai_services": "ready",
            "rate_limiting": "enabled",
            "caching": "enabled"
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Custom OpenAPI documentation
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """Custom Swagger UI with authentication"""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Interactive API Documentation",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    )

def custom_openapi():
    """Custom OpenAPI schema generation"""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="SkillForge AI API",
        version="1.0.0",
        description="Comprehensive API for intelligent career development platform",
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Add global security requirement
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Include API routers (with error handling for missing modules)
routers_to_include = [
    ("app.api.v1.auth", "auth_router", "/api/v1/auth", ["Authentication"]),
    ("app.api.v1.users", "users_router", "/api/v1/users", ["Users"]),
    ("app.api.v1.skills", "skills_router", "/api/v1/skills", ["Skills"]),
    ("app.api.v1.assessments", "assessments_router", "/api/v1/assessments", ["Assessments"]),
    ("app.api.v1.learning", "learning_router", "/api/v1/learning", ["Learning"]),
    ("app.api.v1.jobs", "jobs_router", "/api/v1/jobs", ["Jobs"]),
    ("app.api.v1.ai", "ai_router", "/api/v1/ai", ["AI Services"]),
    ("app.api.v1.admin", "admin_router", "/api/v1/admin", ["Administration"]),
]

for module_path, router_name, prefix, tags in routers_to_include:
    try:
        module = __import__(module_path, fromlist=[router_name])
        router = getattr(module, router_name, getattr(module, 'router', None))
        if router:
            app.include_router(router, prefix=prefix, tags=tags)
            logger.info(f"Router {router_name} loaded successfully")
    except ImportError as e:
        logger.warning(f"Router {router_name} not available: {e}")

# Include enterprise router if available
try:
    from app.enterprise.integration_api import enterprise_api
    app.include_router(enterprise_api.router, prefix="/api/v1", tags=["Enterprise"])
    logger.info("Enterprise integration router loaded successfully")
except ImportError as e:
    logger.warning(f"Enterprise router not available: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=getattr(settings, 'DEBUG', True),
        log_level="info" if not getattr(settings, 'DEBUG', True) else "debug",
        access_log=True
    )
