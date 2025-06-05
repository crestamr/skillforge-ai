"""
Industry Sentiment Analysis API endpoints for SkillForge AI
Provides sentiment analysis for technologies, companies, and roles
"""

from typing import Any, List, Dict, Optional
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
import logging
from datetime import datetime

# Import with fallback for development
try:
    from app.services.sentiment_analysis_service import sentiment_pipeline
except ImportError:
    sentiment_pipeline = None

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class SentimentAnalysisRequest(BaseModel):
    text: str
    entities: List[str] = []

class SentimentAnalysisResponse(BaseModel):
    text: str
    sentiment_score: float = Field(..., ge=-1, le=1)
    confidence: float = Field(..., ge=0, le=1)
    entities_mentioned: List[str]
    analysis_timestamp: datetime

class TechnologyTrendRequest(BaseModel):
    technologies: List[str]
    time_period_days: int = 30
    include_predictions: bool = False

class TechnologyTrendResponse(BaseModel):
    technology: str
    current_sentiment: float
    sentiment_change_7d: float
    sentiment_change_30d: float
    volume_change_7d: float
    volume_change_30d: float
    trend_direction: str
    risk_level: str
    confidence_score: float
    opportunities: List[str]
    warnings: List[str]

class MarketIntelligenceResponse(BaseModel):
    report_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    trending_technologies: List[TechnologyTrendResponse]
    declining_technologies: List[TechnologyTrendResponse]
    emerging_opportunities: List[str]
    risk_alerts: List[str]
    confidence_metrics: Dict[str, float]

class SentimentHistoryResponse(BaseModel):
    entity: str
    entity_type: str
    data_points: List[Dict[str, Any]]
    summary_stats: Dict[str, float]

# Initialize sentiment pipeline on startup
@router.on_event("startup")
async def initialize_sentiment_pipeline():
    """Initialize the sentiment analysis pipeline"""
    if sentiment_pipeline:
        try:
            await sentiment_pipeline.initialize()
            logger.info("Sentiment analysis pipeline initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize sentiment pipeline: {e}")
    else:
        logger.warning("Sentiment pipeline not available - running in mock mode")

@router.on_event("shutdown")
async def cleanup_sentiment_pipeline():
    """Clean up sentiment analysis pipeline resources"""
    if sentiment_pipeline:
        try:
            await sentiment_pipeline.close()
            logger.info("Sentiment analysis pipeline cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up sentiment pipeline: {e}")

@router.post("/analyze-text", response_model=SentimentAnalysisResponse)
async def analyze_text_sentiment(request: SentimentAnalysisRequest):
    """Analyze sentiment of provided text with entity extraction"""
    try:
        if sentiment_pipeline:
            # Use real sentiment analysis pipeline
            sentiment_score, confidence = sentiment_pipeline.analyzer.analyze_text_sentiment(request.text)
            
            # Extract entities mentioned in the text
            entities_mentioned = sentiment_pipeline.analyzer.extract_entities(
                request.text, 
                sentiment_pipeline.entity_keywords
            )
            
            # Filter to requested entities if specified
            if request.entities:
                entities_mentioned = [e for e in entities_mentioned if e in request.entities]
        else:
            # Mock implementation for development
            text_lower = request.text.lower()
            
            # Basic keyword-based sentiment
            positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome']
            negative_words = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'sucks']
            
            positive_count = sum(1 for word in positive_words if word in text_lower)
            negative_count = sum(1 for word in negative_words if word in text_lower)
            
            if positive_count > negative_count:
                sentiment_score = min(0.8, positive_count * 0.2)
            elif negative_count > positive_count:
                sentiment_score = max(-0.8, -negative_count * 0.2)
            else:
                sentiment_score = 0.0
            
            confidence = 0.7
            
            # Mock entity detection
            entities_mentioned = []
            tech_keywords = {
                'react': 'React',
                'python': 'Python', 
                'javascript': 'JavaScript',
                'aws': 'AWS',
                'docker': 'Docker'
            }
            
            for keyword, entity in tech_keywords.items():
                if keyword in text_lower:
                    entities_mentioned.append(entity)
        
        return SentimentAnalysisResponse(
            text=request.text,
            sentiment_score=sentiment_score,
            confidence=confidence,
            entities_mentioned=entities_mentioned,
            analysis_timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sentiment analysis failed: {str(e)}"
        )

@router.get("/technology-trends", response_model=List[TechnologyTrendResponse])
async def get_technology_trends(
    technologies: str = "React,Python,JavaScript,AWS,Docker",
    background_tasks: BackgroundTasks = None
):
    """Get sentiment trends for specified technologies"""
    try:
        tech_list = [tech.strip() for tech in technologies.split(',')]
        
        if sentiment_pipeline:
            # Run analysis cycle for requested technologies
            market_intelligence = await sentiment_pipeline.run_analysis_cycle(tech_list)
            
            # Combine trending and declining technologies
            all_trends = market_intelligence.trending_technologies + market_intelligence.declining_technologies
            
            # Filter to requested technologies
            filtered_trends = [trend for trend in all_trends if trend.entity in tech_list]
            
            # Convert to response format
            trend_responses = []
            for trend in filtered_trends:
                trend_response = TechnologyTrendResponse(
                    technology=trend.entity,
                    current_sentiment=trend.current_sentiment,
                    sentiment_change_7d=trend.sentiment_change_7d,
                    sentiment_change_30d=trend.sentiment_change_30d,
                    volume_change_7d=trend.volume_change_7d,
                    volume_change_30d=trend.volume_change_30d,
                    trend_direction=trend.trend_direction,
                    risk_level=trend.risk_level,
                    confidence_score=trend.confidence_score,
                    opportunities=trend.opportunities,
                    warnings=trend.warnings
                )
                trend_responses.append(trend_response)
        else:
            # Mock trend data for development
            import random
            trend_responses = []
            
            for tech in tech_list:
                trend = TechnologyTrendResponse(
                    technology=tech,
                    current_sentiment=random.uniform(-0.5, 0.8),
                    sentiment_change_7d=random.uniform(-0.3, 0.3),
                    sentiment_change_30d=random.uniform(-0.5, 0.5),
                    volume_change_7d=random.uniform(-50, 100),
                    volume_change_30d=random.uniform(-50, 150),
                    trend_direction=random.choice(['rising', 'falling', 'stable']),
                    risk_level=random.choice(['low', 'medium', 'high']),
                    confidence_score=random.uniform(0.6, 0.9),
                    opportunities=[f"Growing demand for {tech} skills", f"{tech} adoption increasing"],
                    warnings=[f"Competition increasing in {tech}"] if random.random() > 0.7 else []
                )
                trend_responses.append(trend)
        
        logger.info(f"Retrieved trends for {len(trend_responses)} technologies")
        return trend_responses
        
    except Exception as e:
        logger.error(f"Technology trends analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Technology trends analysis failed: {str(e)}"
        )

@router.get("/market-intelligence", response_model=MarketIntelligenceResponse)
async def get_market_intelligence(entities: Optional[str] = None):
    """Get comprehensive market intelligence report"""
    try:
        if sentiment_pipeline:
            # Parse entities if provided
            entity_list = None
            if entities:
                entity_list = [e.strip() for e in entities.split(',')]
            
            # Run full analysis cycle
            market_intelligence = await sentiment_pipeline.run_analysis_cycle(entity_list)
            
            # Convert trend analyses to response format
            trending_tech_responses = []
            for trend in market_intelligence.trending_technologies:
                trend_response = TechnologyTrendResponse(
                    technology=trend.entity,
                    current_sentiment=trend.current_sentiment,
                    sentiment_change_7d=trend.sentiment_change_7d,
                    sentiment_change_30d=trend.sentiment_change_30d,
                    volume_change_7d=trend.volume_change_7d,
                    volume_change_30d=trend.volume_change_30d,
                    trend_direction=trend.trend_direction,
                    risk_level=trend.risk_level,
                    confidence_score=trend.confidence_score,
                    opportunities=trend.opportunities,
                    warnings=trend.warnings
                )
                trending_tech_responses.append(trend_response)
            
            declining_tech_responses = []
            for trend in market_intelligence.declining_technologies:
                trend_response = TechnologyTrendResponse(
                    technology=trend.entity,
                    current_sentiment=trend.current_sentiment,
                    sentiment_change_7d=trend.sentiment_change_7d,
                    sentiment_change_30d=trend.sentiment_change_30d,
                    volume_change_7d=trend.volume_change_7d,
                    volume_change_30d=trend.volume_change_30d,
                    trend_direction=trend.trend_direction,
                    risk_level=trend.risk_level,
                    confidence_score=trend.confidence_score,
                    opportunities=trend.opportunities,
                    warnings=trend.warnings
                )
                declining_tech_responses.append(trend_response)
            
            response = MarketIntelligenceResponse(
                report_id=market_intelligence.report_id,
                generated_at=market_intelligence.generated_at,
                period_start=market_intelligence.period_start,
                period_end=market_intelligence.period_end,
                trending_technologies=trending_tech_responses,
                declining_technologies=declining_tech_responses,
                emerging_opportunities=market_intelligence.emerging_opportunities,
                risk_alerts=market_intelligence.risk_alerts,
                confidence_metrics=market_intelligence.confidence_metrics
            )
        else:
            # Mock market intelligence report for development
            now = datetime.utcnow()
            response = MarketIntelligenceResponse(
                report_id=f"report_{now.strftime('%Y%m%d_%H%M%S')}",
                generated_at=now,
                period_start=now,
                period_end=now,
                trending_technologies=[],
                declining_technologies=[],
                emerging_opportunities=[
                    "AI/ML skills showing 40% sentiment increase",
                    "Cloud technologies in high demand",
                    "Remote work tools gaining traction"
                ],
                risk_alerts=[
                    "Legacy technology sentiment declining rapidly",
                    "Oversaturation in basic web development"
                ],
                confidence_metrics={
                    'overall_data_quality': 0.85,
                    'sample_size': 1250,
                    'source_diversity': 3,
                    'temporal_coverage_days': 30
                }
            )
        
        logger.info(f"Generated market intelligence report {response.report_id}")
        return response
        
    except Exception as e:
        logger.error(f"Market intelligence generation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Market intelligence generation failed: {str(e)}"
        )

@router.get("/entity-sentiment/{entity}", response_model=SentimentHistoryResponse)
async def get_entity_sentiment_history(entity: str, days: int = 30):
    """Get sentiment history for a specific entity"""
    try:
        # Mock implementation for development
        import random
        from datetime import timedelta
        
        now = datetime.utcnow()
        data_points = []
        
        for i in range(days):
            date = now - timedelta(days=i)
            sentiment = random.uniform(-0.8, 0.8)
            volume = random.randint(10, 100)
            
            data_points.append({
                'date': date.isoformat(),
                'sentiment_score': sentiment,
                'volume': volume,
                'confidence': random.uniform(0.6, 0.9)
            })
        
        summary_stats = {
            'avg_sentiment': sum(dp['sentiment_score'] for dp in data_points) / len(data_points),
            'max_sentiment': max(dp['sentiment_score'] for dp in data_points),
            'min_sentiment': min(dp['sentiment_score'] for dp in data_points),
            'total_volume': sum(dp['volume'] for dp in data_points),
            'avg_confidence': sum(dp['confidence'] for dp in data_points) / len(data_points)
        }
        
        return SentimentHistoryResponse(
            entity=entity,
            entity_type='technology',  # Could be determined dynamically
            data_points=data_points,
            summary_stats=summary_stats
        )
        
    except Exception as e:
        logger.error(f"Entity sentiment history retrieval failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Entity sentiment history retrieval failed: {str(e)}"
        )
