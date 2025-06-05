"""
Comprehensive Industry Sentiment Analysis Pipeline
Analyzes sentiment around technologies, companies, and roles using multiple data sources
"""

import logging
import re
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import asyncio
import aiohttp
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import pandas as pd
from textblob import TextBlob
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

logger = logging.getLogger(__name__)

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

@dataclass
class SentimentData:
    """Represents sentiment data for a specific entity"""
    entity: str
    entity_type: str  # technology, company, role
    sentiment_score: float  # -1 to 1
    confidence: float  # 0 to 1
    volume: int
    timestamp: datetime
    source: str
    location: Optional[str] = None
    industry: Optional[str] = None
    raw_mentions: List[str] = field(default_factory=list)

@dataclass
class TrendAnalysis:
    """Represents trend analysis for an entity"""
    entity: str
    entity_type: str
    current_sentiment: float
    sentiment_change_7d: float
    sentiment_change_30d: float
    volume_change_7d: float
    volume_change_30d: float
    trend_direction: str  # rising, falling, stable
    confidence_score: float
    risk_level: str  # low, medium, high
    opportunities: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

@dataclass
class MarketIntelligence:
    """Market intelligence report"""
    report_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    trending_technologies: List[TrendAnalysis]
    declining_technologies: List[TrendAnalysis]
    emerging_opportunities: List[str]
    risk_alerts: List[str]
    industry_insights: Dict[str, Any]
    location_insights: Dict[str, Any]
    confidence_metrics: Dict[str, float]

class SentimentAnalyzer:
    """Advanced sentiment analysis using RoBERTa and ensemble methods"""
    
    def __init__(self):
        self.model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        self.tokenizer = None
        self.model = None
        self.sentiment_pipeline = None
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.stop_words = set(stopwords.words('english'))
        
    async def initialize(self):
        """Initialize the sentiment analysis models"""
        try:
            logger.info("Initializing sentiment analysis models...")
            
            # Load RoBERTa model for sentiment analysis
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model=self.model,
                tokenizer=self.tokenizer,
                return_all_scores=True
            )
            
            logger.info("Sentiment analysis models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize sentiment models: {e}")
            raise

    def analyze_text_sentiment(self, text: str) -> Tuple[float, float]:
        """Analyze sentiment of a single text using ensemble approach"""
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)
            
            if not cleaned_text:
                return 0.0, 0.0
            
            # RoBERTa sentiment analysis
            roberta_scores = self.sentiment_pipeline(cleaned_text)[0]
            roberta_sentiment = self._convert_roberta_to_score(roberta_scores)
            
            # TextBlob sentiment analysis (backup/ensemble)
            blob = TextBlob(cleaned_text)
            textblob_sentiment = blob.sentiment.polarity
            
            # Ensemble scoring (weighted average)
            ensemble_sentiment = (roberta_sentiment * 0.7) + (textblob_sentiment * 0.3)
            
            # Calculate confidence based on agreement between models
            confidence = 1.0 - abs(roberta_sentiment - textblob_sentiment) / 2.0
            confidence = max(0.1, min(1.0, confidence))
            
            return ensemble_sentiment, confidence
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return 0.0, 0.1

    def _convert_roberta_to_score(self, scores: List[Dict]) -> float:
        """Convert RoBERTa scores to -1 to 1 scale"""
        score_map = {'LABEL_0': -1, 'LABEL_1': 0, 'LABEL_2': 1}  # negative, neutral, positive
        
        weighted_score = 0.0
        for score_dict in scores:
            label = score_dict['label']
            score = score_dict['score']
            weighted_score += score_map.get(label, 0) * score
            
        return weighted_score

    def _preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for sentiment analysis"""
        if not text:
            return ""
        
        # Remove URLs
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Remove user mentions and hashtags (but keep the content)
        text = re.sub(r'@\w+|#', '', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove very short texts
        if len(text) < 10:
            return ""
            
        return text

    def extract_entities(self, text: str, entity_keywords: Dict[str, List[str]]) -> List[str]:
        """Extract mentioned entities from text"""
        text_lower = text.lower()
        found_entities = []
        
        for entity, keywords in entity_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    found_entities.append(entity)
                    break
        
        return found_entities

class DataCollector:
    """Collects data from multiple sources with rate limiting and ethical considerations"""
    
    def __init__(self):
        self.session = None
        self.rate_limits = {
            'twitter': {'requests_per_minute': 15, 'last_request': None},
            'reddit': {'requests_per_minute': 60, 'last_request': None},
            'hackernews': {'requests_per_minute': 30, 'last_request': None}
        }
        
    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()

    async def collect_tech_discussions(self, keywords: List[str], 
                                     sources: List[str] = None) -> List[Dict[str, Any]]:
        """Collect discussions about technologies from various sources"""
        if sources is None:
            sources = ['reddit', 'hackernews']
        
        all_data = []
        
        for source in sources:
            try:
                if source == 'reddit':
                    data = await self._collect_reddit_data(keywords)
                elif source == 'hackernews':
                    data = await self._collect_hackernews_data(keywords)
                else:
                    continue
                    
                all_data.extend(data)
                
            except Exception as e:
                logger.error(f"Error collecting from {source}: {e}")
                continue
        
        return all_data

    async def _collect_reddit_data(self, keywords: List[str]) -> List[Dict[str, Any]]:
        """Collect data from Reddit (using public API)"""
        # Rate limiting
        await self._respect_rate_limit('reddit')
        
        data = []
        
        for keyword in keywords:
            try:
                # Use Reddit's public JSON API
                url = f"https://www.reddit.com/search.json?q={keyword}&sort=new&limit=25"
                headers = {'User-Agent': 'SkillForge-AI/1.0 (Educational Research)'}
                
                async with self.session.get(url, headers=headers) as response:
                    if response.status == 200:
                        json_data = await response.json()
                        
                        for post in json_data.get('data', {}).get('children', []):
                            post_data = post.get('data', {})
                            
                            data.append({
                                'text': f"{post_data.get('title', '')} {post_data.get('selftext', '')}",
                                'source': 'reddit',
                                'timestamp': datetime.fromtimestamp(post_data.get('created_utc', 0)),
                                'score': post_data.get('score', 0),
                                'url': f"https://reddit.com{post_data.get('permalink', '')}",
                                'keyword': keyword
                            })
                            
                await asyncio.sleep(1)  # Be respectful to Reddit's servers
                
            except Exception as e:
                logger.error(f"Error collecting Reddit data for {keyword}: {e}")
                continue
        
        return data

    async def _collect_hackernews_data(self, keywords: List[str]) -> List[Dict[str, Any]]:
        """Collect data from Hacker News"""
        await self._respect_rate_limit('hackernews')
        
        data = []
        
        try:
            # Use HN Algolia API for search
            for keyword in keywords:
                url = f"https://hn.algolia.com/api/v1/search?query={keyword}&tags=story&hitsPerPage=50"
                
                async with self.session.get(url) as response:
                    if response.status == 200:
                        json_data = await response.json()
                        
                        for hit in json_data.get('hits', []):
                            data.append({
                                'text': f"{hit.get('title', '')} {hit.get('story_text', '')}",
                                'source': 'hackernews',
                                'timestamp': datetime.fromisoformat(hit.get('created_at', '').replace('Z', '+00:00')),
                                'score': hit.get('points', 0),
                                'url': hit.get('url', ''),
                                'keyword': keyword
                            })
                
                await asyncio.sleep(0.5)
                
        except Exception as e:
            logger.error(f"Error collecting HackerNews data: {e}")
        
        return data

    async def _respect_rate_limit(self, source: str):
        """Implement rate limiting for API calls"""
        rate_limit = self.rate_limits.get(source, {})
        requests_per_minute = rate_limit.get('requests_per_minute', 60)
        last_request = rate_limit.get('last_request')
        
        if last_request:
            time_since_last = (datetime.now() - last_request).total_seconds()
            min_interval = 60.0 / requests_per_minute
            
            if time_since_last < min_interval:
                sleep_time = min_interval - time_since_last
                await asyncio.sleep(sleep_time)
        
        self.rate_limits[source]['last_request'] = datetime.now()

class SentimentAnalysisPipeline:
    """Main sentiment analysis pipeline orchestrator"""
    
    def __init__(self):
        self.analyzer = SentimentAnalyzer()
        self.collector = DataCollector()
        self.entity_keywords = {
            # Technologies
            'React': ['react', 'reactjs', 'react.js'],
            'Python': ['python', 'python3', 'py'],
            'JavaScript': ['javascript', 'js', 'node.js', 'nodejs'],
            'TypeScript': ['typescript', 'ts'],
            'AWS': ['aws', 'amazon web services'],
            'Docker': ['docker', 'containerization'],
            'Kubernetes': ['kubernetes', 'k8s'],
            'Machine Learning': ['machine learning', 'ml', 'artificial intelligence', 'ai'],
            
            # Companies (examples)
            'Google': ['google', 'alphabet'],
            'Microsoft': ['microsoft', 'msft'],
            'Amazon': ['amazon', 'amzn'],
            'Meta': ['meta', 'facebook'],
            
            # Roles
            'Software Engineer': ['software engineer', 'developer', 'programmer'],
            'Data Scientist': ['data scientist', 'data analyst'],
            'DevOps Engineer': ['devops', 'site reliability engineer', 'sre'],
            'Product Manager': ['product manager', 'pm']
        }
        self.sentiment_history = defaultdict(list)
        
    async def initialize(self):
        """Initialize all components"""
        await self.analyzer.initialize()
        await self.collector.initialize()
        
    async def close(self):
        """Clean up resources"""
        await self.collector.close()

    async def run_analysis_cycle(self, entities: List[str] = None) -> MarketIntelligence:
        """Run a complete sentiment analysis cycle"""
        if entities is None:
            entities = list(self.entity_keywords.keys())
        
        logger.info(f"Starting sentiment analysis cycle for {len(entities)} entities")
        
        # Collect data
        keywords = []
        for entity in entities:
            keywords.extend(self.entity_keywords.get(entity, [entity]))
        
        raw_data = await self.collector.collect_tech_discussions(keywords)
        logger.info(f"Collected {len(raw_data)} data points")
        
        # Process sentiment data
        sentiment_data = await self._process_sentiment_data(raw_data, entities)
        
        # Analyze trends
        trend_analyses = self._analyze_trends(sentiment_data)
        
        # Generate market intelligence report
        report = self._generate_market_intelligence(trend_analyses, sentiment_data)
        
        logger.info("Sentiment analysis cycle completed")
        return report

    async def _process_sentiment_data(self, raw_data: List[Dict], 
                                    entities: List[str]) -> List[SentimentData]:
        """Process raw data into sentiment data points"""
        sentiment_data = []
        
        for item in raw_data:
            text = item.get('text', '')
            if not text:
                continue
            
            # Extract entities mentioned in this text
            mentioned_entities = self.analyzer.extract_entities(text, self.entity_keywords)
            
            if not mentioned_entities:
                continue
            
            # Analyze sentiment
            sentiment_score, confidence = self.analyzer.analyze_text_sentiment(text)
            
            # Create sentiment data for each mentioned entity
            for entity in mentioned_entities:
                if entity in entities:
                    sentiment_point = SentimentData(
                        entity=entity,
                        entity_type=self._get_entity_type(entity),
                        sentiment_score=sentiment_score,
                        confidence=confidence,
                        volume=1,
                        timestamp=item.get('timestamp', datetime.now()),
                        source=item.get('source', 'unknown'),
                        raw_mentions=[text]
                    )
                    sentiment_data.append(sentiment_point)
        
        return sentiment_data

    def _get_entity_type(self, entity: str) -> str:
        """Determine entity type based on predefined categories"""
        tech_entities = ['React', 'Python', 'JavaScript', 'TypeScript', 'AWS', 'Docker', 'Kubernetes', 'Machine Learning']
        company_entities = ['Google', 'Microsoft', 'Amazon', 'Meta']
        role_entities = ['Software Engineer', 'Data Scientist', 'DevOps Engineer', 'Product Manager']
        
        if entity in tech_entities:
            return 'technology'
        elif entity in company_entities:
            return 'company'
        elif entity in role_entities:
            return 'role'
        else:
            return 'unknown'

    def _analyze_trends(self, sentiment_data: List[SentimentData]) -> List[TrendAnalysis]:
        """Analyze trends for each entity"""
        trend_analyses = []
        
        # Group data by entity
        entity_data = defaultdict(list)
        for data_point in sentiment_data:
            entity_data[data_point.entity].append(data_point)
        
        for entity, data_points in entity_data.items():
            if len(data_points) < 5:  # Need minimum data points
                continue
            
            # Sort by timestamp
            data_points.sort(key=lambda x: x.timestamp)
            
            # Calculate current sentiment (last 7 days)
            now = datetime.now()
            recent_data = [dp for dp in data_points 
                          if (now - dp.timestamp).days <= 7]
            
            if not recent_data:
                continue
            
            current_sentiment = np.mean([dp.sentiment_score for dp in recent_data])
            
            # Calculate historical comparisons
            week_ago_data = [dp for dp in data_points 
                           if 7 <= (now - dp.timestamp).days <= 14]
            month_ago_data = [dp for dp in data_points 
                            if 30 <= (now - dp.timestamp).days <= 37]
            
            sentiment_change_7d = 0.0
            if week_ago_data:
                week_ago_sentiment = np.mean([dp.sentiment_score for dp in week_ago_data])
                sentiment_change_7d = current_sentiment - week_ago_sentiment
            
            sentiment_change_30d = 0.0
            if month_ago_data:
                month_ago_sentiment = np.mean([dp.sentiment_score for dp in month_ago_data])
                sentiment_change_30d = current_sentiment - month_ago_sentiment
            
            # Volume changes
            current_volume = len(recent_data)
            week_ago_volume = len(week_ago_data)
            month_ago_volume = len(month_ago_data)
            
            volume_change_7d = ((current_volume - week_ago_volume) / max(week_ago_volume, 1)) * 100
            volume_change_30d = ((current_volume - month_ago_volume) / max(month_ago_volume, 1)) * 100
            
            # Determine trend direction
            trend_direction = 'stable'
            if sentiment_change_7d > 0.1:
                trend_direction = 'rising'
            elif sentiment_change_7d < -0.1:
                trend_direction = 'falling'
            
            # Calculate confidence and risk
            confidence_score = np.mean([dp.confidence for dp in recent_data])
            risk_level = self._calculate_risk_level(current_sentiment, sentiment_change_7d, volume_change_7d)
            
            # Generate opportunities and warnings
            opportunities, warnings = self._generate_insights(
                entity, current_sentiment, sentiment_change_7d, trend_direction
            )
            
            trend_analysis = TrendAnalysis(
                entity=entity,
                entity_type=self._get_entity_type(entity),
                current_sentiment=current_sentiment,
                sentiment_change_7d=sentiment_change_7d,
                sentiment_change_30d=sentiment_change_30d,
                volume_change_7d=volume_change_7d,
                volume_change_30d=volume_change_30d,
                trend_direction=trend_direction,
                confidence_score=confidence_score,
                risk_level=risk_level,
                opportunities=opportunities,
                warnings=warnings
            )
            
            trend_analyses.append(trend_analysis)
        
        return trend_analyses

    def _calculate_risk_level(self, sentiment: float, change_7d: float, volume_change: float) -> str:
        """Calculate risk level based on sentiment metrics"""
        risk_score = 0
        
        # Negative sentiment increases risk
        if sentiment < -0.3:
            risk_score += 2
        elif sentiment < 0:
            risk_score += 1
        
        # Declining sentiment increases risk
        if change_7d < -0.2:
            risk_score += 2
        elif change_7d < -0.1:
            risk_score += 1
        
        # High volume with negative sentiment is concerning
        if volume_change > 50 and sentiment < 0:
            risk_score += 1
        
        if risk_score >= 3:
            return 'high'
        elif risk_score >= 1:
            return 'medium'
        else:
            return 'low'

    def _generate_insights(self, entity: str, sentiment: float, 
                          change_7d: float, trend: str) -> Tuple[List[str], List[str]]:
        """Generate opportunities and warnings based on sentiment analysis"""
        opportunities = []
        warnings = []
        
        if trend == 'rising' and sentiment > 0.2:
            opportunities.append(f"{entity} shows strong positive momentum - consider skill development")
            
        if trend == 'rising' and change_7d > 0.3:
            opportunities.append(f"Rapid sentiment improvement for {entity} - early adoption opportunity")
        
        if trend == 'falling' and sentiment < -0.2:
            warnings.append(f"{entity} sentiment declining - monitor for skill obsolescence risk")
            
        if change_7d < -0.4:
            warnings.append(f"Sharp sentiment drop for {entity} - investigate underlying issues")
        
        return opportunities, warnings

    def _generate_market_intelligence(self, trend_analyses: List[TrendAnalysis], 
                                    sentiment_data: List[SentimentData]) -> MarketIntelligence:
        """Generate comprehensive market intelligence report"""
        now = datetime.now()
        
        # Sort trends
        trending_up = [ta for ta in trend_analyses if ta.trend_direction == 'rising']
        trending_down = [ta for ta in trend_analyses if ta.trend_direction == 'falling']
        
        trending_up.sort(key=lambda x: x.sentiment_change_7d, reverse=True)
        trending_down.sort(key=lambda x: x.sentiment_change_7d)
        
        # Generate insights
        emerging_opportunities = []
        risk_alerts = []
        
        for trend in trending_up[:5]:
            if trend.current_sentiment > 0.3:
                emerging_opportunities.append(
                    f"{trend.entity}: Strong positive sentiment (+{trend.sentiment_change_7d:.2f}) "
                    f"with {trend.volume_change_7d:.1f}% volume increase"
                )
        
        for trend in trending_down[:3]:
            if trend.risk_level == 'high':
                risk_alerts.append(
                    f"{trend.entity}: High risk - sentiment declining {trend.sentiment_change_7d:.2f} "
                    f"over 7 days"
                )
        
        # Calculate confidence metrics
        confidence_metrics = {
            'overall_data_quality': np.mean([dp.confidence for dp in sentiment_data]),
            'sample_size': len(sentiment_data),
            'source_diversity': len(set(dp.source for dp in sentiment_data)),
            'temporal_coverage_days': (max(dp.timestamp for dp in sentiment_data) - 
                                     min(dp.timestamp for dp in sentiment_data)).days
        }
        
        report = MarketIntelligence(
            report_id=f"report_{now.strftime('%Y%m%d_%H%M%S')}",
            generated_at=now,
            period_start=now - timedelta(days=30),
            period_end=now,
            trending_technologies=trending_up,
            declining_technologies=trending_down,
            emerging_opportunities=emerging_opportunities,
            risk_alerts=risk_alerts,
            industry_insights={},  # Could be expanded with industry-specific analysis
            location_insights={},  # Could be expanded with location-specific analysis
            confidence_metrics=confidence_metrics
        )
        
        return report

# Service instance
sentiment_pipeline = SentimentAnalysisPipeline()
