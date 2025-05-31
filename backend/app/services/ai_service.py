"""
AI Service for SkillForge AI Backend
Handles HuggingFace model integration and AI-powered features
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Union
import httpx
from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import numpy as np
from sentence_transformers import SentenceTransformer
import json
import re
from datetime import datetime

logger = logging.getLogger(__name__)


class HuggingFaceService:
    """Service for HuggingFace model integration"""
    
    def __init__(self):
        self.models = {}
        self.tokenizers = {}
        self.pipelines = {}
        self.sentence_transformer = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize HuggingFace models"""
        try:
            logger.info("Initializing HuggingFace models...")
            
            # Initialize sentence transformer for embeddings
            self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model loaded")
            
            # Initialize text classification pipeline for skill extraction
            self.pipelines['skill_classifier'] = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            logger.info("Skill classification pipeline loaded")
            
            # Initialize NER pipeline for entity extraction
            self.pipelines['ner'] = pipeline(
                "ner",
                model="dbmdz/bert-large-cased-finetuned-conll03-english",
                aggregation_strategy="simple"
            )
            logger.info("NER pipeline loaded")
            
            # Initialize summarization pipeline
            self.pipelines['summarizer'] = pipeline(
                "summarization",
                model="facebook/bart-large-cnn"
            )
            logger.info("Summarization pipeline loaded")
            
            logger.info("All HuggingFace models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing HuggingFace models: {e}")
            # Initialize with minimal models for development
            self._initialize_minimal_models()
    
    def _initialize_minimal_models(self):
        """Initialize minimal models for development/testing"""
        try:
            logger.info("Initializing minimal models for development...")
            
            # Use smaller, faster models for development
            self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Simple text classification
            self.pipelines['sentiment'] = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest"
            )
            
            logger.info("Minimal models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing minimal models: {e}")
    
    async def extract_skills_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract skills from text using NLP models
        
        Args:
            text: Input text (resume, job description, etc.)
        
        Returns:
            List of extracted skills with confidence scores
        """
        try:
            skills = []
            
            # Predefined skill patterns (can be enhanced with ML models)
            skill_patterns = {
                'programming_languages': [
                    'python', 'javascript', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust',
                    'typescript', 'kotlin', 'swift', 'scala', 'r', 'matlab', 'sql'
                ],
                'frameworks': [
                    'react', 'angular', 'vue', 'django', 'flask', 'fastapi', 'express',
                    'spring', 'laravel', 'rails', 'nextjs', 'nuxt', 'svelte'
                ],
                'databases': [
                    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra',
                    'dynamodb', 'sqlite', 'oracle', 'sql server'
                ],
                'cloud_platforms': [
                    'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean',
                    'kubernetes', 'docker', 'terraform'
                ],
                'tools': [
                    'git', 'jenkins', 'docker', 'kubernetes', 'ansible', 'terraform',
                    'jira', 'confluence', 'slack', 'figma', 'photoshop'
                ],
                'soft_skills': [
                    'leadership', 'communication', 'teamwork', 'problem solving',
                    'project management', 'agile', 'scrum', 'critical thinking'
                ]
            }
            
            text_lower = text.lower()
            
            # Extract skills using pattern matching
            for category, skill_list in skill_patterns.items():
                for skill in skill_list:
                    if skill.lower() in text_lower:
                        # Calculate confidence based on context
                        confidence = self._calculate_skill_confidence(text, skill)
                        
                        skills.append({
                            'skill': skill.title(),
                            'category': category,
                            'confidence': confidence,
                            'source': 'pattern_matching',
                            'context': self._extract_skill_context(text, skill)
                        })
            
            # Use NER to extract additional entities
            if 'ner' in self.pipelines:
                try:
                    entities = self.pipelines['ner'](text)
                    for entity in entities:
                        if entity['entity_group'] in ['ORG', 'MISC']:
                            skills.append({
                                'skill': entity['word'],
                                'category': 'technology',
                                'confidence': entity['score'],
                                'source': 'ner_extraction',
                                'context': text[max(0, entity['start']-50):entity['end']+50]
                            })
                except Exception as e:
                    logger.warning(f"NER extraction failed: {e}")
            
            # Remove duplicates and sort by confidence
            unique_skills = {}
            for skill in skills:
                key = skill['skill'].lower()
                if key not in unique_skills or skill['confidence'] > unique_skills[key]['confidence']:
                    unique_skills[key] = skill
            
            return sorted(unique_skills.values(), key=lambda x: x['confidence'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error extracting skills from text: {e}")
            return []
    
    def _calculate_skill_confidence(self, text: str, skill: str) -> float:
        """Calculate confidence score for skill extraction"""
        try:
            text_lower = text.lower()
            skill_lower = skill.lower()
            
            # Base confidence
            confidence = 0.5
            
            # Increase confidence based on context
            context_patterns = [
                f"experience with {skill_lower}",
                f"proficient in {skill_lower}",
                f"expert in {skill_lower}",
                f"skilled in {skill_lower}",
                f"{skill_lower} developer",
                f"{skill_lower} programming",
                f"years of {skill_lower}",
                f"{skill_lower} certification"
            ]
            
            for pattern in context_patterns:
                if pattern in text_lower:
                    confidence += 0.2
            
            # Count occurrences
            occurrences = text_lower.count(skill_lower)
            confidence += min(occurrences * 0.1, 0.3)
            
            return min(confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating skill confidence: {e}")
            return 0.5
    
    def _extract_skill_context(self, text: str, skill: str) -> str:
        """Extract context around skill mention"""
        try:
            text_lower = text.lower()
            skill_lower = skill.lower()
            
            # Find skill position
            pos = text_lower.find(skill_lower)
            if pos == -1:
                return ""
            
            # Extract context (50 characters before and after)
            start = max(0, pos - 50)
            end = min(len(text), pos + len(skill) + 50)
            
            return text[start:end].strip()
            
        except Exception as e:
            logger.error(f"Error extracting skill context: {e}")
            return ""
    
    async def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for text using sentence transformers
        
        Args:
            texts: List of texts to embed
        
        Returns:
            Numpy array of embeddings
        """
        try:
            if not self.sentence_transformer:
                raise ValueError("Sentence transformer not initialized")
            
            embeddings = self.sentence_transformer.encode(texts)
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            return np.array([])
    
    async def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate semantic similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
        
        Returns:
            Similarity score between 0 and 1
        """
        try:
            embeddings = await self.generate_embeddings([text1, text2])
            if len(embeddings) != 2:
                return 0.0
            
            # Calculate cosine similarity
            similarity = np.dot(embeddings[0], embeddings[1]) / (
                np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
            )
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def summarize_text(self, text: str, max_length: int = 150) -> str:
        """
        Summarize text using HuggingFace summarization model
        
        Args:
            text: Text to summarize
            max_length: Maximum length of summary
        
        Returns:
            Summarized text
        """
        try:
            if 'summarizer' not in self.pipelines:
                # Fallback to simple truncation
                return text[:max_length] + "..." if len(text) > max_length else text
            
            # Use HuggingFace summarization
            summary = self.pipelines['summarizer'](
                text,
                max_length=max_length,
                min_length=30,
                do_sample=False
            )
            
            return summary[0]['summary_text']
            
        except Exception as e:
            logger.error(f"Error summarizing text: {e}")
            # Fallback to simple truncation
            return text[:max_length] + "..." if len(text) > max_length else text
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of text
        
        Args:
            text: Text to analyze
        
        Returns:
            Sentiment analysis results
        """
        try:
            if 'sentiment' in self.pipelines:
                result = self.pipelines['sentiment'](text)
                return {
                    'label': result[0]['label'],
                    'score': result[0]['score'],
                    'timestamp': datetime.utcnow().isoformat()
                }
            else:
                # Fallback to simple keyword-based sentiment
                positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'best']
                negative_words = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible']
                
                text_lower = text.lower()
                positive_count = sum(1 for word in positive_words if word in text_lower)
                negative_count = sum(1 for word in negative_words if word in text_lower)
                
                if positive_count > negative_count:
                    return {'label': 'POSITIVE', 'score': 0.7, 'timestamp': datetime.utcnow().isoformat()}
                elif negative_count > positive_count:
                    return {'label': 'NEGATIVE', 'score': 0.7, 'timestamp': datetime.utcnow().isoformat()}
                else:
                    return {'label': 'NEUTRAL', 'score': 0.5, 'timestamp': datetime.utcnow().isoformat()}
                    
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {'label': 'NEUTRAL', 'score': 0.5, 'timestamp': datetime.utcnow().isoformat()}
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of AI services"""
        try:
            status = {
                'status': 'healthy',
                'models_loaded': len(self.pipelines),
                'sentence_transformer': self.sentence_transformer is not None,
                'available_services': list(self.pipelines.keys()),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Test a simple operation
            test_result = await self.analyze_sentiment("This is a test")
            status['test_operation'] = 'passed' if test_result else 'failed'
            
            return status
            
        except Exception as e:
            logger.error(f"AI service health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }


class ResumeParsingService:
    """Service for parsing and analyzing resumes"""

    def __init__(self, ai_service: HuggingFaceService):
        self.ai_service = ai_service

    async def parse_resume_text(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract structured information

        Args:
            resume_text: Raw resume text

        Returns:
            Structured resume data
        """
        try:
            logger.info("Parsing resume text...")

            # Extract basic sections
            sections = self._extract_resume_sections(resume_text)

            # Extract skills using AI
            skills = await self.ai_service.extract_skills_from_text(resume_text)

            # Extract contact information
            contact_info = self._extract_contact_info(resume_text)

            # Extract experience
            experience = self._extract_experience(sections.get('experience', ''))

            # Extract education
            education = self._extract_education(sections.get('education', ''))

            # Generate summary
            summary = await self.ai_service.summarize_text(resume_text, max_length=200)

            # Analyze sentiment/tone
            sentiment = await self.ai_service.analyze_sentiment(resume_text)

            parsed_resume = {
                'contact_info': contact_info,
                'summary': summary,
                'skills': skills,
                'experience': experience,
                'education': education,
                'sections': sections,
                'sentiment_analysis': sentiment,
                'parsing_metadata': {
                    'parsed_at': datetime.utcnow().isoformat(),
                    'text_length': len(resume_text),
                    'skills_found': len(skills),
                    'experience_entries': len(experience),
                    'education_entries': len(education)
                }
            }

            logger.info(f"Resume parsed successfully: {len(skills)} skills found")
            return parsed_resume

        except Exception as e:
            logger.error(f"Error parsing resume: {e}")
            return {
                'error': str(e),
                'parsed_at': datetime.utcnow().isoformat()
            }

    def _extract_resume_sections(self, text: str) -> Dict[str, str]:
        """Extract main sections from resume text"""
        try:
            sections = {}

            # Common section headers
            section_patterns = {
                'summary': r'(summary|profile|objective|about)',
                'experience': r'(experience|employment|work history|professional experience)',
                'education': r'(education|academic|qualifications)',
                'skills': r'(skills|technical skills|competencies)',
                'projects': r'(projects|portfolio)',
                'certifications': r'(certifications|certificates|licenses)'
            }

            text_lower = text.lower()

            for section_name, pattern in section_patterns.items():
                # Find section start
                import re
                match = re.search(pattern, text_lower)
                if match:
                    start_pos = match.start()

                    # Find next section or end of text
                    next_section_pos = len(text)
                    for other_pattern in section_patterns.values():
                        if other_pattern != pattern:
                            next_match = re.search(other_pattern, text_lower[start_pos + 50:])
                            if next_match:
                                next_section_pos = min(next_section_pos, start_pos + 50 + next_match.start())

                    # Extract section content
                    section_content = text[start_pos:next_section_pos].strip()
                    sections[section_name] = section_content

            return sections

        except Exception as e:
            logger.error(f"Error extracting resume sections: {e}")
            return {}

    def _extract_contact_info(self, text: str) -> Dict[str, str]:
        """Extract contact information from resume"""
        try:
            contact_info = {}

            # Email pattern
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            email_match = re.search(email_pattern, text)
            if email_match:
                contact_info['email'] = email_match.group()

            # Phone pattern
            phone_pattern = r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
            phone_match = re.search(phone_pattern, text)
            if phone_match:
                contact_info['phone'] = phone_match.group()

            # LinkedIn pattern
            linkedin_pattern = r'linkedin\.com/in/[\w-]+'
            linkedin_match = re.search(linkedin_pattern, text, re.IGNORECASE)
            if linkedin_match:
                contact_info['linkedin'] = linkedin_match.group()

            # GitHub pattern
            github_pattern = r'github\.com/[\w-]+'
            github_match = re.search(github_pattern, text, re.IGNORECASE)
            if github_match:
                contact_info['github'] = github_match.group()

            return contact_info

        except Exception as e:
            logger.error(f"Error extracting contact info: {e}")
            return {}

    def _extract_experience(self, experience_text: str) -> List[Dict[str, Any]]:
        """Extract work experience entries"""
        try:
            experiences = []

            # Split by common delimiters
            entries = re.split(r'\n\s*\n|\n(?=[A-Z][a-z]+ \d{4})', experience_text)

            for entry in entries:
                if len(entry.strip()) < 20:  # Skip short entries
                    continue

                experience_entry = {
                    'raw_text': entry.strip(),
                    'company': self._extract_company_name(entry),
                    'position': self._extract_position_title(entry),
                    'dates': self._extract_dates(entry),
                    'description': entry.strip()
                }

                experiences.append(experience_entry)

            return experiences

        except Exception as e:
            logger.error(f"Error extracting experience: {e}")
            return []

    def _extract_education(self, education_text: str) -> List[Dict[str, Any]]:
        """Extract education entries"""
        try:
            education_entries = []

            # Split by common delimiters
            entries = re.split(r'\n\s*\n|\n(?=[A-Z])', education_text)

            for entry in entries:
                if len(entry.strip()) < 10:  # Skip short entries
                    continue

                education_entry = {
                    'raw_text': entry.strip(),
                    'institution': self._extract_institution_name(entry),
                    'degree': self._extract_degree(entry),
                    'dates': self._extract_dates(entry),
                    'description': entry.strip()
                }

                education_entries.append(education_entry)

            return education_entries

        except Exception as e:
            logger.error(f"Error extracting education: {e}")
            return []

    def _extract_company_name(self, text: str) -> str:
        """Extract company name from experience entry"""
        # Simple heuristic: first line often contains company name
        lines = text.strip().split('\n')
        if lines:
            return lines[0].strip()
        return ""

    def _extract_position_title(self, text: str) -> str:
        """Extract position title from experience entry"""
        # Look for common position indicators
        lines = text.strip().split('\n')
        for line in lines[:3]:  # Check first 3 lines
            if any(word in line.lower() for word in ['engineer', 'developer', 'manager', 'analyst', 'specialist']):
                return line.strip()
        return ""

    def _extract_institution_name(self, text: str) -> str:
        """Extract institution name from education entry"""
        lines = text.strip().split('\n')
        if lines:
            return lines[0].strip()
        return ""

    def _extract_degree(self, text: str) -> str:
        """Extract degree from education entry"""
        degree_patterns = [
            r'(bachelor|master|phd|doctorate|associate|diploma)',
            r'(b\.?s\.?|m\.?s\.?|m\.?a\.?|ph\.?d\.?|b\.?a\.?)'
        ]

        for pattern in degree_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group()

        return ""

    def _extract_dates(self, text: str) -> str:
        """Extract date ranges from text"""
        # Look for date patterns
        date_patterns = [
            r'\d{4}\s*-\s*\d{4}',
            r'\d{4}\s*-\s*present',
            r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}',
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group()

        return ""


# Global service instances
ai_service = HuggingFaceService()
resume_parser = ResumeParsingService(ai_service)
