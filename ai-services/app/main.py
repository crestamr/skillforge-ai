"""
SkillForge AI Services - Main FastAPI Application for AI/ML Models
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime

# Create FastAPI app
app = FastAPI(
    title="SkillForge AI Services",
    description="AI/ML Services for Intelligent Career Development",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://backend:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SkillForge AI Services",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-services",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "models": {
            "status": "loading",
            "available": []
        }
    }

@app.get("/api/v1/models/status")
async def models_status():
    """AI models status endpoint"""
    return {
        "models": {
            "dialogpt": {
                "status": "not_loaded",
                "description": "Conversational AI career coach"
            },
            "sentence_transformer": {
                "status": "not_loaded", 
                "description": "Semantic job matching"
            },
            "roberta_sentiment": {
                "status": "not_loaded",
                "description": "Industry sentiment analysis"
            },
            "dit_resume": {
                "status": "not_loaded",
                "description": "Resume layout analysis"
            },
            "blip_portfolio": {
                "status": "not_loaded",
                "description": "Portfolio screenshot analysis"
            },
            "clip_visual": {
                "status": "not_loaded",
                "description": "Visual-text matching"
            },
            "speecht5_tts": {
                "status": "not_loaded",
                "description": "Audio content generation"
            }
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v1/chat/test")
async def test_chat():
    """Test chat endpoint"""
    return {
        "message": "AI chat service is running",
        "response": "Hello! I'm your AI career coach. How can I help you today?",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v1/resume/test")
async def test_resume_analysis():
    """Test resume analysis endpoint"""
    return {
        "message": "Resume analysis service is running",
        "analysis": {
            "skills_detected": ["Python", "Machine Learning", "FastAPI"],
            "experience_years": 3,
            "recommendations": ["Add more project details", "Include certifications"]
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested AI service was not found",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An AI service error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
