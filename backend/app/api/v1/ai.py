"""
AI Services API endpoints for SkillForge AI Backend
Provides HuggingFace model integration and AI-powered features
"""

from typing import Any, List, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import logging
from datetime import datetime

# Import AI services (with fallback for development)
try:
    from app.services.ai_service import ai_service, resume_parser
except ImportError:
    # Fallback for development when AI dependencies aren't available
    ai_service = None
    resume_parser = None

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class SkillExtractionRequest(BaseModel):
    text: str
    max_skills: int = 50


class SkillExtractionResponse(BaseModel):
    skills: List[Dict[str, Any]]
    total_found: int
    processing_time: float
    timestamp: str


class SimilarityRequest(BaseModel):
    text1: str
    text2: str


class SimilarityResponse(BaseModel):
    similarity_score: float
    timestamp: str


class SummarizationRequest(BaseModel):
    text: str
    max_length: int = 150


class SummarizationResponse(BaseModel):
    summary: str
    original_length: int
    summary_length: int
    timestamp: str


class SentimentRequest(BaseModel):
    text: str


class SentimentResponse(BaseModel):
    sentiment: Dict[str, Any]
    timestamp: str


class ResumeParsingResponse(BaseModel):
    parsed_data: Dict[str, Any]
    processing_time: float
    timestamp: str


@router.get("/status")
async def ai_services_status():
    """Get AI services status and health check"""
    try:
        if ai_service:
            health_status = await ai_service.health_check()
            return {
                "status": "operational",
                "ai_service_available": True,
                "resume_parser_available": resume_parser is not None,
                "health_check": health_status,
                "services": {
                    "skill_extraction": "available",
                    "resume_parsing": "available",
                    "text_similarity": "available",
                    "text_summarization": "available",
                    "sentiment_analysis": "available"
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            return {
                "status": "limited",
                "ai_service_available": False,
                "message": "AI services running in mock mode for development",
                "services": {
                    "skill_extraction": "mock",
                    "resume_parsing": "mock",
                    "text_similarity": "mock",
                    "text_summarization": "mock",
                    "sentiment_analysis": "mock"
                },
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"AI services status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI services status check failed: {str(e)}"
        )


@router.post("/extract-skills", response_model=SkillExtractionResponse)
async def extract_skills(request: SkillExtractionRequest):
    """Extract skills from text using AI models"""
    try:
        start_time = datetime.utcnow()
        
        if ai_service:
            # Use real AI service
            skills = await ai_service.extract_skills_from_text(request.text)
            
            # Limit results if requested
            if request.max_skills > 0:
                skills = skills[:request.max_skills]
        else:
            # Mock response for development
            skills = [
                {
                    "skill": "Python",
                    "category": "programming_languages",
                    "confidence": 0.95,
                    "source": "mock_extraction",
                    "context": "Python programming experience"
                },
                {
                    "skill": "JavaScript",
                    "category": "programming_languages", 
                    "confidence": 0.88,
                    "source": "mock_extraction",
                    "context": "JavaScript development"
                },
                {
                    "skill": "Machine Learning",
                    "category": "technical",
                    "confidence": 0.82,
                    "source": "mock_extraction",
                    "context": "ML model development"
                }
            ]
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        return SkillExtractionResponse(
            skills=skills,
            total_found=len(skills),
            processing_time=processing_time,
            timestamp=end_time.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Skill extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill extraction failed: {str(e)}"
        )


class ResumeParsingRequest(BaseModel):
    resume_text: str


@router.post("/parse-resume", response_model=ResumeParsingResponse)
async def parse_resume(request: ResumeParsingRequest):
    """Parse resume and extract structured information"""
    try:
        start_time = datetime.utcnow()

        if not request.resume_text or len(request.resume_text.strip()) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resume text is too short or empty"
            )

        if resume_parser:
            # Use real resume parser
            parsed_data = await resume_parser.parse_resume_text(request.resume_text)
        else:
            # Mock response for development
            parsed_data = {
                "contact_info": {
                    "email": "john.doe@example.com",
                    "phone": "+1-555-123-4567",
                    "linkedin": "linkedin.com/in/johndoe"
                },
                "summary": "Experienced software developer with 5+ years in full-stack development...",
                "skills": [
                    {"skill": "Python", "category": "programming_languages", "confidence": 0.95},
                    {"skill": "React", "category": "frameworks", "confidence": 0.88},
                    {"skill": "PostgreSQL", "category": "databases", "confidence": 0.82}
                ],
                "experience": [
                    {
                        "company": "Tech Corp",
                        "position": "Senior Software Engineer",
                        "dates": "2020-2023",
                        "description": "Led development of web applications..."
                    }
                ],
                "education": [
                    {
                        "institution": "University of Technology",
                        "degree": "Bachelor of Science in Computer Science",
                        "dates": "2016-2020"
                    }
                ],
                "parsing_metadata": {
                    "parsed_at": datetime.utcnow().isoformat(),
                    "text_length": len(request.resume_text),
                    "skills_found": 3,
                    "experience_entries": 1,
                    "education_entries": 1
                }
            }
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        return ResumeParsingResponse(
            parsed_data=parsed_data,
            processing_time=processing_time,
            timestamp=end_time.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resume parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume parsing failed: {str(e)}"
        )


@router.post("/similarity", response_model=SimilarityResponse)
async def calculate_similarity(request: SimilarityRequest):
    """Calculate semantic similarity between two texts"""
    try:
        if ai_service:
            similarity_score = await ai_service.calculate_similarity(
                request.text1, 
                request.text2
            )
        else:
            # Mock similarity calculation
            # Simple word overlap for development
            words1 = set(request.text1.lower().split())
            words2 = set(request.text2.lower().split())
            overlap = len(words1.intersection(words2))
            total = len(words1.union(words2))
            similarity_score = overlap / total if total > 0 else 0.0
        
        return SimilarityResponse(
            similarity_score=similarity_score,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Similarity calculation failed: {str(e)}"
        )


@router.post("/summarize", response_model=SummarizationResponse)
async def summarize_text(request: SummarizationRequest):
    """Summarize text using AI models"""
    try:
        if ai_service:
            summary = await ai_service.summarize_text(
                request.text, 
                max_length=request.max_length
            )
        else:
            # Mock summarization - simple truncation
            summary = request.text[:request.max_length] + "..." if len(request.text) > request.max_length else request.text
        
        return SummarizationResponse(
            summary=summary,
            original_length=len(request.text),
            summary_length=len(summary),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Text summarization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text summarization failed: {str(e)}"
        )


@router.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of text"""
    try:
        if ai_service:
            sentiment = await ai_service.analyze_sentiment(request.text)
        else:
            # Mock sentiment analysis
            sentiment = {
                "label": "POSITIVE",
                "score": 0.75,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        return SentimentResponse(
            sentiment=sentiment,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sentiment analysis failed: {str(e)}"
        )


# Portfolio Analysis Endpoints
class PortfolioAnalysisRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")
    project_metadata: Optional[Dict[str, Any]] = Field(None, description="Project metadata")


class PortfolioAnalysisResponse(BaseModel):
    project_id: str
    project_type: str
    confidence: float
    visual_elements: List[Dict[str, Any]]
    extracted_skills: List[Dict[str, Any]]
    technology_stack: List[str]
    complexity_score: float
    design_quality_score: float
    functionality_score: float
    recommendations: List[str]
    analysis_metadata: Dict[str, Any]
    timestamp: str


@router.post("/analyze-portfolio", response_model=PortfolioAnalysisResponse)
async def analyze_portfolio(request: PortfolioAnalysisRequest):
    """Analyze a project portfolio screenshot using computer vision"""
    try:
        # Import portfolio analysis service
        try:
            from app.services.portfolio_analysis_service import portfolio_analysis_service
            PORTFOLIO_ANALYSIS_AVAILABLE = True
        except ImportError:
            PORTFOLIO_ANALYSIS_AVAILABLE = False

        if PORTFOLIO_ANALYSIS_AVAILABLE:
            # Decode base64 image
            import base64
            image_data = base64.b64decode(request.image_data)

            # Analyze portfolio
            analysis = await portfolio_analysis_service.analyze_project_screenshot(
                image_data=image_data,
                project_metadata=request.project_metadata or {}
            )

            # Convert visual elements to dict format
            visual_elements = []
            for element in analysis.visual_elements:
                visual_elements.append({
                    "element_type": element.element_type,
                    "confidence": element.confidence,
                    "description": element.description,
                    "skills_implied": element.skills_implied,
                    "coordinates": element.coordinates
                })

            return PortfolioAnalysisResponse(
                project_id=analysis.project_id,
                project_type=analysis.project_type.value,
                confidence=analysis.confidence,
                visual_elements=visual_elements,
                extracted_skills=analysis.extracted_skills,
                technology_stack=analysis.technology_stack,
                complexity_score=analysis.complexity_score,
                design_quality_score=analysis.design_quality_score,
                functionality_score=analysis.functionality_score,
                recommendations=analysis.recommendations,
                analysis_metadata=analysis.analysis_metadata,
                timestamp=analysis.timestamp.isoformat()
            )

        else:
            # Mock response for development
            return PortfolioAnalysisResponse(
                project_id="mock_project_001",
                project_type="web_application",
                confidence=0.85,
                visual_elements=[
                    {
                        "element_type": "web_interface",
                        "confidence": 0.9,
                        "description": "modern web application interface",
                        "skills_implied": ["HTML", "CSS", "JavaScript", "React"],
                        "coordinates": None
                    },
                    {
                        "element_type": "data_visualization",
                        "confidence": 0.75,
                        "description": "interactive charts and graphs",
                        "skills_implied": ["Data Visualization", "D3.js", "Charts"],
                        "coordinates": None
                    }
                ],
                extracted_skills=[
                    {"skill": "React", "confidence": 0.9, "source": "visual_analysis", "category": "frontend"},
                    {"skill": "JavaScript", "confidence": 0.85, "source": "visual_analysis", "category": "programming_languages"},
                    {"skill": "Data Visualization", "confidence": 0.8, "source": "visual_analysis", "category": "data_science"},
                    {"skill": "UI/UX Design", "confidence": 0.75, "source": "design_analysis", "category": "design"}
                ],
                technology_stack=["React", "JavaScript", "D3.js", "CSS", "HTML"],
                complexity_score=0.78,
                design_quality_score=0.82,
                functionality_score=0.85,
                recommendations=[
                    "Add responsive design for mobile compatibility",
                    "Implement user authentication and authorization",
                    "Add comprehensive error handling",
                    "Include automated testing suite",
                    "Optimize performance and loading times"
                ],
                analysis_metadata={
                    "analysis_method": "mock_analysis",
                    "model_version": "development_fallback",
                    "processing_time": 1.2
                },
                timestamp=datetime.utcnow().isoformat()
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Portfolio analysis failed: {str(e)}"
        )
