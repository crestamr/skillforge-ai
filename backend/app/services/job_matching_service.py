"""
Job Matching Service for SkillForge AI Backend
Implements sophisticated job matching algorithm using sentence-transformers
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from datetime import datetime, timedelta
import json
import re
from dataclasses import dataclass
from enum import Enum

# Import AI services (with fallback for development)
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.feature_extraction.text import TfidfVectorizer
    import pandas as pd
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False

logger = logging.getLogger(__name__)


class MatchingStrategy(Enum):
    """Job matching strategy options"""
    SEMANTIC = "semantic"
    SKILL_BASED = "skill_based"
    HYBRID = "hybrid"
    EXPERIENCE_WEIGHTED = "experience_weighted"


@dataclass
class UserProfile:
    """User profile for job matching"""
    user_id: str
    skills: List[Dict[str, Any]]
    experience_years: int
    education_level: str
    preferred_locations: List[str]
    preferred_salary_min: Optional[int]
    preferred_salary_max: Optional[int]
    preferred_industries: List[str]
    career_level: str
    work_preferences: Dict[str, Any]
    bio: str
    resume_text: str


@dataclass
class JobPosting:
    """Job posting for matching"""
    job_id: str
    title: str
    company: str
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    experience_required: str
    education_required: str
    location: str
    salary_min: Optional[int]
    salary_max: Optional[int]
    industry: str
    job_type: str
    remote_allowed: bool
    posted_date: datetime
    application_deadline: Optional[datetime]


@dataclass
class MatchResult:
    """Job matching result"""
    job_id: str
    user_id: str
    overall_score: float
    skill_match_score: float
    experience_match_score: float
    location_match_score: float
    salary_match_score: float
    semantic_similarity_score: float
    skill_gaps: List[str]
    matching_skills: List[str]
    recommendations: List[str]
    confidence_level: str
    explanation: str
    timestamp: datetime


class JobMatchingService:
    """Advanced job matching service using AI and semantic analysis"""
    
    def __init__(self):
        self.sentence_transformer = None
        self.tfidf_vectorizer = None
        self.skill_embeddings_cache = {}
        self.job_embeddings_cache = {}
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize sentence transformer and other ML models"""
        try:
            if DEPENDENCIES_AVAILABLE:
                logger.info("Initializing job matching models...")
                
                # Initialize sentence transformer for semantic matching
                self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
                
                # Initialize TF-IDF vectorizer for skill matching
                self.tfidf_vectorizer = TfidfVectorizer(
                    max_features=5000,
                    stop_words='english',
                    ngram_range=(1, 2)
                )
                
                logger.info("Job matching models initialized successfully")
            else:
                logger.warning("ML dependencies not available, using mock matching")
                
        except Exception as e:
            logger.error(f"Error initializing job matching models: {e}")
    
    async def match_jobs_for_user(
        self,
        user_profile: UserProfile,
        job_postings: List[JobPosting],
        strategy: MatchingStrategy = MatchingStrategy.HYBRID,
        max_results: int = 50,
        min_score_threshold: float = 0.3
    ) -> List[MatchResult]:
        """
        Find matching jobs for a user profile
        
        Args:
            user_profile: User's profile and preferences
            job_postings: Available job postings
            strategy: Matching strategy to use
            max_results: Maximum number of results to return
            min_score_threshold: Minimum matching score threshold
        
        Returns:
            List of job matches sorted by relevance
        """
        try:
            logger.info(f"Matching jobs for user {user_profile.user_id} using {strategy.value} strategy")
            
            matches = []
            
            for job in job_postings:
                match_result = await self._calculate_job_match(
                    user_profile, job, strategy
                )
                
                if match_result.overall_score >= min_score_threshold:
                    matches.append(match_result)
            
            # Sort by overall score (descending)
            matches.sort(key=lambda x: x.overall_score, reverse=True)
            
            # Apply personalized ranking
            matches = await self._apply_personalized_ranking(user_profile, matches)
            
            # Limit results
            matches = matches[:max_results]
            
            logger.info(f"Found {len(matches)} job matches for user {user_profile.user_id}")
            return matches
            
        except Exception as e:
            logger.error(f"Error matching jobs for user {user_profile.user_id}: {e}")
            return []
    
    async def _calculate_job_match(
        self,
        user_profile: UserProfile,
        job: JobPosting,
        strategy: MatchingStrategy
    ) -> MatchResult:
        """Calculate match score between user and job"""
        try:
            # Calculate individual match components
            skill_match = await self._calculate_skill_match(user_profile, job)
            experience_match = self._calculate_experience_match(user_profile, job)
            location_match = self._calculate_location_match(user_profile, job)
            salary_match = self._calculate_salary_match(user_profile, job)
            semantic_match = await self._calculate_semantic_match(user_profile, job)
            
            # Calculate overall score based on strategy
            overall_score = self._calculate_overall_score(
                skill_match, experience_match, location_match, 
                salary_match, semantic_match, strategy
            )
            
            # Generate skill gaps and recommendations
            skill_gaps = self._identify_skill_gaps(user_profile, job)
            matching_skills = self._identify_matching_skills(user_profile, job)
            recommendations = self._generate_recommendations(user_profile, job, skill_gaps)
            
            # Determine confidence level
            confidence_level = self._determine_confidence_level(overall_score)
            
            # Generate explanation
            explanation = self._generate_match_explanation(
                user_profile, job, skill_match, experience_match, 
                location_match, salary_match, semantic_match
            )
            
            return MatchResult(
                job_id=job.job_id,
                user_id=user_profile.user_id,
                overall_score=overall_score,
                skill_match_score=skill_match['score'],
                experience_match_score=experience_match,
                location_match_score=location_match,
                salary_match_score=salary_match,
                semantic_similarity_score=semantic_match,
                skill_gaps=skill_gaps,
                matching_skills=matching_skills,
                recommendations=recommendations,
                confidence_level=confidence_level,
                explanation=explanation,
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error calculating job match: {e}")
            return MatchResult(
                job_id=job.job_id,
                user_id=user_profile.user_id,
                overall_score=0.0,
                skill_match_score=0.0,
                experience_match_score=0.0,
                location_match_score=0.0,
                salary_match_score=0.0,
                semantic_similarity_score=0.0,
                skill_gaps=[],
                matching_skills=[],
                recommendations=[],
                confidence_level="low",
                explanation="Error calculating match",
                timestamp=datetime.utcnow()
            )
    
    async def _calculate_skill_match(
        self, 
        user_profile: UserProfile, 
        job: JobPosting
    ) -> Dict[str, Any]:
        """Calculate skill matching score"""
        try:
            user_skills = [skill['skill'].lower() for skill in user_profile.skills]
            required_skills = [skill.lower() for skill in job.required_skills]
            preferred_skills = [skill.lower() for skill in job.preferred_skills]
            
            # Direct skill matches
            required_matches = len(set(user_skills) & set(required_skills))
            preferred_matches = len(set(user_skills) & set(preferred_skills))
            
            # Calculate scores
            required_score = required_matches / len(required_skills) if required_skills else 1.0
            preferred_score = preferred_matches / len(preferred_skills) if preferred_skills else 0.0
            
            # Weighted combination (required skills are more important)
            skill_score = (required_score * 0.8) + (preferred_score * 0.2)
            
            # Semantic skill matching using embeddings
            if self.sentence_transformer:
                semantic_skill_score = await self._calculate_semantic_skill_match(
                    user_skills, required_skills + preferred_skills
                )
                # Combine direct and semantic matching
                skill_score = (skill_score * 0.7) + (semantic_skill_score * 0.3)
            
            return {
                'score': min(skill_score, 1.0),
                'required_matches': required_matches,
                'preferred_matches': preferred_matches,
                'total_required': len(required_skills),
                'total_preferred': len(preferred_skills)
            }
            
        except Exception as e:
            logger.error(f"Error calculating skill match: {e}")
            return {'score': 0.0, 'required_matches': 0, 'preferred_matches': 0}
    
    async def _calculate_semantic_skill_match(
        self, 
        user_skills: List[str], 
        job_skills: List[str]
    ) -> float:
        """Calculate semantic similarity between skill sets"""
        try:
            if not self.sentence_transformer or not user_skills or not job_skills:
                return 0.0
            
            # Generate embeddings
            user_embeddings = self.sentence_transformer.encode(user_skills)
            job_embeddings = self.sentence_transformer.encode(job_skills)
            
            # Calculate similarity matrix
            similarity_matrix = cosine_similarity(user_embeddings, job_embeddings)
            
            # Find best matches for each job skill
            max_similarities = np.max(similarity_matrix, axis=0)
            
            # Average similarity score
            semantic_score = np.mean(max_similarities)
            
            return float(semantic_score)
            
        except Exception as e:
            logger.error(f"Error calculating semantic skill match: {e}")
            return 0.0
    
    def _calculate_experience_match(
        self, 
        user_profile: UserProfile, 
        job: JobPosting
    ) -> float:
        """Calculate experience level matching"""
        try:
            # Parse required experience from job description
            required_years = self._extract_experience_years(job.experience_required)
            
            if required_years is None:
                return 0.8  # Neutral score if experience not specified
            
            user_years = user_profile.experience_years
            
            # Calculate experience match score
            if user_years >= required_years:
                # User meets or exceeds requirements
                if user_years <= required_years * 1.5:
                    return 1.0  # Perfect match
                else:
                    # Overqualified - slight penalty
                    return max(0.7, 1.0 - (user_years - required_years * 1.5) * 0.05)
            else:
                # User has less experience than required
                ratio = user_years / required_years
                return max(0.0, ratio * 0.8)  # Penalty for insufficient experience
                
        except Exception as e:
            logger.error(f"Error calculating experience match: {e}")
            return 0.5
    
    def _calculate_location_match(
        self, 
        user_profile: UserProfile, 
        job: JobPosting
    ) -> float:
        """Calculate location preference matching"""
        try:
            # Remote work gets high score if user prefers it
            if job.remote_allowed and 'remote' in [loc.lower() for loc in user_profile.preferred_locations]:
                return 1.0
            
            # Check if job location matches user preferences
            job_location = job.location.lower()
            user_locations = [loc.lower() for loc in user_profile.preferred_locations]
            
            # Exact location match
            if job_location in user_locations:
                return 1.0
            
            # Partial location match (city in state, etc.)
            for user_loc in user_locations:
                if user_loc in job_location or job_location in user_loc:
                    return 0.8
            
            # No location preference specified
            if not user_profile.preferred_locations:
                return 0.6
            
            return 0.2  # Location mismatch
            
        except Exception as e:
            logger.error(f"Error calculating location match: {e}")
            return 0.5
    
    def _calculate_salary_match(
        self, 
        user_profile: UserProfile, 
        job: JobPosting
    ) -> float:
        """Calculate salary expectation matching"""
        try:
            # If no salary information available
            if not job.salary_min and not job.salary_max:
                return 0.5  # Neutral score
            
            if not user_profile.preferred_salary_min and not user_profile.preferred_salary_max:
                return 0.7  # User has no salary preference
            
            job_min = job.salary_min or 0
            job_max = job.salary_max or job_min * 1.3 if job_min else 100000
            
            user_min = user_profile.preferred_salary_min or 0
            user_max = user_profile.preferred_salary_max or user_min * 1.5 if user_min else 200000
            
            # Calculate overlap between salary ranges
            overlap_min = max(job_min, user_min)
            overlap_max = min(job_max, user_max)
            
            if overlap_max <= overlap_min:
                return 0.0  # No overlap
            
            # Calculate overlap ratio
            job_range = job_max - job_min
            user_range = user_max - user_min
            overlap_range = overlap_max - overlap_min
            
            if job_range == 0 and user_range == 0:
                return 1.0
            
            overlap_ratio = overlap_range / max(job_range, user_range)
            return min(1.0, overlap_ratio)
            
        except Exception as e:
            logger.error(f"Error calculating salary match: {e}")
            return 0.5

    async def _calculate_semantic_match(
        self,
        user_profile: UserProfile,
        job: JobPosting
    ) -> float:
        """Calculate semantic similarity between user profile and job description"""
        try:
            if not self.sentence_transformer:
                return 0.5  # Fallback score

            # Combine user profile text
            user_text = f"{user_profile.bio} {user_profile.resume_text}"
            if not user_text.strip():
                user_text = " ".join([skill['skill'] for skill in user_profile.skills])

            # Use job description
            job_text = f"{job.title} {job.description}"

            # Generate embeddings
            user_embedding = self.sentence_transformer.encode([user_text])
            job_embedding = self.sentence_transformer.encode([job_text])

            # Calculate cosine similarity
            similarity = cosine_similarity(user_embedding, job_embedding)[0][0]

            return float(similarity)

        except Exception as e:
            logger.error(f"Error calculating semantic match: {e}")
            return 0.5

    def _calculate_overall_score(
        self,
        skill_match: Dict[str, Any],
        experience_match: float,
        location_match: float,
        salary_match: float,
        semantic_match: float,
        strategy: MatchingStrategy
    ) -> float:
        """Calculate overall matching score based on strategy"""
        try:
            skill_score = skill_match['score']

            if strategy == MatchingStrategy.SKILL_BASED:
                # Heavily weight skills
                weights = {
                    'skill': 0.6,
                    'experience': 0.2,
                    'location': 0.1,
                    'salary': 0.05,
                    'semantic': 0.05
                }
            elif strategy == MatchingStrategy.SEMANTIC:
                # Heavily weight semantic similarity
                weights = {
                    'skill': 0.2,
                    'experience': 0.15,
                    'location': 0.1,
                    'salary': 0.05,
                    'semantic': 0.5
                }
            elif strategy == MatchingStrategy.EXPERIENCE_WEIGHTED:
                # Weight experience more heavily
                weights = {
                    'skill': 0.4,
                    'experience': 0.3,
                    'location': 0.15,
                    'salary': 0.1,
                    'semantic': 0.05
                }
            else:  # HYBRID (default)
                # Balanced approach
                weights = {
                    'skill': 0.35,
                    'experience': 0.25,
                    'location': 0.15,
                    'salary': 0.1,
                    'semantic': 0.15
                }

            overall_score = (
                skill_score * weights['skill'] +
                experience_match * weights['experience'] +
                location_match * weights['location'] +
                salary_match * weights['salary'] +
                semantic_match * weights['semantic']
            )

            return min(1.0, overall_score)

        except Exception as e:
            logger.error(f"Error calculating overall score: {e}")
            return 0.0

    def _identify_skill_gaps(
        self,
        user_profile: UserProfile,
        job: JobPosting
    ) -> List[str]:
        """Identify skills the user is missing for the job"""
        try:
            user_skills = set(skill['skill'].lower() for skill in user_profile.skills)
            required_skills = set(skill.lower() for skill in job.required_skills)
            preferred_skills = set(skill.lower() for skill in job.preferred_skills)

            # Find missing required skills (high priority gaps)
            missing_required = required_skills - user_skills

            # Find missing preferred skills (nice-to-have gaps)
            missing_preferred = preferred_skills - user_skills

            # Combine and prioritize required skills
            skill_gaps = list(missing_required) + list(missing_preferred)

            return skill_gaps[:10]  # Limit to top 10 gaps

        except Exception as e:
            logger.error(f"Error identifying skill gaps: {e}")
            return []

    def _identify_matching_skills(
        self,
        user_profile: UserProfile,
        job: JobPosting
    ) -> List[str]:
        """Identify skills that match between user and job"""
        try:
            user_skills = set(skill['skill'].lower() for skill in user_profile.skills)
            job_skills = set(skill.lower() for skill in job.required_skills + job.preferred_skills)

            matching_skills = user_skills & job_skills

            return list(matching_skills)

        except Exception as e:
            logger.error(f"Error identifying matching skills: {e}")
            return []

    def _generate_recommendations(
        self,
        user_profile: UserProfile,
        job: JobPosting,
        skill_gaps: List[str]
    ) -> List[str]:
        """Generate recommendations for improving job match"""
        try:
            recommendations = []

            # Skill-based recommendations
            if skill_gaps:
                top_gaps = skill_gaps[:3]
                recommendations.append(
                    f"Consider learning these key skills: {', '.join(top_gaps)}"
                )

            # Experience recommendations
            required_years = self._extract_experience_years(job.experience_required)
            if required_years and user_profile.experience_years < required_years:
                gap = required_years - user_profile.experience_years
                recommendations.append(
                    f"Gain {gap} more years of experience in relevant roles"
                )

            # Education recommendations
            if job.education_required and user_profile.education_level:
                if self._compare_education_levels(user_profile.education_level, job.education_required) < 0:
                    recommendations.append(
                        f"Consider pursuing {job.education_required} to meet requirements"
                    )

            # Location recommendations
            if job.location and user_profile.preferred_locations:
                if job.location.lower() not in [loc.lower() for loc in user_profile.preferred_locations]:
                    if job.remote_allowed:
                        recommendations.append("This position offers remote work options")
                    else:
                        recommendations.append(f"Consider relocating to {job.location}")

            return recommendations[:5]  # Limit to top 5 recommendations

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []

    def _determine_confidence_level(self, overall_score: float) -> str:
        """Determine confidence level based on overall score"""
        if overall_score >= 0.8:
            return "high"
        elif overall_score >= 0.6:
            return "medium"
        elif overall_score >= 0.4:
            return "low"
        else:
            return "very_low"

    def _generate_match_explanation(
        self,
        user_profile: UserProfile,
        job: JobPosting,
        skill_match: Dict[str, Any],
        experience_match: float,
        location_match: float,
        salary_match: float,
        semantic_match: float
    ) -> str:
        """Generate human-readable explanation of the match"""
        try:
            explanations = []

            # Skill explanation
            skill_score = skill_match['score']
            if skill_score >= 0.8:
                explanations.append("Strong skill alignment with job requirements")
            elif skill_score >= 0.6:
                explanations.append("Good skill match with some gaps")
            else:
                explanations.append("Limited skill overlap - significant upskilling needed")

            # Experience explanation
            if experience_match >= 0.8:
                explanations.append("Experience level well-suited for this role")
            elif experience_match >= 0.6:
                explanations.append("Experience level adequate with room for growth")
            else:
                explanations.append("May need more experience for this position")

            # Location explanation
            if location_match >= 0.8:
                explanations.append("Location preferences align well")
            elif location_match >= 0.4:
                explanations.append("Location is workable but not ideal")
            else:
                explanations.append("Location may be challenging")

            return ". ".join(explanations) + "."

        except Exception as e:
            logger.error(f"Error generating match explanation: {e}")
            return "Match analysis completed."

    async def _apply_personalized_ranking(
        self,
        user_profile: UserProfile,
        matches: List[MatchResult]
    ) -> List[MatchResult]:
        """Apply personalized ranking based on user preferences and history"""
        try:
            # Apply industry preference boost
            for match in matches:
                # This would typically fetch job details from database
                # For now, we'll use a simple boost based on user preferences
                if hasattr(user_profile, 'preferred_industries'):
                    # Boost score for preferred industries (would need job industry data)
                    pass

            # Apply recency boost for recently posted jobs
            current_time = datetime.utcnow()
            for match in matches:
                # This would typically use job posting date
                # Boost recent postings slightly
                pass

            # Apply diversity to avoid too similar recommendations
            # This would implement diversity algorithms

            return matches

        except Exception as e:
            logger.error(f"Error applying personalized ranking: {e}")
            return matches

    def _extract_experience_years(self, experience_text: str) -> Optional[int]:
        """Extract years of experience from text"""
        try:
            if not experience_text:
                return None

            # Common patterns for experience requirements
            patterns = [
                r'(\d+)\+?\s*years?',
                r'(\d+)\+?\s*yrs?',
                r'(\d+)\+?\s*year',
                r'minimum\s+(\d+)\s+years?',
                r'at least\s+(\d+)\s+years?'
            ]

            text_lower = experience_text.lower()

            for pattern in patterns:
                match = re.search(pattern, text_lower)
                if match:
                    return int(match.group(1))

            # Handle ranges (take minimum)
            range_pattern = r'(\d+)\s*-\s*(\d+)\s*years?'
            range_match = re.search(range_pattern, text_lower)
            if range_match:
                return int(range_match.group(1))

            return None

        except Exception as e:
            logger.error(f"Error extracting experience years: {e}")
            return None

    def _compare_education_levels(self, user_education: str, required_education: str) -> int:
        """Compare education levels (-1: user lower, 0: equal, 1: user higher)"""
        try:
            education_hierarchy = {
                'high school': 1,
                'associate': 2,
                'bachelor': 3,
                'master': 4,
                'phd': 5,
                'doctorate': 5
            }

            user_level = 0
            required_level = 0

            user_lower = user_education.lower()
            required_lower = required_education.lower()

            for edu_type, level in education_hierarchy.items():
                if edu_type in user_lower:
                    user_level = max(user_level, level)
                if edu_type in required_lower:
                    required_level = max(required_level, level)

            if user_level < required_level:
                return -1
            elif user_level > required_level:
                return 1
            else:
                return 0

        except Exception as e:
            logger.error(f"Error comparing education levels: {e}")
            return 0

    async def get_job_recommendations(
        self,
        user_profile: UserProfile,
        job_postings: List[JobPosting],
        recommendation_type: str = "best_matches"
    ) -> List[MatchResult]:
        """Get job recommendations based on different criteria"""
        try:
            if recommendation_type == "skill_growth":
                # Recommend jobs that help user grow specific skills
                return await self._get_skill_growth_recommendations(user_profile, job_postings)
            elif recommendation_type == "salary_boost":
                # Recommend jobs with higher salary potential
                return await self._get_salary_boost_recommendations(user_profile, job_postings)
            elif recommendation_type == "career_progression":
                # Recommend jobs for career advancement
                return await self._get_career_progression_recommendations(user_profile, job_postings)
            else:
                # Default: best overall matches
                return await self.match_jobs_for_user(user_profile, job_postings)

        except Exception as e:
            logger.error(f"Error getting job recommendations: {e}")
            return []

    async def _get_skill_growth_recommendations(
        self,
        user_profile: UserProfile,
        job_postings: List[JobPosting]
    ) -> List[MatchResult]:
        """Recommend jobs that help develop new skills"""
        try:
            matches = await self.match_jobs_for_user(
                user_profile, job_postings,
                strategy=MatchingStrategy.SKILL_BASED,
                min_score_threshold=0.4
            )

            # Prioritize jobs with skills user doesn't have but are valuable
            for match in matches:
                job = next((j for j in job_postings if j.job_id == match.job_id), None)
                if job:
                    # Boost score for jobs with new skills
                    new_skills_count = len(match.skill_gaps)
                    if new_skills_count > 0:
                        match.overall_score += min(0.2, new_skills_count * 0.05)

            matches.sort(key=lambda x: x.overall_score, reverse=True)
            return matches[:20]

        except Exception as e:
            logger.error(f"Error getting skill growth recommendations: {e}")
            return []

    async def _get_salary_boost_recommendations(
        self,
        user_profile: UserProfile,
        job_postings: List[JobPosting]
    ) -> List[MatchResult]:
        """Recommend jobs with higher salary potential"""
        try:
            matches = await self.match_jobs_for_user(user_profile, job_postings)

            # Filter and boost jobs with higher salaries
            salary_boosted_matches = []
            user_max_salary = user_profile.preferred_salary_max or 100000

            for match in matches:
                job = next((j for j in job_postings if j.job_id == match.job_id), None)
                if job and job.salary_max and job.salary_max > user_max_salary:
                    # Boost score for higher paying jobs
                    salary_boost = min(0.3, (job.salary_max - user_max_salary) / user_max_salary)
                    match.overall_score += salary_boost
                    salary_boosted_matches.append(match)

            salary_boosted_matches.sort(key=lambda x: x.overall_score, reverse=True)
            return salary_boosted_matches[:20]

        except Exception as e:
            logger.error(f"Error getting salary boost recommendations: {e}")
            return []

    async def _get_career_progression_recommendations(
        self,
        user_profile: UserProfile,
        job_postings: List[JobPosting]
    ) -> List[MatchResult]:
        """Recommend jobs for career advancement"""
        try:
            matches = await self.match_jobs_for_user(
                user_profile, job_postings,
                strategy=MatchingStrategy.EXPERIENCE_WEIGHTED
            )

            # Boost jobs that represent career progression
            progression_keywords = [
                'senior', 'lead', 'principal', 'manager', 'director',
                'head', 'chief', 'architect', 'staff'
            ]

            for match in matches:
                job = next((j for j in job_postings if j.job_id == match.job_id), None)
                if job:
                    job_title_lower = job.title.lower()
                    for keyword in progression_keywords:
                        if keyword in job_title_lower:
                            match.overall_score += 0.15
                            break

            matches.sort(key=lambda x: x.overall_score, reverse=True)
            return matches[:20]

        except Exception as e:
            logger.error(f"Error getting career progression recommendations: {e}")
            return []

    async def analyze_market_trends(
        self,
        job_postings: List[JobPosting]
    ) -> Dict[str, Any]:
        """Analyze job market trends from available postings"""
        try:
            if not job_postings:
                return {}

            # Skill demand analysis
            skill_counts = {}
            for job in job_postings:
                for skill in job.required_skills + job.preferred_skills:
                    skill_lower = skill.lower()
                    skill_counts[skill_lower] = skill_counts.get(skill_lower, 0) + 1

            # Sort skills by demand
            top_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:20]

            # Salary analysis
            salaries = [job.salary_max for job in job_postings if job.salary_max]
            avg_salary = sum(salaries) / len(salaries) if salaries else 0

            # Location analysis
            location_counts = {}
            for job in job_postings:
                location = job.location.lower()
                location_counts[location] = location_counts.get(location, 0) + 1

            top_locations = sorted(location_counts.items(), key=lambda x: x[1], reverse=True)[:10]

            # Remote work analysis
            remote_jobs = sum(1 for job in job_postings if job.remote_allowed)
            remote_percentage = (remote_jobs / len(job_postings)) * 100

            return {
                'total_jobs_analyzed': len(job_postings),
                'top_skills_in_demand': top_skills,
                'average_salary': avg_salary,
                'top_locations': top_locations,
                'remote_work_percentage': remote_percentage,
                'analysis_timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Error analyzing market trends: {e}")
            return {}


# Global job matching service instance
job_matching_service = JobMatchingService()
