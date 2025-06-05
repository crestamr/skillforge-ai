"""
Sophisticated Personalized Learning Path Generation Service
Analyzes user profiles and generates optimal learning sequences for career advancement
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import networkx as nx
import json

logger = logging.getLogger(__name__)

@dataclass
class Skill:
    """Represents a skill with metadata"""
    id: str
    name: str
    category: str
    difficulty: int  # 1-10 scale
    market_demand: float  # 0-1 scale
    salary_impact: float  # percentage increase
    prerequisites: List[str] = field(default_factory=list)
    learning_time_hours: int = 40
    
@dataclass
class LearningResource:
    """Represents a learning resource"""
    id: str
    title: str
    provider: str  # coursera, linkedin, udemy, etc.
    url: str
    skill_id: str
    difficulty: int
    duration_hours: int
    rating: float
    cost: float
    format: str  # video, text, interactive, etc.
    prerequisites: List[str] = field(default_factory=list)

@dataclass
class UserProfile:
    """User's current skill profile and preferences"""
    user_id: str
    current_skills: Dict[str, int]  # skill_id -> proficiency level (1-10)
    target_role: str
    career_goals: List[str]
    learning_pace: str  # slow, medium, fast
    time_commitment_hours_week: int
    preferred_formats: List[str]
    budget_monthly: float
    completed_resources: List[str] = field(default_factory=list)

@dataclass
class LearningPathStep:
    """Single step in a learning path"""
    skill: Skill
    resources: List[LearningResource]
    estimated_weeks: int
    priority_score: float
    prerequisites_met: bool
    milestone_description: str

@dataclass
class LearningPath:
    """Complete personalized learning path"""
    user_id: str
    path_id: str
    title: str
    description: str
    steps: List[LearningPathStep]
    total_duration_weeks: int
    estimated_salary_increase: float
    confidence_score: float
    created_at: datetime
    last_updated: datetime

class LearningPathGenerator:
    """Advanced learning path generation with AI-driven optimization"""
    
    def __init__(self):
        self.skills_graph = nx.DiGraph()
        self.skills_db: Dict[str, Skill] = {}
        self.resources_db: Dict[str, List[LearningResource]] = {}
        self.job_requirements: Dict[str, List[str]] = {}
        self.peer_success_paths: List[Dict] = []
        self.scaler = StandardScaler()
        
    def load_skill_taxonomy(self, skills_data: List[Dict]) -> None:
        """Load skills with prerequisites and relationships"""
        for skill_data in skills_data:
            skill = Skill(**skill_data)
            self.skills_db[skill.id] = skill
            self.skills_graph.add_node(skill.id, **skill_data)
            
            # Add prerequisite edges
            for prereq in skill.prerequisites:
                if prereq in self.skills_db:
                    self.skills_graph.add_edge(prereq, skill.id)
                    
        logger.info(f"Loaded {len(self.skills_db)} skills with {self.skills_graph.number_of_edges()} prerequisite relationships")

    def load_learning_resources(self, resources_data: List[Dict]) -> None:
        """Load learning resources from various platforms"""
        for resource_data in resources_data:
            resource = LearningResource(**resource_data)
            skill_id = resource.skill_id
            
            if skill_id not in self.resources_db:
                self.resources_db[skill_id] = []
            self.resources_db[skill_id].append(resource)
            
        logger.info(f"Loaded {sum(len(resources) for resources in self.resources_db.values())} learning resources")

    def load_job_requirements(self, job_data: Dict[str, List[str]]) -> None:
        """Load job role requirements mapping"""
        self.job_requirements = job_data
        logger.info(f"Loaded requirements for {len(job_data)} job roles")

    def load_peer_success_data(self, peer_data: List[Dict]) -> None:
        """Load successful learning paths from peer users"""
        self.peer_success_paths = peer_data
        logger.info(f"Loaded {len(peer_data)} successful peer learning paths")

    def analyze_skill_gaps(self, user_profile: UserProfile) -> List[Tuple[str, float]]:
        """Identify and prioritize skill gaps based on target role and market demand"""
        target_skills = self.job_requirements.get(user_profile.target_role, [])
        skill_gaps = []
        
        for skill_id in target_skills:
            if skill_id not in self.skills_db:
                continue
                
            skill = self.skills_db[skill_id]
            current_level = user_profile.current_skills.get(skill_id, 0)
            required_level = 7  # Assume 7/10 is job requirement level
            
            if current_level < required_level:
                gap_size = required_level - current_level
                
                # Calculate priority score based on multiple factors
                priority_score = self._calculate_skill_priority(
                    skill, gap_size, user_profile
                )
                
                skill_gaps.append((skill_id, priority_score))
        
        # Sort by priority score (descending)
        skill_gaps.sort(key=lambda x: x[1], reverse=True)
        return skill_gaps

    def _calculate_skill_priority(self, skill: Skill, gap_size: int, user_profile: UserProfile) -> float:
        """Calculate priority score for a skill gap"""
        # Base score from gap size
        base_score = gap_size * 10
        
        # Market demand multiplier (0.5 - 2.0)
        demand_multiplier = 0.5 + (skill.market_demand * 1.5)
        
        # Salary impact multiplier (0.8 - 2.0)
        salary_multiplier = 0.8 + (skill.salary_impact / 50)
        
        # Learning time penalty (prefer shorter learning times)
        time_penalty = max(0.5, 1.0 - (skill.learning_time_hours / 200))
        
        # Prerequisite bonus (skills with met prerequisites get higher priority)
        prereq_bonus = 1.0
        if skill.prerequisites:
            met_prereqs = sum(1 for prereq in skill.prerequisites 
                            if user_profile.current_skills.get(prereq, 0) >= 5)
            prereq_bonus = 0.5 + (met_prereqs / len(skill.prerequisites)) * 0.5
        
        # Peer success bonus (skills in successful peer paths get bonus)
        peer_bonus = self._get_peer_success_bonus(skill.id, user_profile)
        
        priority_score = (base_score * demand_multiplier * salary_multiplier * 
                         time_penalty * prereq_bonus * peer_bonus)
        
        return priority_score

    def _get_peer_success_bonus(self, skill_id: str, user_profile: UserProfile) -> float:
        """Calculate bonus based on peer success data"""
        similar_users = [
            path for path in self.peer_success_paths
            if path.get('target_role') == user_profile.target_role
        ]
        
        if not similar_users:
            return 1.0
            
        skill_frequency = sum(1 for path in similar_users 
                            if skill_id in path.get('skills_learned', []))
        
        frequency_ratio = skill_frequency / len(similar_users)
        return 1.0 + (frequency_ratio * 0.3)  # Up to 30% bonus

    def generate_optimal_sequence(self, skill_gaps: List[Tuple[str, float]], 
                                user_profile: UserProfile) -> List[str]:
        """Generate optimal learning sequence considering prerequisites"""
        # Create subgraph with only gap skills
        gap_skills = [skill_id for skill_id, _ in skill_gaps]
        subgraph = self.skills_graph.subgraph(gap_skills)
        
        # Topological sort to respect prerequisites
        try:
            topo_order = list(nx.topological_sort(subgraph))
        except nx.NetworkXError:
            # Handle cycles by using priority order
            topo_order = [skill_id for skill_id, _ in skill_gaps]
        
        # Optimize sequence based on user constraints
        optimized_sequence = self._optimize_learning_sequence(
            topo_order, skill_gaps, user_profile
        )
        
        return optimized_sequence

    def _optimize_learning_sequence(self, base_sequence: List[str], 
                                  skill_gaps: List[Tuple[str, float]], 
                                  user_profile: UserProfile) -> List[str]:
        """Optimize sequence based on user preferences and constraints"""
        # Create priority mapping
        priority_map = dict(skill_gaps)
        
        # Group skills by difficulty and time commitment
        skill_groups = self._group_skills_by_difficulty(base_sequence)
        
        optimized = []
        
        # Interleave easy and hard skills based on user pace
        if user_profile.learning_pace == 'fast':
            # Fast learners can handle more challenging sequences
            for group in skill_groups['hard']:
                optimized.extend(group)
            for group in skill_groups['medium']:
                optimized.extend(group)
            for group in skill_groups['easy']:
                optimized.extend(group)
        else:
            # Slower learners benefit from easier skills first
            for group in skill_groups['easy']:
                optimized.extend(group)
            for group in skill_groups['medium']:
                optimized.extend(group)
            for group in skill_groups['hard']:
                optimized.extend(group)
        
        return optimized

    def _group_skills_by_difficulty(self, skills: List[str]) -> Dict[str, List[List[str]]]:
        """Group skills by difficulty level"""
        groups = {'easy': [], 'medium': [], 'hard': []}
        
        for skill_id in skills:
            skill = self.skills_db.get(skill_id)
            if not skill:
                continue
                
            if skill.difficulty <= 3:
                groups['easy'].append([skill_id])
            elif skill.difficulty <= 7:
                groups['medium'].append([skill_id])
            else:
                groups['hard'].append([skill_id])
        
        return groups

    def select_learning_resources(self, skill_id: str, user_profile: UserProfile) -> List[LearningResource]:
        """Select optimal learning resources for a skill"""
        available_resources = self.resources_db.get(skill_id, [])
        
        if not available_resources:
            return []
        
        # Filter by user preferences
        filtered_resources = []
        for resource in available_resources:
            # Budget constraint
            if resource.cost > user_profile.budget_monthly:
                continue
                
            # Format preference
            if (user_profile.preferred_formats and 
                resource.format not in user_profile.preferred_formats):
                continue
                
            # Skip already completed resources
            if resource.id in user_profile.completed_resources:
                continue
                
            filtered_resources.append(resource)
        
        # Score and rank resources
        scored_resources = []
        for resource in filtered_resources:
            score = self._score_learning_resource(resource, user_profile)
            scored_resources.append((resource, score))
        
        # Sort by score and return top resources
        scored_resources.sort(key=lambda x: x[1], reverse=True)
        return [resource for resource, _ in scored_resources[:3]]

    def _score_learning_resource(self, resource: LearningResource, user_profile: UserProfile) -> float:
        """Score a learning resource based on user profile"""
        score = resource.rating * 20  # Base score from rating
        
        # Duration preference (prefer resources matching user's time commitment)
        weekly_hours = user_profile.time_commitment_hours_week
        ideal_duration = weekly_hours * 4  # 4 weeks ideal
        duration_diff = abs(resource.duration_hours - ideal_duration)
        duration_score = max(0, 20 - (duration_diff / 5))
        
        # Cost efficiency
        if resource.cost > 0:
            cost_efficiency = (resource.rating * resource.duration_hours) / resource.cost
            cost_score = min(20, cost_efficiency * 2)
        else:
            cost_score = 25  # Bonus for free resources
        
        # Provider preference (could be learned from user history)
        provider_score = 10  # Default neutral score
        
        total_score = score + duration_score + cost_score + provider_score
        return total_score

    def generate_learning_path(self, user_profile: UserProfile) -> LearningPath:
        """Generate complete personalized learning path"""
        # Analyze skill gaps
        skill_gaps = self.analyze_skill_gaps(user_profile)
        
        if not skill_gaps:
            return self._create_empty_path(user_profile)
        
        # Generate optimal sequence
        optimal_sequence = self.generate_optimal_sequence(skill_gaps, user_profile)
        
        # Create learning path steps
        steps = []
        total_weeks = 0
        total_salary_increase = 0
        
        for skill_id in optimal_sequence:
            skill = self.skills_db[skill_id]
            resources = self.select_learning_resources(skill_id, user_profile)
            
            # Calculate time estimate
            estimated_weeks = max(1, skill.learning_time_hours // user_profile.time_commitment_hours_week)
            
            # Check prerequisites
            prereqs_met = all(
                user_profile.current_skills.get(prereq, 0) >= 5 
                for prereq in skill.prerequisites
            )
            
            # Create milestone description
            milestone_desc = f"Master {skill.name} fundamentals and apply in practical projects"
            
            step = LearningPathStep(
                skill=skill,
                resources=resources,
                estimated_weeks=estimated_weeks,
                priority_score=dict(skill_gaps).get(skill_id, 0),
                prerequisites_met=prereqs_met,
                milestone_description=milestone_desc
            )
            
            steps.append(step)
            total_weeks += estimated_weeks
            total_salary_increase += skill.salary_impact
        
        # Calculate confidence score
        confidence_score = self._calculate_path_confidence(steps, user_profile)
        
        # Create learning path
        path = LearningPath(
            user_id=user_profile.user_id,
            path_id=f"path_{user_profile.user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            title=f"Path to {user_profile.target_role}",
            description=f"Personalized learning journey to advance your career in {user_profile.target_role}",
            steps=steps,
            total_duration_weeks=total_weeks,
            estimated_salary_increase=total_salary_increase,
            confidence_score=confidence_score,
            created_at=datetime.now(),
            last_updated=datetime.now()
        )
        
        return path

    def _calculate_path_confidence(self, steps: List[LearningPathStep], user_profile: UserProfile) -> float:
        """Calculate confidence score for the learning path"""
        if not steps:
            return 0.0
        
        # Base confidence from resource availability
        resource_confidence = sum(1 for step in steps if step.resources) / len(steps)
        
        # Prerequisite confidence
        prereq_confidence = sum(1 for step in steps if step.prerequisites_met) / len(steps)
        
        # Time commitment realism
        total_hours = sum(step.skill.learning_time_hours for step in steps)
        weeks_needed = total_hours / user_profile.time_commitment_hours_week
        time_confidence = min(1.0, 52 / weeks_needed)  # Prefer paths under 1 year
        
        # Peer success confidence
        peer_confidence = 0.7  # Default moderate confidence
        
        overall_confidence = (resource_confidence * 0.3 + 
                            prereq_confidence * 0.3 + 
                            time_confidence * 0.2 + 
                            peer_confidence * 0.2)
        
        return min(1.0, overall_confidence)

    def _create_empty_path(self, user_profile: UserProfile) -> LearningPath:
        """Create empty path when no gaps found"""
        return LearningPath(
            user_id=user_profile.user_id,
            path_id=f"empty_{user_profile.user_id}",
            title="No Learning Gaps Identified",
            description="Your skills already meet the requirements for your target role!",
            steps=[],
            total_duration_weeks=0,
            estimated_salary_increase=0,
            confidence_score=1.0,
            created_at=datetime.now(),
            last_updated=datetime.now()
        )

    def adapt_path_based_on_progress(self, path: LearningPath, 
                                   completed_steps: List[str], 
                                   assessment_results: Dict[str, int]) -> LearningPath:
        """Adapt learning path based on user progress and assessment results"""
        # Update user skills based on completed steps and assessments
        updated_steps = []
        
        for step in path.steps:
            if step.skill.id in completed_steps:
                continue  # Skip completed steps
                
            # Adjust based on assessment results
            if step.skill.id in assessment_results:
                current_level = assessment_results[step.skill.id]
                if current_level >= 7:  # Proficient level
                    continue  # Skip this skill
                    
                # Adjust resources based on current level
                step.resources = self._adjust_resources_for_level(
                    step.resources, current_level
                )
            
            updated_steps.append(step)
        
        # Recalculate path metrics
        path.steps = updated_steps
        path.total_duration_weeks = sum(step.estimated_weeks for step in updated_steps)
        path.estimated_salary_increase = sum(step.skill.salary_impact for step in updated_steps)
        path.last_updated = datetime.now()
        
        return path

    def _adjust_resources_for_level(self, resources: List[LearningResource], 
                                  current_level: int) -> List[LearningResource]:
        """Adjust learning resources based on current skill level"""
        if current_level >= 5:  # Intermediate level
            # Filter out beginner resources
            return [r for r in resources if r.difficulty >= 5]
        elif current_level >= 3:  # Basic level
            # Focus on intermediate resources
            return [r for r in resources if 3 <= r.difficulty <= 7]
        else:
            # Keep beginner-friendly resources
            return [r for r in resources if r.difficulty <= 5]

# Service instance
learning_path_generator = LearningPathGenerator()
