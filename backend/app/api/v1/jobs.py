"""
Job Matching API endpoints for SkillForge AI Backend
Provides sophisticated job matching and recommendation services
"""

from typing import Any, List, Dict, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
import logging
from datetime import datetime

# Import job matching services (with fallback for development)
try:
    from app.services.job_matching_service import (
        job_matching_service, 
        UserProfile, 
        JobPosting, 
        MatchResult,
        MatchingStrategy
    )
    JOB_MATCHING_AVAILABLE = True
except ImportError:
    JOB_MATCHING_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class UserProfileRequest(BaseModel):
    user_id: str
    skills: List[Dict[str, Any]]
    experience_years: int = Field(ge=0, le=50)
    education_level: str
    preferred_locations: List[str] = []
    preferred_salary_min: Optional[int] = Field(None, ge=0)
    preferred_salary_max: Optional[int] = Field(None, ge=0)
    preferred_industries: List[str] = []
    career_level: str = "mid"
    work_preferences: Dict[str, Any] = {}
    bio: str = ""
    resume_text: str = ""


class JobPostingRequest(BaseModel):
    job_id: str
    title: str
    company: str
    description: str
    required_skills: List[str]
    preferred_skills: List[str] = []
    experience_required: str = ""
    education_required: str = ""
    location: str
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    industry: str = ""
    job_type: str = "full-time"
    remote_allowed: bool = False
    posted_date: datetime = Field(default_factory=datetime.utcnow)
    application_deadline: Optional[datetime] = None


class JobMatchRequest(BaseModel):
    user_profile: UserProfileRequest
    job_postings: List[JobPostingRequest]
    strategy: str = "hybrid"
    max_results: int = Field(50, ge=1, le=100)
    min_score_threshold: float = Field(0.3, ge=0.0, le=1.0)


class JobMatchResponse(BaseModel):
    matches: List[Dict[str, Any]]
    total_matches: int
    processing_time: float
    strategy_used: str
    timestamp: str


class JobRecommendationRequest(BaseModel):
    user_profile: UserProfileRequest
    job_postings: List[JobPostingRequest]
    recommendation_type: str = "best_matches"


class MarketTrendsResponse(BaseModel):
    trends: Dict[str, Any]
    analysis_timestamp: str


@router.get("/status")
async def job_matching_status():
    """Get job matching service status"""
    try:
        return {
            "status": "operational" if JOB_MATCHING_AVAILABLE else "limited",
            "job_matching_available": JOB_MATCHING_AVAILABLE,
            "message": "Job matching service ready" if JOB_MATCHING_AVAILABLE else "Job matching in mock mode",
            "features": {
                "semantic_matching": JOB_MATCHING_AVAILABLE,
                "skill_gap_analysis": True,
                "salary_matching": True,
                "location_matching": True,
                "career_recommendations": True,
                "market_analysis": True
            },
            "supported_strategies": [
                "hybrid",
                "skill_based", 
                "semantic",
                "experience_weighted"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Job matching status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job matching status check failed: {str(e)}"
        )


@router.post("/match", response_model=JobMatchResponse)
async def match_jobs(request: JobMatchRequest):
    """Match jobs for a user profile using AI-powered algorithms"""
    try:
        start_time = datetime.utcnow()
        
        if JOB_MATCHING_AVAILABLE:
            # Convert request models to service models
            user_profile = UserProfile(
                user_id=request.user_profile.user_id,
                skills=request.user_profile.skills,
                experience_years=request.user_profile.experience_years,
                education_level=request.user_profile.education_level,
                preferred_locations=request.user_profile.preferred_locations,
                preferred_salary_min=request.user_profile.preferred_salary_min,
                preferred_salary_max=request.user_profile.preferred_salary_max,
                preferred_industries=request.user_profile.preferred_industries,
                career_level=request.user_profile.career_level,
                work_preferences=request.user_profile.work_preferences,
                bio=request.user_profile.bio,
                resume_text=request.user_profile.resume_text
            )
            
            job_postings = [
                JobPosting(
                    job_id=job.job_id,
                    title=job.title,
                    company=job.company,
                    description=job.description,
                    required_skills=job.required_skills,
                    preferred_skills=job.preferred_skills,
                    experience_required=job.experience_required,
                    education_required=job.education_required,
                    location=job.location,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    industry=job.industry,
                    job_type=job.job_type,
                    remote_allowed=job.remote_allowed,
                    posted_date=job.posted_date,
                    application_deadline=job.application_deadline
                )
                for job in request.job_postings
            ]
            
            # Get matching strategy
            try:
                strategy = MatchingStrategy(request.strategy)
            except ValueError:
                strategy = MatchingStrategy.HYBRID
            
            # Perform job matching
            matches = await job_matching_service.match_jobs_for_user(
                user_profile=user_profile,
                job_postings=job_postings,
                strategy=strategy,
                max_results=request.max_results,
                min_score_threshold=request.min_score_threshold
            )
            
            # Convert matches to response format
            match_dicts = []
            for match in matches:
                match_dict = {
                    "job_id": match.job_id,
                    "overall_score": match.overall_score,
                    "skill_match_score": match.skill_match_score,
                    "experience_match_score": match.experience_match_score,
                    "location_match_score": match.location_match_score,
                    "salary_match_score": match.salary_match_score,
                    "semantic_similarity_score": match.semantic_similarity_score,
                    "skill_gaps": match.skill_gaps,
                    "matching_skills": match.matching_skills,
                    "recommendations": match.recommendations,
                    "confidence_level": match.confidence_level,
                    "explanation": match.explanation,
                    "timestamp": match.timestamp.isoformat()
                }
                match_dicts.append(match_dict)
        
        else:
            # Mock response for development
            match_dicts = [
                {
                    "job_id": "job_001",
                    "overall_score": 0.85,
                    "skill_match_score": 0.9,
                    "experience_match_score": 0.8,
                    "location_match_score": 1.0,
                    "salary_match_score": 0.7,
                    "semantic_similarity_score": 0.75,
                    "skill_gaps": ["kubernetes", "terraform"],
                    "matching_skills": ["python", "react", "postgresql"],
                    "recommendations": [
                        "Consider learning Kubernetes for container orchestration",
                        "Terraform skills would strengthen your DevOps profile"
                    ],
                    "confidence_level": "high",
                    "explanation": "Strong skill alignment with job requirements. Experience level well-suited for this role. Location preferences align well.",
                    "timestamp": datetime.utcnow().isoformat()
                },
                {
                    "job_id": "job_002", 
                    "overall_score": 0.72,
                    "skill_match_score": 0.8,
                    "experience_match_score": 0.6,
                    "location_match_score": 0.8,
                    "salary_match_score": 0.9,
                    "semantic_similarity_score": 0.65,
                    "skill_gaps": ["machine learning", "tensorflow"],
                    "matching_skills": ["python", "sql", "data analysis"],
                    "recommendations": [
                        "Consider learning Machine Learning fundamentals",
                        "TensorFlow certification would be valuable"
                    ],
                    "confidence_level": "medium",
                    "explanation": "Good skill match with some gaps. Experience level adequate with room for growth. Location is workable but not ideal.",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        return JobMatchResponse(
            matches=match_dicts,
            total_matches=len(match_dicts),
            processing_time=processing_time,
            strategy_used=request.strategy,
            timestamp=end_time.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job matching failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job matching failed: {str(e)}"
        )


@router.post("/recommendations")
async def get_job_recommendations(request: JobRecommendationRequest):
    """Get personalized job recommendations based on different criteria"""
    try:
        start_time = datetime.utcnow()
        
        if JOB_MATCHING_AVAILABLE:
            # Convert request models to service models (same as above)
            user_profile = UserProfile(
                user_id=request.user_profile.user_id,
                skills=request.user_profile.skills,
                experience_years=request.user_profile.experience_years,
                education_level=request.user_profile.education_level,
                preferred_locations=request.user_profile.preferred_locations,
                preferred_salary_min=request.user_profile.preferred_salary_min,
                preferred_salary_max=request.user_profile.preferred_salary_max,
                preferred_industries=request.user_profile.preferred_industries,
                career_level=request.user_profile.career_level,
                work_preferences=request.user_profile.work_preferences,
                bio=request.user_profile.bio,
                resume_text=request.user_profile.resume_text
            )
            
            job_postings = [
                JobPosting(
                    job_id=job.job_id,
                    title=job.title,
                    company=job.company,
                    description=job.description,
                    required_skills=job.required_skills,
                    preferred_skills=job.preferred_skills,
                    experience_required=job.experience_required,
                    education_required=job.education_required,
                    location=job.location,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    industry=job.industry,
                    job_type=job.job_type,
                    remote_allowed=job.remote_allowed,
                    posted_date=job.posted_date,
                    application_deadline=job.application_deadline
                )
                for job in request.job_postings
            ]
            
            # Get recommendations
            recommendations = await job_matching_service.get_job_recommendations(
                user_profile=user_profile,
                job_postings=job_postings,
                recommendation_type=request.recommendation_type
            )
            
            # Convert to response format
            recommendation_dicts = []
            for rec in recommendations:
                rec_dict = {
                    "job_id": rec.job_id,
                    "overall_score": rec.overall_score,
                    "recommendation_reason": rec.explanation,
                    "skill_gaps": rec.skill_gaps,
                    "matching_skills": rec.matching_skills,
                    "recommendations": rec.recommendations,
                    "confidence_level": rec.confidence_level
                }
                recommendation_dicts.append(rec_dict)
        
        else:
            # Mock recommendations
            recommendation_dicts = [
                {
                    "job_id": "job_003",
                    "overall_score": 0.88,
                    "recommendation_reason": "Perfect for skill growth in cloud technologies",
                    "skill_gaps": ["aws", "docker"],
                    "matching_skills": ["python", "javascript"],
                    "recommendations": ["Learn AWS fundamentals", "Get Docker certified"],
                    "confidence_level": "high"
                }
            ]
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds()
        
        return {
            "recommendations": recommendation_dicts,
            "total_recommendations": len(recommendation_dicts),
            "recommendation_type": request.recommendation_type,
            "processing_time": processing_time,
            "timestamp": end_time.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Job recommendations failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Job recommendations failed: {str(e)}"
        )


@router.post("/market-trends", response_model=MarketTrendsResponse)
async def analyze_market_trends(job_postings: List[JobPostingRequest]):
    """Analyze job market trends from provided job postings"""
    try:
        if JOB_MATCHING_AVAILABLE:
            # Convert to service models
            postings = [
                JobPosting(
                    job_id=job.job_id,
                    title=job.title,
                    company=job.company,
                    description=job.description,
                    required_skills=job.required_skills,
                    preferred_skills=job.preferred_skills,
                    experience_required=job.experience_required,
                    education_required=job.education_required,
                    location=job.location,
                    salary_min=job.salary_min,
                    salary_max=job.salary_max,
                    industry=job.industry,
                    job_type=job.job_type,
                    remote_allowed=job.remote_allowed,
                    posted_date=job.posted_date,
                    application_deadline=job.application_deadline
                )
                for job in job_postings
            ]
            
            # Analyze trends
            trends = await job_matching_service.analyze_market_trends(postings)
        
        else:
            # Mock trends analysis
            trends = {
                "total_jobs_analyzed": len(job_postings),
                "top_skills_in_demand": [
                    ("python", 45),
                    ("javascript", 38),
                    ("react", 32),
                    ("aws", 28),
                    ("sql", 25)
                ],
                "average_salary": 95000,
                "top_locations": [
                    ("san francisco", 15),
                    ("new york", 12),
                    ("remote", 20),
                    ("seattle", 8)
                ],
                "remote_work_percentage": 65.5,
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
        
        return MarketTrendsResponse(
            trends=trends,
            analysis_timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Market trends analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Market trends analysis failed: {str(e)}"
        )
