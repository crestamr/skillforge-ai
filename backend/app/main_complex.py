"""
SkillForge AI Backend - Main FastAPI Application
Comprehensive backend API for intelligent career development platform
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import uuid
import uvicorn
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="SkillForge AI Backend",
    description="Intelligent career development platform backend API with AI-powered features",
    version="1.0.0",
    debug=True,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"]
)

# Request ID and timing middleware
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    """Add request ID and timing to all requests"""
    # Generate request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Time the request
    start_time = time.time()

    try:
        response = await call_next(request)

        # Add headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{(time.time() - start_time):.3f}s"

        return response

    except Exception as e:
        logger.error(f"Request {request_id} failed: {e}")
        raise


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "request_id": getattr(request.state, "request_id", None)
            }
        }
    )


# Root endpoints
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "SkillForge AI Backend API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs" if settings.DEBUG else "Contact admin for API documentation"
    }


@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "skillforge-backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including database status"""
    try:
        db_health = await check_database_health()

        # Determine overall health
        all_healthy = all(
            db["status"] == "healthy"
            for db in db_health.values()
        )

        return {
            "status": "healthy" if all_healthy else "degraded",
            "service": "skillforge-backend",
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "databases": db_health,
            "timestamp": time.time()
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": "skillforge-backend",
                "error": str(e),
                "timestamp": time.time()
            }
        )


@app.get(f"{settings.API_V1_STR}/status")
async def api_status():
    """API status endpoint"""
    return {
        "status": "operational",
        "version": settings.VERSION,
        "api_version": "v1",
        "service": "skillforge-backend-api",
        "features": {
            "authentication": True,
            "user_management": True,
            "skill_assessment": True,
            "job_matching": True,
            "ai_services": True,
            "rate_limiting": settings.ENABLE_RATE_LIMITING,
            "caching": settings.ENABLE_CACHING
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
