"""
SkillForge AI - Comprehensive Analytics System
Advanced analytics for user engagement, learning outcomes, and business intelligence
"""

import asyncio
import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import pandas as pd
import numpy as np
from sqlalchemy import func, and_, or_, text
from sqlalchemy.orm import Session
import redis
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder

from app.core.database import get_db
from app.models.user import User, UserSession, UserInteraction
from app.models.learning import LearningProgress, Assessment, AssessmentResult
from app.models.job import Job, JobApplication
from app.models.skill import UserSkill
from app.utils.cache import cache_manager

logger = logging.getLogger(__name__)

class MetricType(Enum):
    ENGAGEMENT = "engagement"
    LEARNING = "learning"
    CONVERSION = "conversion"
    RETENTION = "retention"
    BUSINESS = "business"

class TimeGranularity(Enum):
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

@dataclass
class AnalyticsQuery:
    """Analytics query configuration"""
    metric_type: MetricType
    start_date: datetime
    end_date: datetime
    granularity: TimeGranularity
    filters: Dict[str, Any] = None
    segments: List[str] = None
    cohort_analysis: bool = False

@dataclass
class MetricResult:
    """Analytics metric result"""
    name: str
    value: float
    change_percentage: Optional[float]
    trend: str  # 'up', 'down', 'stable'
    timestamp: datetime
    metadata: Dict[str, Any] = None

class ComprehensiveAnalyticsSystem:
    """Advanced analytics system for comprehensive business intelligence"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        
        # Metric definitions
        self.metrics_config = {
            MetricType.ENGAGEMENT: {
                'dau': self._calculate_daily_active_users,
                'mau': self._calculate_monthly_active_users,
                'session_length': self._calculate_avg_session_length,
                'feature_usage': self._calculate_feature_usage,
                'page_views': self._calculate_page_views,
                'bounce_rate': self._calculate_bounce_rate,
            },
            MetricType.LEARNING: {
                'completion_rate': self._calculate_completion_rate,
                'skill_improvement': self._calculate_skill_improvement,
                'assessment_scores': self._calculate_assessment_scores,
                'learning_time': self._calculate_learning_time,
                'content_effectiveness': self._calculate_content_effectiveness,
            },
            MetricType.CONVERSION: {
                'registration_rate': self._calculate_registration_rate,
                'activation_rate': self._calculate_activation_rate,
                'subscription_rate': self._calculate_subscription_rate,
                'trial_conversion': self._calculate_trial_conversion,
                'funnel_analysis': self._calculate_funnel_analysis,
            },
            MetricType.RETENTION: {
                'user_retention': self._calculate_user_retention,
                'churn_rate': self._calculate_churn_rate,
                'cohort_retention': self._calculate_cohort_retention,
                'ltv': self._calculate_lifetime_value,
            },
            MetricType.BUSINESS: {
                'revenue': self._calculate_revenue,
                'arpu': self._calculate_arpu,
                'job_success_rate': self._calculate_job_success_rate,
                'customer_satisfaction': self._calculate_customer_satisfaction,
            }
        }
        
        # User segments
        self.user_segments = {
            'new_users': lambda days: f"created_at >= NOW() - INTERVAL '{days} days'",
            'active_learners': "last_learning_activity >= NOW() - INTERVAL '7 days'",
            'job_seekers': "is_job_seeking = true",
            'premium_users': "subscription_tier != 'free'",
            'enterprise_users': "organization_id IS NOT NULL",
        }
    
    async def get_analytics_dashboard(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> Dict[str, Any]:
        """Get comprehensive analytics dashboard data"""
        
        try:
            # Check cache first
            cache_key = self._generate_cache_key(query)
            cached_data = await cache_manager.get(f"analytics:{cache_key}")
            
            if cached_data:
                return cached_data
            
            # Calculate metrics
            metrics = await self._calculate_metrics(query, db)
            
            # Generate visualizations
            charts = await self._generate_charts(query, metrics, db)
            
            # Calculate insights
            insights = await self._generate_insights(metrics, db)
            
            # Perform cohort analysis if requested
            cohort_data = None
            if query.cohort_analysis:
                cohort_data = await self._perform_cohort_analysis(query, db)
            
            dashboard_data = {
                'metrics': metrics,
                'charts': charts,
                'insights': insights,
                'cohort_analysis': cohort_data,
                'generated_at': datetime.utcnow().isoformat(),
                'query_params': {
                    'metric_type': query.metric_type.value,
                    'start_date': query.start_date.isoformat(),
                    'end_date': query.end_date.isoformat(),
                    'granularity': query.granularity.value,
                }
            }
            
            # Cache results
            await cache_manager.set(
                f"analytics:{cache_key}",
                dashboard_data,
                ttl=3600  # 1 hour cache
            )
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Analytics dashboard generation failed: {e}")
            raise
    
    async def _calculate_metrics(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> List[MetricResult]:
        """Calculate all metrics for the given query"""
        
        metrics = []
        metric_functions = self.metrics_config.get(query.metric_type, {})
        
        for metric_name, metric_func in metric_functions.items():
            try:
                result = await metric_func(query, db)
                metrics.append(result)
            except Exception as e:
                logger.error(f"Failed to calculate metric {metric_name}: {e}")
                # Add placeholder metric with error
                metrics.append(MetricResult(
                    name=metric_name,
                    value=0,
                    change_percentage=None,
                    trend='stable',
                    timestamp=datetime.utcnow(),
                    metadata={'error': str(e)}
                ))
        
        return metrics
    
    async def _calculate_daily_active_users(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> MetricResult:
        """Calculate Daily Active Users"""
        
        # Current period DAU
        current_dau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at >= query.start_date,
                UserSession.created_at <= query.end_date
            )
        ).scalar()
        
        # Previous period for comparison
        period_length = query.end_date - query.start_date
        prev_start = query.start_date - period_length
        prev_end = query.start_date
        
        prev_dau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at >= prev_start,
                UserSession.created_at <= prev_end
            )
        ).scalar()
        
        # Calculate change percentage
        change_pct = ((current_dau - prev_dau) / prev_dau * 100) if prev_dau > 0 else 0
        trend = 'up' if change_pct > 5 else 'down' if change_pct < -5 else 'stable'
        
        return MetricResult(
            name='daily_active_users',
            value=current_dau,
            change_percentage=change_pct,
            trend=trend,
            timestamp=datetime.utcnow(),
            metadata={
                'previous_value': prev_dau,
                'period_days': (query.end_date - query.start_date).days
            }
        )
    
    async def _calculate_monthly_active_users(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> MetricResult:
        """Calculate Monthly Active Users"""
        
        # Get MAU for the last 30 days from end_date
        mau_start = query.end_date - timedelta(days=30)
        
        current_mau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at >= mau_start,
                UserSession.created_at <= query.end_date
            )
        ).scalar()
        
        # Previous month MAU
        prev_mau_start = mau_start - timedelta(days=30)
        prev_mau_end = mau_start
        
        prev_mau = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at >= prev_mau_start,
                UserSession.created_at <= prev_mau_end
            )
        ).scalar()
        
        change_pct = ((current_mau - prev_mau) / prev_mau * 100) if prev_mau > 0 else 0
        trend = 'up' if change_pct > 5 else 'down' if change_pct < -5 else 'stable'
        
        return MetricResult(
            name='monthly_active_users',
            value=current_mau,
            change_percentage=change_pct,
            trend=trend,
            timestamp=datetime.utcnow(),
            metadata={'previous_value': prev_mau}
        )
    
    async def _calculate_completion_rate(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> MetricResult:
        """Calculate learning content completion rate"""
        
        # Get completion data
        total_started = db.query(func.count(LearningProgress.id)).filter(
            and_(
                LearningProgress.started_at >= query.start_date,
                LearningProgress.started_at <= query.end_date
            )
        ).scalar()
        
        total_completed = db.query(func.count(LearningProgress.id)).filter(
            and_(
                LearningProgress.started_at >= query.start_date,
                LearningProgress.started_at <= query.end_date,
                LearningProgress.completed_at.isnot(None)
            )
        ).scalar()
        
        completion_rate = (total_completed / total_started * 100) if total_started > 0 else 0
        
        # Previous period comparison
        period_length = query.end_date - query.start_date
        prev_start = query.start_date - period_length
        prev_end = query.start_date
        
        prev_started = db.query(func.count(LearningProgress.id)).filter(
            and_(
                LearningProgress.started_at >= prev_start,
                LearningProgress.started_at <= prev_end
            )
        ).scalar()
        
        prev_completed = db.query(func.count(LearningProgress.id)).filter(
            and_(
                LearningProgress.started_at >= prev_start,
                LearningProgress.started_at <= prev_end,
                LearningProgress.completed_at.isnot(None)
            )
        ).scalar()
        
        prev_completion_rate = (prev_completed / prev_started * 100) if prev_started > 0 else 0
        change_pct = completion_rate - prev_completion_rate
        trend = 'up' if change_pct > 2 else 'down' if change_pct < -2 else 'stable'
        
        return MetricResult(
            name='completion_rate',
            value=completion_rate,
            change_percentage=change_pct,
            trend=trend,
            timestamp=datetime.utcnow(),
            metadata={
                'total_started': total_started,
                'total_completed': total_completed,
                'previous_rate': prev_completion_rate
            }
        )
    
    async def _calculate_churn_rate(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> MetricResult:
        """Calculate user churn rate"""
        
        # Define churn as no activity in last 30 days
        churn_threshold = query.end_date - timedelta(days=30)
        
        # Users who were active before the churn threshold
        active_users_start = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            UserSession.created_at < churn_threshold
        ).scalar()
        
        # Users who remained active (had activity after churn threshold)
        retained_users = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at < churn_threshold,
                UserSession.user_id.in_(
                    db.query(UserSession.user_id).filter(
                        UserSession.created_at >= churn_threshold
                    ).distinct()
                )
            )
        ).scalar()
        
        churned_users = active_users_start - retained_users
        churn_rate = (churned_users / active_users_start * 100) if active_users_start > 0 else 0
        
        # Previous period comparison
        prev_churn_threshold = churn_threshold - timedelta(days=30)
        prev_active_start = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            UserSession.created_at < prev_churn_threshold
        ).scalar()
        
        prev_retained = db.query(func.count(func.distinct(UserSession.user_id))).filter(
            and_(
                UserSession.created_at < prev_churn_threshold,
                UserSession.user_id.in_(
                    db.query(UserSession.user_id).filter(
                        and_(
                            UserSession.created_at >= prev_churn_threshold,
                            UserSession.created_at < churn_threshold
                        )
                    ).distinct()
                )
            )
        ).scalar()
        
        prev_churn_rate = ((prev_active_start - prev_retained) / prev_active_start * 100) if prev_active_start > 0 else 0
        change_pct = churn_rate - prev_churn_rate
        trend = 'down' if change_pct > 2 else 'up' if change_pct < -2 else 'stable'  # Lower churn is better
        
        return MetricResult(
            name='churn_rate',
            value=churn_rate,
            change_percentage=change_pct,
            trend=trend,
            timestamp=datetime.utcnow(),
            metadata={
                'churned_users': churned_users,
                'active_users_start': active_users_start,
                'retained_users': retained_users
            }
        )
    
    async def _perform_cohort_analysis(
        self,
        query: AnalyticsQuery,
        db: Session
    ) -> Dict[str, Any]:
        """Perform cohort retention analysis"""
        
        try:
            # Get user registration cohorts by month
            cohort_query = text("""
                WITH user_cohorts AS (
                    SELECT 
                        user_id,
                        DATE_TRUNC('month', created_at) as cohort_month
                    FROM users
                    WHERE created_at >= :start_date AND created_at <= :end_date
                ),
                user_activities AS (
                    SELECT 
                        us.user_id,
                        uc.cohort_month,
                        DATE_TRUNC('month', us.created_at) as activity_month,
                        ROW_NUMBER() OVER (PARTITION BY us.user_id, DATE_TRUNC('month', us.created_at) ORDER BY us.created_at) as rn
                    FROM user_sessions us
                    JOIN user_cohorts uc ON us.user_id = uc.user_id
                    WHERE us.created_at >= :start_date
                ),
                cohort_data AS (
                    SELECT 
                        cohort_month,
                        activity_month,
                        COUNT(DISTINCT user_id) as active_users,
                        EXTRACT(MONTH FROM AGE(activity_month, cohort_month)) as period_number
                    FROM user_activities
                    WHERE rn = 1
                    GROUP BY cohort_month, activity_month
                ),
                cohort_sizes AS (
                    SELECT 
                        cohort_month,
                        COUNT(DISTINCT user_id) as cohort_size
                    FROM user_cohorts
                    GROUP BY cohort_month
                )
                SELECT 
                    cd.cohort_month,
                    cd.period_number,
                    cd.active_users,
                    cs.cohort_size,
                    ROUND(cd.active_users::numeric / cs.cohort_size * 100, 2) as retention_rate
                FROM cohort_data cd
                JOIN cohort_sizes cs ON cd.cohort_month = cs.cohort_month
                ORDER BY cd.cohort_month, cd.period_number
            """)
            
            result = db.execute(cohort_query, {
                'start_date': query.start_date,
                'end_date': query.end_date
            })
            
            cohort_data = []
            for row in result:
                cohort_data.append({
                    'cohort_month': row.cohort_month.isoformat(),
                    'period_number': int(row.period_number),
                    'active_users': row.active_users,
                    'cohort_size': row.cohort_size,
                    'retention_rate': float(row.retention_rate)
                })
            
            return {
                'cohort_table': cohort_data,
                'analysis_period': {
                    'start': query.start_date.isoformat(),
                    'end': query.end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Cohort analysis failed: {e}")
            return {'error': str(e)}
    
    async def _generate_charts(
        self,
        query: AnalyticsQuery,
        metrics: List[MetricResult],
        db: Session
    ) -> Dict[str, Any]:
        """Generate visualization charts for metrics"""
        
        charts = {}
        
        try:
            # Time series chart for main metrics
            if query.metric_type == MetricType.ENGAGEMENT:
                charts['engagement_trend'] = await self._create_engagement_trend_chart(query, db)
            elif query.metric_type == MetricType.LEARNING:
                charts['learning_progress'] = await self._create_learning_progress_chart(query, db)
            elif query.metric_type == MetricType.CONVERSION:
                charts['conversion_funnel'] = await self._create_conversion_funnel_chart(query, db)
            
            # Metrics summary chart
            charts['metrics_summary'] = self._create_metrics_summary_chart(metrics)
            
        except Exception as e:
            logger.error(f"Chart generation failed: {e}")
            charts['error'] = str(e)
        
        return charts
    
    async def _generate_insights(
        self,
        metrics: List[MetricResult],
        db: Session
    ) -> List[Dict[str, Any]]:
        """Generate actionable insights from metrics"""
        
        insights = []
        
        try:
            # Analyze metric trends
            for metric in metrics:
                if metric.change_percentage is not None:
                    if abs(metric.change_percentage) > 10:
                        insight_type = 'significant_change'
                        severity = 'high' if abs(metric.change_percentage) > 25 else 'medium'
                        
                        insights.append({
                            'type': insight_type,
                            'severity': severity,
                            'metric': metric.name,
                            'message': f"{metric.name.replace('_', ' ').title()} has {'increased' if metric.change_percentage > 0 else 'decreased'} by {abs(metric.change_percentage):.1f}%",
                            'recommendation': self._get_metric_recommendation(metric),
                            'timestamp': datetime.utcnow().isoformat()
                        })
            
            # Add predictive insights
            predictive_insights = await self._generate_predictive_insights(db)
            insights.extend(predictive_insights)
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            insights.append({
                'type': 'error',
                'severity': 'low',
                'message': f"Failed to generate insights: {str(e)}",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return insights
    
    def _get_metric_recommendation(self, metric: MetricResult) -> str:
        """Get recommendation based on metric performance"""
        
        recommendations = {
            'daily_active_users': {
                'down': 'Consider implementing user re-engagement campaigns and improving onboarding flow',
                'up': 'Great! Continue current user acquisition strategies and monitor retention'
            },
            'completion_rate': {
                'down': 'Review content difficulty and consider adding more interactive elements',
                'up': 'Excellent! Consider expanding successful content formats'
            },
            'churn_rate': {
                'up': 'Implement user retention strategies and analyze exit surveys',
                'down': 'Good progress! Continue focusing on user satisfaction'
            }
        }
        
        metric_recs = recommendations.get(metric.name, {})
        return metric_recs.get(metric.trend, 'Monitor this metric closely for trends')
    
    def _generate_cache_key(self, query: AnalyticsQuery) -> str:
        """Generate cache key for analytics query"""
        import hashlib
        
        key_data = f"{query.metric_type.value}:{query.start_date}:{query.end_date}:{query.granularity.value}"
        if query.filters:
            key_data += f":{json.dumps(query.filters, sort_keys=True)}"
        
        return hashlib.md5(key_data.encode()).hexdigest()
    
    # Additional metric calculation methods would be implemented here...
    async def _calculate_avg_session_length(self, query: AnalyticsQuery, db: Session) -> MetricResult:
        """Calculate average session length"""
        # Implementation placeholder
        return MetricResult(
            name='avg_session_length',
            value=0,
            change_percentage=0,
            trend='stable',
            timestamp=datetime.utcnow()
        )
    
    # Additional helper methods would be implemented here...

# Initialize global analytics system
analytics_system = ComprehensiveAnalyticsSystem()
