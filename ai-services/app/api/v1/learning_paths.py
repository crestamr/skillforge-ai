"""
Learning Path Generation API Endpoints
Provides personalized learning path recommendations and management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, validator
from datetime import datetime
import logging

from app.services.learning_path_service import (
    learning_path_generator, 
    UserProfile, 
    LearningPath,
    Skill,
    LearningResource
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for API
class SkillLevel(BaseModel):
    skill_id: str
    skill_name: str
    current_level: int = Field(..., ge=0, le=10)
    target_level: int = Field(..., ge=0, le=10)

class UserProfileRequest(BaseModel):
    user_id: str
    current_skills: Dict[str, int] = Field(..., description="skill_id -> proficiency level (1-10)")
    target_role: str
    career_goals: List[str] = []
    learning_pace: str = Field(..., regex="^(slow|medium|fast)$")
    time_commitment_hours_week: int = Field(..., ge=1, le=40)
    preferred_formats: List[str] = []
    budget_monthly: float = Field(..., ge=0)
    completed_resources: List[str] = []

    @validator('current_skills')
    def validate_skill_levels(cls, v):
        for skill_id, level in v.items():
            if not (0 <= level <= 10):
                raise ValueError(f"Skill level for {skill_id} must be between 0 and 10")
        return v

class LearningResourceResponse(BaseModel):
    id: str
    title: str
    provider: str
    url: str
    skill_id: str
    difficulty: int
    duration_hours: int
    rating: float
    cost: float
    format: str
    prerequisites: List[str]

class LearningPathStepResponse(BaseModel):
    skill_id: str
    skill_name: str
    skill_category: str
    resources: List[LearningResourceResponse]
    estimated_weeks: int
    priority_score: float
    prerequisites_met: bool
    milestone_description: str

class LearningPathResponse(BaseModel):
    user_id: str
    path_id: str
    title: str
    description: str
    steps: List[LearningPathStepResponse]
    total_duration_weeks: int
    estimated_salary_increase: float
    confidence_score: float
    created_at: datetime
    last_updated: datetime

class SkillGapAnalysisResponse(BaseModel):
    skill_id: str
    skill_name: str
    current_level: int
    required_level: int
    gap_size: int
    priority_score: float
    market_demand: float
    salary_impact: float
    learning_time_hours: int

class PathProgressUpdate(BaseModel):
    path_id: str
    completed_steps: List[str]
    assessment_results: Dict[str, int] = {}
    time_spent_hours: Dict[str, int] = {}

class PathAdaptationResponse(BaseModel):
    adapted_path: LearningPathResponse
    changes_made: List[str]
    adaptation_reason: str

# Mock data for development (replace with database calls)
MOCK_SKILLS_DATA = [
    {
        "id": "react",
        "name": "React",
        "category": "Frontend",
        "difficulty": 6,
        "market_demand": 0.9,
        "salary_impact": 15.0,
        "prerequisites": ["javascript", "html", "css"],
        "learning_time_hours": 60
    },
    {
        "id": "python",
        "name": "Python",
        "category": "Programming",
        "difficulty": 4,
        "market_demand": 0.95,
        "salary_impact": 20.0,
        "prerequisites": [],
        "learning_time_hours": 80
    },
    {
        "id": "aws",
        "name": "AWS",
        "category": "Cloud",
        "difficulty": 8,
        "market_demand": 0.85,
        "salary_impact": 25.0,
        "prerequisites": ["linux", "networking"],
        "learning_time_hours": 120
    }
]

MOCK_RESOURCES_DATA = [
    {
        "id": "react_course_1",
        "title": "Complete React Developer Course",
        "provider": "udemy",
        "url": "https://udemy.com/react-course",
        "skill_id": "react",
        "difficulty": 6,
        "duration_hours": 40,
        "rating": 4.7,
        "cost": 89.99,
        "format": "video",
        "prerequisites": ["javascript"]
    },
    {
        "id": "python_course_1",
        "title": "Python for Everybody",
        "provider": "coursera",
        "url": "https://coursera.org/python-course",
        "skill_id": "python",
        "difficulty": 4,
        "duration_hours": 60,
        "rating": 4.8,
        "cost": 49.99,
        "format": "video",
        "prerequisites": []
    }
]

MOCK_JOB_REQUIREMENTS = {
    "Software Engineer": ["python", "react", "javascript", "sql", "git"],
    "Data Scientist": ["python", "sql", "machine_learning", "statistics"],
    "DevOps Engineer": ["aws", "docker", "kubernetes", "linux", "python"],
    "Frontend Developer": ["react", "javascript", "html", "css", "typescript"]
}

# Initialize service with mock data
@router.on_event("startup")
async def initialize_learning_path_service():
    """Initialize the learning path service with data"""
    try:
        learning_path_generator.load_skill_taxonomy(MOCK_SKILLS_DATA)
        learning_path_generator.load_learning_resources(MOCK_RESOURCES_DATA)
        learning_path_generator.load_job_requirements(MOCK_JOB_REQUIREMENTS)
        learning_path_generator.load_peer_success_data([])  # Empty for now
        logger.info("Learning path service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize learning path service: {e}")

@router.post("/generate", response_model=LearningPathResponse)
async def generate_learning_path(profile_request: UserProfileRequest):
    """Generate a personalized learning path for a user"""
    try:
        # Convert request to UserProfile
        user_profile = UserProfile(
            user_id=profile_request.user_id,
            current_skills=profile_request.current_skills,
            target_role=profile_request.target_role,
            career_goals=profile_request.career_goals,
            learning_pace=profile_request.learning_pace,
            time_commitment_hours_week=profile_request.time_commitment_hours_week,
            preferred_formats=profile_request.preferred_formats,
            budget_monthly=profile_request.budget_monthly,
            completed_resources=profile_request.completed_resources
        )
        
        # Generate learning path
        learning_path = learning_path_generator.generate_learning_path(user_profile)
        
        # Convert to response format
        response = _convert_learning_path_to_response(learning_path)
        
        logger.info(f"Generated learning path for user {profile_request.user_id} with {len(learning_path.steps)} steps")
        return response
        
    except Exception as e:
        logger.error(f"Error generating learning path: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning path: {str(e)}"
        )

@router.get("/skill-gaps/{user_id}", response_model=List[SkillGapAnalysisResponse])
async def analyze_skill_gaps(user_id: str, target_role: str, current_skills: str):
    """Analyze skill gaps for a specific target role"""
    try:
        # Parse current skills from query parameter (JSON string)
        import json
        skills_dict = json.loads(current_skills)
        
        # Create minimal user profile for gap analysis
        user_profile = UserProfile(
            user_id=user_id,
            current_skills=skills_dict,
            target_role=target_role,
            career_goals=[],
            learning_pace="medium",
            time_commitment_hours_week=10,
            preferred_formats=[],
            budget_monthly=100.0
        )
        
        # Analyze gaps
        skill_gaps = learning_path_generator.analyze_skill_gaps(user_profile)
        
        # Convert to response format
        gap_responses = []
        for skill_id, priority_score in skill_gaps:
            skill = learning_path_generator.skills_db.get(skill_id)
            if skill:
                current_level = skills_dict.get(skill_id, 0)
                required_level = 7  # Assume 7/10 for job requirements
                
                gap_response = SkillGapAnalysisResponse(
                    skill_id=skill_id,
                    skill_name=skill.name,
                    current_level=current_level,
                    required_level=required_level,
                    gap_size=max(0, required_level - current_level),
                    priority_score=priority_score,
                    market_demand=skill.market_demand,
                    salary_impact=skill.salary_impact,
                    learning_time_hours=skill.learning_time_hours
                )
                gap_responses.append(gap_response)
        
        logger.info(f"Analyzed {len(gap_responses)} skill gaps for user {user_id}")
        return gap_responses
        
    except Exception as e:
        logger.error(f"Error analyzing skill gaps: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze skill gaps: {str(e)}"
        )

@router.post("/adapt", response_model=PathAdaptationResponse)
async def adapt_learning_path(progress_update: PathProgressUpdate):
    """Adapt learning path based on user progress and assessment results"""
    try:
        # This would typically fetch the existing path from database
        # For now, we'll return a mock adaptation response
        
        changes_made = []
        if progress_update.completed_steps:
            changes_made.append(f"Removed {len(progress_update.completed_steps)} completed steps")
        
        if progress_update.assessment_results:
            changes_made.append("Adjusted difficulty based on assessment results")
        
        # Mock adapted path (in real implementation, this would call the adaptation service)
        mock_adapted_path = LearningPathResponse(
            user_id="user_123",
            path_id=progress_update.path_id + "_adapted",
            title="Adapted Learning Path",
            description="Learning path adapted based on your progress",
            steps=[],
            total_duration_weeks=8,
            estimated_salary_increase=15.0,
            confidence_score=0.85,
            created_at=datetime.now(),
            last_updated=datetime.now()
        )
        
        response = PathAdaptationResponse(
            adapted_path=mock_adapted_path,
            changes_made=changes_made,
            adaptation_reason="Progress update and assessment results"
        )
        
        logger.info(f"Adapted learning path {progress_update.path_id}")
        return response
        
    except Exception as e:
        logger.error(f"Error adapting learning path: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to adapt learning path: {str(e)}"
        )

@router.get("/resources/{skill_id}", response_model=List[LearningResourceResponse])
async def get_learning_resources(skill_id: str, user_id: Optional[str] = None):
    """Get learning resources for a specific skill"""
    try:
        resources = learning_path_generator.resources_db.get(skill_id, [])
        
        # Convert to response format
        resource_responses = []
        for resource in resources:
            resource_response = LearningResourceResponse(
                id=resource.id,
                title=resource.title,
                provider=resource.provider,
                url=resource.url,
                skill_id=resource.skill_id,
                difficulty=resource.difficulty,
                duration_hours=resource.duration_hours,
                rating=resource.rating,
                cost=resource.cost,
                format=resource.format,
                prerequisites=resource.prerequisites
            )
            resource_responses.append(resource_response)
        
        logger.info(f"Retrieved {len(resource_responses)} resources for skill {skill_id}")
        return resource_responses
        
    except Exception as e:
        logger.error(f"Error retrieving learning resources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve learning resources: {str(e)}"
        )

@router.get("/job-requirements/{role}", response_model=List[str])
async def get_job_requirements(role: str):
    """Get skill requirements for a specific job role"""
    try:
        requirements = learning_path_generator.job_requirements.get(role, [])
        logger.info(f"Retrieved {len(requirements)} requirements for role {role}")
        return requirements
        
    except Exception as e:
        logger.error(f"Error retrieving job requirements: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve job requirements: {str(e)}"
        )

def _convert_learning_path_to_response(learning_path: LearningPath) -> LearningPathResponse:
    """Convert internal LearningPath to API response format"""
    steps_response = []
    
    for step in learning_path.steps:
        resources_response = [
            LearningResourceResponse(
                id=resource.id,
                title=resource.title,
                provider=resource.provider,
                url=resource.url,
                skill_id=resource.skill_id,
                difficulty=resource.difficulty,
                duration_hours=resource.duration_hours,
                rating=resource.rating,
                cost=resource.cost,
                format=resource.format,
                prerequisites=resource.prerequisites
            )
            for resource in step.resources
        ]
        
        step_response = LearningPathStepResponse(
            skill_id=step.skill.id,
            skill_name=step.skill.name,
            skill_category=step.skill.category,
            resources=resources_response,
            estimated_weeks=step.estimated_weeks,
            priority_score=step.priority_score,
            prerequisites_met=step.prerequisites_met,
            milestone_description=step.milestone_description
        )
        steps_response.append(step_response)
    
    return LearningPathResponse(
        user_id=learning_path.user_id,
        path_id=learning_path.path_id,
        title=learning_path.title,
        description=learning_path.description,
        steps=steps_response,
        total_duration_weeks=learning_path.total_duration_weeks,
        estimated_salary_increase=learning_path.estimated_salary_increase,
        confidence_score=learning_path.confidence_score,
        created_at=learning_path.created_at,
        last_updated=learning_path.last_updated
    )
