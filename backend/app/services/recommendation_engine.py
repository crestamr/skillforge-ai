"""
SkillForge AI - Advanced Recommendation Engine
Sophisticated recommendation system combining collaborative filtering, content-based approaches,
and machine learning for personalized learning and career recommendations
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import scipy.sparse as sp
from surprise import Dataset, Reader, SVD, NMF, accuracy
from surprise.model_selection import train_test_split as surprise_train_test_split
import redis
import boto3

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserSkill, UserInteraction, UserPreference
from app.models.learning import LearningContent, LearningPath, UserProgress
from app.models.job import Job, JobApplication, JobMatch
from app.models.skill import Skill, SkillCategory
from app.utils.cache import cache_manager
from app.utils.ml_utils import MLModelManager

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    LEARNING_CONTENT = "learning_content"
    SKILLS = "skills"
    JOBS = "jobs"
    CAREER_PATHS = "career_paths"
    LEARNING_PATHS = "learning_paths"

class RecommendationStrategy(Enum):
    COLLABORATIVE_FILTERING = "collaborative_filtering"
    CONTENT_BASED = "content_based"
    HYBRID = "hybrid"
    MATRIX_FACTORIZATION = "matrix_factorization"
    DEEP_LEARNING = "deep_learning"

@dataclass
class RecommendationRequest:
    """Recommendation request configuration"""
    user_id: int
    recommendation_type: RecommendationType
    strategy: RecommendationStrategy
    num_recommendations: int = 10
    filters: Dict[str, Any] = None
    context: Dict[str, Any] = None
    explanation_required: bool = True
    diversity_factor: float = 0.3
    novelty_factor: float = 0.2

@dataclass
class RecommendationResult:
    """Recommendation result with explanations"""
    item_id: int
    item_type: str
    score: float
    confidence: float
    explanation: str
    reasoning: List[str]
    metadata: Dict[str, Any]

class AdvancedRecommendationEngine:
    """Advanced recommendation engine with multiple algorithms and strategies"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        
        # ML models and components
        self.ml_manager = MLModelManager()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        self.svd_model = TruncatedSVD(n_components=100, random_state=42)
        self.surprise_models = {
            'svd': SVD(n_factors=100, random_state=42),
            'nmf': NMF(n_factors=50, random_state=42)
        }
        
        # Recommendation strategies
        self.strategies = {
            RecommendationStrategy.COLLABORATIVE_FILTERING: self._collaborative_filtering,
            RecommendationStrategy.CONTENT_BASED: self._content_based_filtering,
            RecommendationStrategy.HYBRID: self._hybrid_recommendation,
            RecommendationStrategy.MATRIX_FACTORIZATION: self._matrix_factorization,
        }
        
        # A/B testing framework
        self.ab_test_variants = {
            'default': {'strategy': RecommendationStrategy.HYBRID, 'weight': 0.5},
            'collaborative': {'strategy': RecommendationStrategy.COLLABORATIVE_FILTERING, 'weight': 0.25},
            'content': {'strategy': RecommendationStrategy.CONTENT_BASED, 'weight': 0.25}
        }
        
        # User interaction tracking
        self.interaction_weights = {
            'view': 1.0,
            'like': 2.0,
            'bookmark': 3.0,
            'complete': 5.0,
            'share': 2.5,
            'rate': 4.0,
            'apply': 6.0  # For job applications
        }
        
        # Time decay factors
        self.time_decay_factor = 0.95  # Daily decay
        self.trend_boost_factor = 1.2  # Boost for trending content
        
        # Cold start handling
        self.cold_start_strategies = {
            'new_user': self._handle_new_user_cold_start,
            'new_item': self._handle_new_item_cold_start,
            'sparse_data': self._handle_sparse_data_cold_start
        }
    
    async def get_recommendations(
        self,
        request: RecommendationRequest,
        db_session = None
    ) -> List[RecommendationResult]:
        """Get personalized recommendations based on request configuration"""
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            cached_recommendations = await cache_manager.get(f"recommendations:{cache_key}")
            
            if cached_recommendations:
                logger.info(f"Returning cached recommendations for user {request.user_id}")
                return [RecommendationResult(**rec) for rec in cached_recommendations]
            
            # Determine A/B test variant
            variant = await self._get_ab_test_variant(request.user_id)
            if variant != 'default':
                request.strategy = self.ab_test_variants[variant]['strategy']
            
            # Check for cold start scenarios
            cold_start_type = await self._detect_cold_start(request.user_id, db_session)
            if cold_start_type:
                recommendations = await self.cold_start_strategies[cold_start_type](request, db_session)
            else:
                # Use specified strategy
                strategy_func = self.strategies.get(request.strategy, self._hybrid_recommendation)
                recommendations = await strategy_func(request, db_session)
            
            # Apply diversity and novelty filters
            recommendations = await self._apply_diversity_filter(recommendations, request.diversity_factor)
            recommendations = await self._apply_novelty_filter(recommendations, request.novelty_factor, request.user_id)
            
            # Apply business rules and filters
            recommendations = await self._apply_business_rules(recommendations, request)
            
            # Limit to requested number
            recommendations = recommendations[:request.num_recommendations]
            
            # Generate explanations if required
            if request.explanation_required:
                recommendations = await self._generate_explanations(recommendations, request)
            
            # Cache results
            cache_data = [rec.__dict__ for rec in recommendations]
            await cache_manager.set(f"recommendations:{cache_key}", cache_data, ttl=3600)
            
            # Log recommendation event for analytics
            await self._log_recommendation_event(request, recommendations, variant)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            # Fallback to popular items
            return await self._get_fallback_recommendations(request, db_session)
    
    async def _collaborative_filtering(
        self,
        request: RecommendationRequest,
        db_session
    ) -> List[RecommendationResult]:
        """Collaborative filtering using user-item interactions"""
        
        # Get user interaction matrix
        interaction_matrix = await self._build_interaction_matrix(request.recommendation_type, db_session)
        
        if interaction_matrix is None or interaction_matrix.shape[0] == 0:
            return await self._get_fallback_recommendations(request, db_session)
        
        # Find similar users
        user_similarities = await self._calculate_user_similarities(request.user_id, interaction_matrix)
        
        # Get recommendations based on similar users
        recommendations = []
        similar_users = user_similarities.argsort()[-50:][::-1]  # Top 50 similar users
        
        for similar_user_idx in similar_users:
            if similar_user_idx == request.user_id:
                continue
                
            similarity_score = user_similarities[similar_user_idx]
            if similarity_score < 0.1:  # Minimum similarity threshold
                continue
            
            # Get items liked by similar user but not by current user
            similar_user_items = await self._get_user_items(similar_user_idx, request.recommendation_type, db_session)
            current_user_items = await self._get_user_items(request.user_id, request.recommendation_type, db_session)
            
            candidate_items = set(similar_user_items) - set(current_user_items)
            
            for item_id in candidate_items:
                item_score = similarity_score * await self._get_user_item_rating(similar_user_idx, item_id, db_session)
                
                recommendations.append(RecommendationResult(
                    item_id=item_id,
                    item_type=request.recommendation_type.value,
                    score=item_score,
                    confidence=similarity_score,
                    explanation=f"Users similar to you also liked this",
                    reasoning=[f"Based on {len(similar_users)} similar users"],
                    metadata={'strategy': 'collaborative_filtering', 'similarity': similarity_score}
                ))
        
        # Sort by score and remove duplicates
        recommendations = sorted(recommendations, key=lambda x: x.score, reverse=True)
        seen_items = set()
        unique_recommendations = []
        
        for rec in recommendations:
            if rec.item_id not in seen_items:
                seen_items.add(rec.item_id)
                unique_recommendations.append(rec)
        
        return unique_recommendations
    
    async def _content_based_filtering(
        self,
        request: RecommendationRequest,
        db_session
    ) -> List[RecommendationResult]:
        """Content-based filtering using item features"""
        
        # Get user profile and preferences
        user_profile = await self._build_user_profile(request.user_id, db_session)
        
        # Get item features
        item_features = await self._get_item_features(request.recommendation_type, db_session)
        
        if not item_features or not user_profile:
            return await self._get_fallback_recommendations(request, db_session)
        
        # Calculate content similarity
        recommendations = []
        
        for item_id, features in item_features.items():
            # Skip items user has already interacted with
            if await self._user_has_interacted(request.user_id, item_id, db_session):
                continue
            
            # Calculate similarity score
            similarity_score = await self._calculate_content_similarity(user_profile, features)
            
            # Apply time-based boosting for trending content
            time_boost = await self._calculate_time_boost(item_id, request.recommendation_type)
            final_score = similarity_score * time_boost
            
            recommendations.append(RecommendationResult(
                item_id=item_id,
                item_type=request.recommendation_type.value,
                score=final_score,
                confidence=similarity_score,
                explanation=f"Matches your interests in {', '.join(features.get('categories', []))}",
                reasoning=[f"Based on your profile preferences"],
                metadata={'strategy': 'content_based', 'time_boost': time_boost}
            ))
        
        return sorted(recommendations, key=lambda x: x.score, reverse=True)
    
    async def _hybrid_recommendation(
        self,
        request: RecommendationRequest,
        db_session
    ) -> List[RecommendationResult]:
        """Hybrid approach combining collaborative and content-based filtering"""
        
        # Get recommendations from both strategies
        collaborative_recs = await self._collaborative_filtering(request, db_session)
        content_recs = await self._content_based_filtering(request, db_session)
        
        # Combine recommendations with weighted scoring
        collaborative_weight = 0.6
        content_weight = 0.4
        
        # Create item score dictionary
        item_scores = {}
        
        # Add collaborative filtering scores
        for rec in collaborative_recs:
            item_scores[rec.item_id] = {
                'collaborative_score': rec.score * collaborative_weight,
                'content_score': 0,
                'collaborative_confidence': rec.confidence,
                'content_confidence': 0,
                'collaborative_reasoning': rec.reasoning,
                'content_reasoning': []
            }
        
        # Add content-based scores
        for rec in content_recs:
            if rec.item_id in item_scores:
                item_scores[rec.item_id]['content_score'] = rec.score * content_weight
                item_scores[rec.item_id]['content_confidence'] = rec.confidence
                item_scores[rec.item_id]['content_reasoning'] = rec.reasoning
            else:
                item_scores[rec.item_id] = {
                    'collaborative_score': 0,
                    'content_score': rec.score * content_weight,
                    'collaborative_confidence': 0,
                    'content_confidence': rec.confidence,
                    'collaborative_reasoning': [],
                    'content_reasoning': rec.reasoning
                }
        
        # Create hybrid recommendations
        hybrid_recommendations = []
        
        for item_id, scores in item_scores.items():
            final_score = scores['collaborative_score'] + scores['content_score']
            avg_confidence = (scores['collaborative_confidence'] + scores['content_confidence']) / 2
            
            combined_reasoning = scores['collaborative_reasoning'] + scores['content_reasoning']
            
            hybrid_recommendations.append(RecommendationResult(
                item_id=item_id,
                item_type=request.recommendation_type.value,
                score=final_score,
                confidence=avg_confidence,
                explanation="Recommended based on similar users and your interests",
                reasoning=combined_reasoning,
                metadata={
                    'strategy': 'hybrid',
                    'collaborative_score': scores['collaborative_score'],
                    'content_score': scores['content_score']
                }
            ))
        
        return sorted(hybrid_recommendations, key=lambda x: x.score, reverse=True)
    
    async def _matrix_factorization(
        self,
        request: RecommendationRequest,
        db_session
    ) -> List[RecommendationResult]:
        """Matrix factorization using SVD for recommendations"""
        
        # Build user-item rating matrix
        rating_data = await self._build_rating_matrix(request.recommendation_type, db_session)
        
        if not rating_data:
            return await self._get_fallback_recommendations(request, db_session)
        
        # Create Surprise dataset
        reader = Reader(rating_scale=(1, 5))
        dataset = Dataset.load_from_df(rating_data[['user_id', 'item_id', 'rating']], reader)
        
        # Train SVD model
        trainset, testset = surprise_train_test_split(dataset, test_size=0.2, random_state=42)
        svd_model = self.surprise_models['svd']
        svd_model.fit(trainset)
        
        # Get all items
        all_items = rating_data['item_id'].unique()
        user_items = rating_data[rating_data['user_id'] == request.user_id]['item_id'].values
        candidate_items = [item for item in all_items if item not in user_items]
        
        # Generate predictions
        recommendations = []
        
        for item_id in candidate_items:
            prediction = svd_model.predict(request.user_id, item_id)
            
            recommendations.append(RecommendationResult(
                item_id=item_id,
                item_type=request.recommendation_type.value,
                score=prediction.est,
                confidence=1.0 - abs(prediction.est - 3.0) / 2.0,  # Confidence based on distance from neutral
                explanation="Predicted based on your rating patterns",
                reasoning=["Matrix factorization analysis"],
                metadata={'strategy': 'matrix_factorization', 'prediction_details': prediction.details}
            ))
        
        return sorted(recommendations, key=lambda x: x.score, reverse=True)
    
    async def _apply_diversity_filter(
        self,
        recommendations: List[RecommendationResult],
        diversity_factor: float
    ) -> List[RecommendationResult]:
        """Apply diversity filter to avoid too similar recommendations"""
        
        if diversity_factor == 0 or len(recommendations) <= 1:
            return recommendations
        
        # Group recommendations by category/type
        category_groups = {}
        for rec in recommendations:
            category = rec.metadata.get('category', 'unknown')
            if category not in category_groups:
                category_groups[category] = []
            category_groups[category].append(rec)
        
        # Select diverse recommendations
        diverse_recommendations = []
        max_per_category = max(1, int(len(recommendations) * diversity_factor))
        
        # Round-robin selection from categories
        category_iterators = {cat: iter(recs) for cat, recs in category_groups.items()}
        
        while len(diverse_recommendations) < len(recommendations) and category_iterators:
            for category in list(category_iterators.keys()):
                try:
                    rec = next(category_iterators[category])
                    diverse_recommendations.append(rec)
                    
                    if len(diverse_recommendations) >= len(recommendations):
                        break
                except StopIteration:
                    del category_iterators[category]
        
        return diverse_recommendations
    
    async def _apply_novelty_filter(
        self,
        recommendations: List[RecommendationResult],
        novelty_factor: float,
        user_id: int
    ) -> List[RecommendationResult]:
        """Apply novelty filter to include some unexpected recommendations"""
        
        if novelty_factor == 0:
            return recommendations
        
        # Calculate novelty scores based on popularity
        for rec in recommendations:
            popularity = await self._get_item_popularity(rec.item_id)
            novelty_score = 1.0 / (1.0 + popularity)  # Less popular = more novel
            
            # Boost score for novel items
            rec.score = rec.score * (1.0 + novelty_factor * novelty_score)
            rec.metadata['novelty_score'] = novelty_score
        
        return sorted(recommendations, key=lambda x: x.score, reverse=True)
    
    async def _generate_explanations(
        self,
        recommendations: List[RecommendationResult],
        request: RecommendationRequest
    ) -> List[RecommendationResult]:
        """Generate detailed explanations for recommendations"""
        
        for rec in recommendations:
            # Enhance explanation based on strategy and metadata
            strategy = rec.metadata.get('strategy', 'unknown')
            
            if strategy == 'collaborative_filtering':
                rec.explanation = f"Users with similar interests also engaged with this {rec.item_type}"
            elif strategy == 'content_based':
                categories = rec.metadata.get('categories', [])
                if categories:
                    rec.explanation = f"Matches your interest in {', '.join(categories[:2])}"
            elif strategy == 'hybrid':
                rec.explanation = "Recommended based on both similar users and your preferences"
            
            # Add confidence indicator
            confidence_level = "high" if rec.confidence > 0.8 else "medium" if rec.confidence > 0.5 else "low"
            rec.explanation += f" (confidence: {confidence_level})"
        
        return recommendations
    
    async def track_interaction(
        self,
        user_id: int,
        item_id: int,
        item_type: str,
        interaction_type: str,
        context: Dict[str, Any] = None
    ):
        """Track user interaction for improving recommendations"""
        
        try:
            # Calculate interaction weight
            weight = self.interaction_weights.get(interaction_type, 1.0)
            
            # Store interaction
            interaction_data = {
                'user_id': user_id,
                'item_id': item_id,
                'item_type': item_type,
                'interaction_type': interaction_type,
                'weight': weight,
                'timestamp': datetime.utcnow().isoformat(),
                'context': context or {}
            }
            
            # Store in Redis for real-time updates
            await self.redis_client.lpush(
                f"interactions:{user_id}",
                json.dumps(interaction_data)
            )
            
            # Update user profile incrementally
            await self._update_user_profile_incremental(user_id, interaction_data)
            
            # Invalidate relevant caches
            await self._invalidate_user_caches(user_id)
            
        except Exception as e:
            logger.error(f"Failed to track interaction: {e}")
    
    async def evaluate_recommendations(
        self,
        test_data: List[Dict[str, Any]],
        strategy: RecommendationStrategy
    ) -> Dict[str, float]:
        """Evaluate recommendation quality using offline metrics"""
        
        try:
            # Metrics to calculate
            metrics = {
                'precision_at_k': [],
                'recall_at_k': [],
                'ndcg_at_k': [],
                'diversity': [],
                'novelty': [],
                'coverage': []
            }
            
            for test_case in test_data:
                user_id = test_case['user_id']
                actual_items = set(test_case['actual_items'])
                
                # Generate recommendations
                request = RecommendationRequest(
                    user_id=user_id,
                    recommendation_type=RecommendationType(test_case['type']),
                    strategy=strategy,
                    num_recommendations=10
                )
                
                recommendations = await self.get_recommendations(request)
                recommended_items = set([rec.item_id for rec in recommendations])
                
                # Calculate metrics
                precision = len(actual_items & recommended_items) / len(recommended_items) if recommended_items else 0
                recall = len(actual_items & recommended_items) / len(actual_items) if actual_items else 0
                
                metrics['precision_at_k'].append(precision)
                metrics['recall_at_k'].append(recall)
                
                # Calculate NDCG (simplified)
                ndcg = await self._calculate_ndcg(recommendations, actual_items)
                metrics['ndcg_at_k'].append(ndcg)
            
            # Average metrics
            return {
                metric: np.mean(values) for metric, values in metrics.items()
            }
            
        except Exception as e:
            logger.error(f"Failed to evaluate recommendations: {e}")
            return {}
    
    # Helper methods (implementation details)
    async def _build_interaction_matrix(self, recommendation_type: RecommendationType, db_session):
        """Build user-item interaction matrix"""
        # Implementation would query database and build matrix
        pass
    
    async def _calculate_user_similarities(self, user_id: int, interaction_matrix):
        """Calculate user similarities using cosine similarity"""
        # Implementation would calculate similarities
        pass
    
    async def _get_fallback_recommendations(self, request: RecommendationRequest, db_session):
        """Get fallback recommendations (popular items)"""
        # Implementation would return popular items
        pass
    
    def _generate_cache_key(self, request: RecommendationRequest) -> str:
        """Generate cache key for recommendation request"""
        import hashlib
        key_data = f"{request.user_id}:{request.recommendation_type.value}:{request.strategy.value}:{request.num_recommendations}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    # Additional helper methods would be implemented here...

# Initialize global recommendation engine
recommendation_engine = AdvancedRecommendationEngine()
