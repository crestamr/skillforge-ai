"""
SkillForge AI - Audio Learning Content Generation Service
Advanced text-to-speech system using Microsoft SpeechT5 for personalized audio learning
"""

import asyncio
import logging
import re
import json
import hashlib
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import torch
from transformers import SpeechT5Processor, SpeechT5ForTextToSpeech, SpeechT5HifiGan
from datasets import load_dataset
import soundfile as sf
import numpy as np
from pydub import AudioSegment
from pydub.effects import normalize, compress_dynamic_range
import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.database import get_db
from app.models.learning import LearningContent, AudioContent, AudioChapter
from app.utils.cache import cache_manager
from app.utils.text_processing import TextProcessor

logger = logging.getLogger(__name__)

class AudioLearningService:
    """Advanced audio learning content generation with Microsoft SpeechT5"""
    
    def __init__(self):
        self.processor = None
        self.model = None
        self.vocoder = None
        self.speaker_embeddings = None
        self.s3_client = None
        self.text_processor = TextProcessor()
        self.audio_cache = {}
        
        # Voice configurations
        self.voice_configs = {
            'professional': {
                'speaker_id': 0,
                'speed': 1.0,
                'pitch_shift': 0,
                'emphasis_strength': 0.8
            },
            'friendly': {
                'speaker_id': 1,
                'speed': 0.95,
                'pitch_shift': 2,
                'emphasis_strength': 1.0
            },
            'technical': {
                'speaker_id': 2,
                'speed': 0.9,
                'pitch_shift': -1,
                'emphasis_strength': 0.6
            },
            'energetic': {
                'speaker_id': 3,
                'speed': 1.1,
                'pitch_shift': 3,
                'emphasis_strength': 1.2
            }
        }
        
        # Technical terminology pronunciation dictionary
        self.pronunciation_dict = {
            'API': 'A P I',
            'HTTP': 'H T T P',
            'JSON': 'J S O N',
            'SQL': 'S Q L',
            'CSS': 'C S S',
            'HTML': 'H T M L',
            'JavaScript': 'Java Script',
            'Python': 'Pie-thon',
            'PostgreSQL': 'Post-gres Q L',
            'MongoDB': 'Mongo D B',
            'Kubernetes': 'Koo-ber-net-ees',
            'OAuth': 'O Auth',
            'JWT': 'J W T',
            'REST': 'R E S T',
            'GraphQL': 'Graph Q L',
            'DevOps': 'Dev Ops',
            'CI/CD': 'C I C D',
            'AWS': 'A W S',
            'Azure': 'A-zhure',
            'Docker': 'Docker',
            'Redis': 'Red-iss',
            'nginx': 'Engine X',
            'Apache': 'A-patch-ee',
            'MySQL': 'My S Q L',
            'React': 'React',
            'Vue.js': 'Vue J S',
            'Angular': 'Angular',
            'Node.js': 'Node J S',
            'TypeScript': 'Type Script',
            'webpack': 'Web Pack',
            'Babel': 'Babel',
            'ESLint': 'E S Lint',
            'GitHub': 'Git Hub',
            'GitLab': 'Git Lab',
            'Jira': 'Jee-ra',
            'Slack': 'Slack',
            'Figma': 'Fig-ma',
            'Sketch': 'Sketch'
        }
    
    async def initialize_models(self):
        """Initialize SpeechT5 models and components"""
        try:
            logger.info("Initializing SpeechT5 models...")
            
            # Load processor and model
            self.processor = SpeechT5Processor.from_pretrained("microsoft/speecht5_tts")
            self.model = SpeechT5ForTextToSpeech.from_pretrained("microsoft/speecht5_tts")
            self.vocoder = SpeechT5HifiGan.from_pretrained("microsoft/speecht5_hifigan")
            
            # Load speaker embeddings dataset
            embeddings_dataset = load_dataset("Matthijs/cmu-arctic-xvectors", split="validation")
            self.speaker_embeddings = torch.tensor(embeddings_dataset[0]["xvector"]).unsqueeze(0)
            
            # Initialize S3 client for audio storage
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            logger.info("SpeechT5 models initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize SpeechT5 models: {e}")
            raise
    
    async def generate_audio_content(
        self,
        content_id: int,
        text: str,
        voice_style: str = 'professional',
        user_preferences: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Generate audio content from text with advanced features"""
        
        try:
            # Get or create audio content record
            audio_content = await self._get_or_create_audio_content(content_id, voice_style)
            
            # Check cache first
            cache_key = self._generate_cache_key(text, voice_style, user_preferences)
            cached_audio = await cache_manager.get(f"audio:{cache_key}")
            
            if cached_audio:
                logger.info(f"Returning cached audio for content {content_id}")
                return cached_audio
            
            # Process text for audio generation
            processed_text = await self._preprocess_text(text)
            
            # Split into chapters for better navigation
            chapters = await self._create_chapters(processed_text)
            
            # Generate audio for each chapter
            audio_segments = []
            chapter_markers = []
            current_time = 0.0
            
            for i, chapter in enumerate(chapters):
                logger.info(f"Generating audio for chapter {i+1}/{len(chapters)}")
                
                # Generate chapter audio
                chapter_audio = await self._generate_chapter_audio(
                    chapter['text'],
                    voice_style,
                    user_preferences
                )
                
                # Create chapter marker
                chapter_markers.append({
                    'title': chapter['title'],
                    'start_time': current_time,
                    'duration': len(chapter_audio) / 22050,  # Assuming 22050 Hz sample rate
                    'chapter_id': i + 1
                })
                
                audio_segments.append(chapter_audio)
                current_time += len(chapter_audio) / 22050
            
            # Combine all audio segments
            full_audio = np.concatenate(audio_segments)
            
            # Apply post-processing
            processed_audio = await self._post_process_audio(full_audio, voice_style)
            
            # Generate summary audio
            summary_text = await self._generate_summary(text)
            summary_audio = await self._generate_chapter_audio(
                summary_text,
                voice_style,
                user_preferences,
                is_summary=True
            )
            
            # Save audio files to S3
            audio_urls = await self._save_audio_files(
                audio_content.id,
                processed_audio,
                summary_audio,
                voice_style
            )
            
            # Update database with audio metadata
            await self._update_audio_metadata(
                audio_content,
                chapter_markers,
                audio_urls,
                len(processed_audio) / 22050
            )
            
            result = {
                'audio_content_id': audio_content.id,
                'main_audio_url': audio_urls['main'],
                'summary_audio_url': audio_urls['summary'],
                'chapters': chapter_markers,
                'total_duration': len(processed_audio) / 22050,
                'voice_style': voice_style,
                'generated_at': datetime.utcnow().isoformat()
            }
            
            # Cache the result
            await cache_manager.set(f"audio:{cache_key}", result, ttl=3600)
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate audio content: {e}")
            raise
    
    async def _preprocess_text(self, text: str) -> str:
        """Preprocess text for optimal audio generation"""
        
        # Replace technical terms with pronunciations
        processed_text = text
        for term, pronunciation in self.pronunciation_dict.items():
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(term) + r'\b'
            processed_text = re.sub(pattern, pronunciation, processed_text, flags=re.IGNORECASE)
        
        # Add pauses for better comprehension
        processed_text = self._add_strategic_pauses(processed_text)
        
        # Normalize text formatting
        processed_text = self.text_processor.normalize_text(processed_text)
        
        # Add emphasis markers for important concepts
        processed_text = self._add_emphasis_markers(processed_text)
        
        return processed_text
    
    def _add_strategic_pauses(self, text: str) -> str:
        """Add strategic pauses for better comprehension"""
        
        # Add longer pauses after sentences
        text = re.sub(r'\.(\s+)', r'. <break time="0.8s"/> ', text)
        
        # Add medium pauses after commas in lists
        text = re.sub(r',(\s+)', r', <break time="0.4s"/> ', text)
        
        # Add pauses after colons
        text = re.sub(r':(\s+)', r': <break time="0.6s"/> ', text)
        
        # Add pauses before important transitions
        transition_words = ['however', 'therefore', 'furthermore', 'additionally', 'consequently']
        for word in transition_words:
            pattern = r'\b' + word + r'\b'
            replacement = f'<break time="0.5s"/> {word}'
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
    
    def _add_emphasis_markers(self, text: str) -> str:
        """Add emphasis markers for important concepts"""
        
        # Emphasize words in quotes
        text = re.sub(r'"([^"]+)"', r'<emphasis level="moderate">\1</emphasis>', text)
        
        # Emphasize technical terms (words with camelCase or snake_case)
        text = re.sub(r'\b([a-z]+[A-Z][a-zA-Z]*)\b', r'<emphasis level="moderate">\1</emphasis>', text)
        text = re.sub(r'\b([a-z]+_[a-z_]+)\b', r'<emphasis level="moderate">\1</emphasis>', text)
        
        # Emphasize numbers and percentages
        text = re.sub(r'\b(\d+(?:\.\d+)?%?)\b', r'<emphasis level="strong">\1</emphasis>', text)
        
        return text
    
    async def _create_chapters(self, text: str) -> List[Dict[str, str]]:
        """Split text into logical chapters with titles"""
        
        # Split by headers (markdown-style)
        header_pattern = r'^#{1,6}\s+(.+)$'
        sections = re.split(header_pattern, text, flags=re.MULTILINE)
        
        chapters = []
        
        if len(sections) > 1:
            # Text has headers
            for i in range(1, len(sections), 2):
                if i + 1 < len(sections):
                    title = sections[i].strip()
                    content = sections[i + 1].strip()
                    
                    if content:
                        chapters.append({
                            'title': title,
                            'text': content
                        })
        else:
            # No headers, split by paragraphs and create logical chapters
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            
            # Group paragraphs into chapters (max 3 paragraphs per chapter)
            chapter_size = 3
            for i in range(0, len(paragraphs), chapter_size):
                chapter_paragraphs = paragraphs[i:i + chapter_size]
                chapter_text = '\n\n'.join(chapter_paragraphs)
                
                # Generate title from first sentence
                first_sentence = chapter_paragraphs[0].split('.')[0]
                title = f"Chapter {i // chapter_size + 1}: {first_sentence[:50]}..."
                
                chapters.append({
                    'title': title,
                    'text': chapter_text
                })
        
        return chapters
    
    async def _generate_chapter_audio(
        self,
        text: str,
        voice_style: str,
        user_preferences: Dict[str, Any] = None,
        is_summary: bool = False
    ) -> np.ndarray:
        """Generate audio for a single chapter"""
        
        try:
            # Get voice configuration
            voice_config = self.voice_configs.get(voice_style, self.voice_configs['professional'])
            
            # Apply user preferences
            if user_preferences:
                voice_config = self._apply_user_preferences(voice_config, user_preferences)
            
            # Adjust for summary content
            if is_summary:
                voice_config['speed'] *= 0.95  # Slightly slower for summaries
                voice_config['emphasis_strength'] *= 1.1  # More emphasis
            
            # Tokenize text
            inputs = self.processor(text=text, return_tensors="pt")
            
            # Get speaker embedding
            speaker_embedding = self.speaker_embeddings[voice_config['speaker_id']].unsqueeze(0)
            
            # Generate speech
            with torch.no_grad():
                speech = self.model.generate_speech(
                    inputs["input_ids"],
                    speaker_embedding,
                    vocoder=self.vocoder
                )
            
            # Convert to numpy array
            audio_array = speech.numpy()
            
            # Apply voice modifications
            if voice_config['speed'] != 1.0:
                audio_array = self._adjust_speed(audio_array, voice_config['speed'])
            
            if voice_config['pitch_shift'] != 0:
                audio_array = self._adjust_pitch(audio_array, voice_config['pitch_shift'])
            
            return audio_array
            
        except Exception as e:
            logger.error(f"Failed to generate chapter audio: {e}")
            raise
    
    def _apply_user_preferences(
        self,
        voice_config: Dict[str, Any],
        user_preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply user preferences to voice configuration"""
        
        config = voice_config.copy()
        
        # Apply speed preference
        if 'playback_speed' in user_preferences:
            config['speed'] *= user_preferences['playback_speed']
        
        # Apply voice preference
        if 'preferred_voice' in user_preferences:
            preferred_voice = user_preferences['preferred_voice']
            if preferred_voice in self.voice_configs:
                config.update(self.voice_configs[preferred_voice])
        
        # Apply accessibility preferences
        if user_preferences.get('hearing_impaired'):
            config['emphasis_strength'] *= 1.3
            config['speed'] *= 0.9
        
        if user_preferences.get('non_native_speaker'):
            config['speed'] *= 0.85
            config['emphasis_strength'] *= 1.2
        
        return config
    
    def _adjust_speed(self, audio: np.ndarray, speed_factor: float) -> np.ndarray:
        """Adjust audio playback speed"""
        
        # Convert to AudioSegment for speed adjustment
        audio_segment = AudioSegment(
            audio.tobytes(),
            frame_rate=22050,
            sample_width=audio.dtype.itemsize,
            channels=1
        )
        
        # Adjust speed
        adjusted = audio_segment.speedup(playback_speed=speed_factor)
        
        # Convert back to numpy array
        return np.array(adjusted.get_array_of_samples(), dtype=np.float32)
    
    def _adjust_pitch(self, audio: np.ndarray, semitones: int) -> np.ndarray:
        """Adjust audio pitch"""
        
        # Convert to AudioSegment
        audio_segment = AudioSegment(
            audio.tobytes(),
            frame_rate=22050,
            sample_width=audio.dtype.itemsize,
            channels=1
        )
        
        # Calculate pitch shift ratio
        pitch_ratio = 2 ** (semitones / 12.0)
        
        # Apply pitch shift (simplified implementation)
        # In production, use more sophisticated pitch shifting
        new_frame_rate = int(audio_segment.frame_rate * pitch_ratio)
        pitched = audio_segment._spawn(audio_segment.raw_data, overrides={"frame_rate": new_frame_rate})
        pitched = pitched.set_frame_rate(22050)
        
        return np.array(pitched.get_array_of_samples(), dtype=np.float32)
    
    async def _post_process_audio(self, audio: np.ndarray, voice_style: str) -> np.ndarray:
        """Apply post-processing to improve audio quality"""
        
        # Convert to AudioSegment for processing
        audio_segment = AudioSegment(
            audio.tobytes(),
            frame_rate=22050,
            sample_width=audio.dtype.itemsize,
            channels=1
        )
        
        # Normalize audio levels
        normalized = normalize(audio_segment)
        
        # Apply dynamic range compression for better listening experience
        compressed = compress_dynamic_range(normalized, threshold=-20.0, ratio=4.0)
        
        # Apply EQ based on voice style
        if voice_style == 'technical':
            # Boost mid frequencies for clarity
            compressed = compressed.low_pass_filter(8000).high_pass_filter(100)
        elif voice_style == 'friendly':
            # Warmer tone
            compressed = compressed.low_pass_filter(7000)
        
        # Convert back to numpy array
        return np.array(compressed.get_array_of_samples(), dtype=np.float32)
    
    async def _generate_summary(self, text: str) -> str:
        """Generate a concise summary of the content"""
        
        # Simple extractive summarization
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # Score sentences based on keyword frequency
        word_freq = {}
        for sentence in sentences:
            words = sentence.lower().split()
            for word in words:
                if len(word) > 3:  # Skip short words
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        # Score sentences
        sentence_scores = []
        for sentence in sentences:
            score = sum(word_freq.get(word.lower(), 0) for word in sentence.split())
            sentence_scores.append((score, sentence))
        
        # Select top sentences for summary
        sentence_scores.sort(reverse=True)
        summary_sentences = [sent for _, sent in sentence_scores[:3]]
        
        summary = '. '.join(summary_sentences) + '.'
        
        # Add summary introduction
        return f"Here's a quick summary of this content: {summary}"
    
    async def _save_audio_files(
        self,
        audio_content_id: int,
        main_audio: np.ndarray,
        summary_audio: np.ndarray,
        voice_style: str
    ) -> Dict[str, str]:
        """Save audio files to S3 and return URLs"""
        
        try:
            bucket_name = settings.S3_AUDIO_BUCKET
            base_key = f"audio/{audio_content_id}/{voice_style}"
            
            # Save main audio
            main_key = f"{base_key}/main.wav"
            main_buffer = self._audio_to_buffer(main_audio)
            
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=main_key,
                Body=main_buffer,
                ContentType='audio/wav',
                CacheControl='max-age=31536000'  # 1 year cache
            )
            
            # Save summary audio
            summary_key = f"{base_key}/summary.wav"
            summary_buffer = self._audio_to_buffer(summary_audio)
            
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=summary_key,
                Body=summary_buffer,
                ContentType='audio/wav',
                CacheControl='max-age=31536000'
            )
            
            # Generate URLs
            main_url = f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{main_key}"
            summary_url = f"https://{bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{summary_key}"
            
            return {
                'main': main_url,
                'summary': summary_url
            }
            
        except ClientError as e:
            logger.error(f"Failed to save audio files to S3: {e}")
            raise
    
    def _audio_to_buffer(self, audio: np.ndarray) -> bytes:
        """Convert audio array to WAV buffer"""
        
        import io
        buffer = io.BytesIO()
        sf.write(buffer, audio, 22050, format='WAV')
        buffer.seek(0)
        return buffer.read()
    
    def _generate_cache_key(
        self,
        text: str,
        voice_style: str,
        user_preferences: Dict[str, Any] = None
    ) -> str:
        """Generate cache key for audio content"""
        
        content = f"{text}:{voice_style}:{json.dumps(user_preferences or {}, sort_keys=True)}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def _get_or_create_audio_content(self, content_id: int, voice_style: str) -> AudioContent:
        """Get existing or create new audio content record"""
        
        # Implementation would interact with database
        # This is a placeholder for the actual database interaction
        pass
    
    async def _update_audio_metadata(
        self,
        audio_content: AudioContent,
        chapters: List[Dict[str, Any]],
        audio_urls: Dict[str, str],
        duration: float
    ):
        """Update audio content metadata in database"""
        
        # Implementation would update database with audio metadata
        # This is a placeholder for the actual database interaction
        pass

# Initialize global audio service
audio_learning_service = AudioLearningService()
