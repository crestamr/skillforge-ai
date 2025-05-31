"""
Conversational AI Coach Service for SkillForge AI Backend
Implements DialoGPT-based career coaching and guidance
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
import json
import re
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

# Import AI services (with fallback for development)
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)


class ConversationContext(Enum):
    """Conversation context types"""
    CAREER_GUIDANCE = "career_guidance"
    SKILL_DEVELOPMENT = "skill_development"
    JOB_SEARCH = "job_search"
    INTERVIEW_PREP = "interview_prep"
    SALARY_NEGOTIATION = "salary_negotiation"
    CAREER_TRANSITION = "career_transition"
    GENERAL = "general"


@dataclass
class ConversationMessage:
    """Individual conversation message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    context: ConversationContext
    metadata: Dict[str, Any] = None


@dataclass
class ConversationSession:
    """Conversation session with context"""
    session_id: str
    user_id: str
    messages: List[ConversationMessage]
    context: ConversationContext
    user_profile: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True


class ConversationalAIService:
    """Advanced conversational AI coach using DialoGPT and career expertise"""
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.conversation_sessions = {}  # In-memory storage for demo
        self.career_knowledge_base = self._load_career_knowledge()
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize DialoGPT model and tokenizer"""
        try:
            if TRANSFORMERS_AVAILABLE:
                logger.info("Initializing DialoGPT model...")
                
                # Use DialoGPT-medium for better responses
                model_name = "microsoft/DialoGPT-medium"
                
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForCausalLM.from_pretrained(model_name)
                
                # Add padding token if not present
                if self.tokenizer.pad_token is None:
                    self.tokenizer.pad_token = self.tokenizer.eos_token
                
                logger.info("DialoGPT model initialized successfully")
            else:
                logger.warning("Transformers not available, using mock responses")
                
        except Exception as e:
            logger.error(f"Error initializing DialoGPT model: {e}")
    
    def _load_career_knowledge(self) -> Dict[str, Any]:
        """Load career coaching knowledge base"""
        return {
            "career_guidance": {
                "keywords": ["career", "path", "direction", "goals", "future", "growth"],
                "responses": [
                    "Let's explore your career aspirations. What industry or role interests you most?",
                    "Career growth often comes from combining your strengths with market opportunities.",
                    "What specific career goals would you like to achieve in the next 2-3 years?"
                ]
            },
            "skill_development": {
                "keywords": ["skill", "learn", "improve", "training", "course", "certification"],
                "responses": [
                    "Skill development is key to career advancement. What skills are you most interested in developing?",
                    "Based on market trends, I'd recommend focusing on both technical and soft skills.",
                    "What's your preferred learning style - hands-on projects, courses, or mentorship?"
                ]
            },
            "job_search": {
                "keywords": ["job", "position", "opportunity", "application", "resume", "interview"],
                "responses": [
                    "Job searching can be challenging. Let's create a strategic approach for your search.",
                    "What type of roles are you targeting, and what's your timeline?",
                    "A strong job search combines networking, online applications, and personal branding."
                ]
            },
            "interview_prep": {
                "keywords": ["interview", "preparation", "questions", "answers", "nervous", "practice"],
                "responses": [
                    "Interview preparation is crucial for success. What type of interview are you preparing for?",
                    "Let's practice common interview questions and develop compelling answers.",
                    "Remember: interviews are conversations. Show your personality and ask thoughtful questions."
                ]
            },
            "salary_negotiation": {
                "keywords": ["salary", "compensation", "negotiate", "pay", "benefits", "offer"],
                "responses": [
                    "Salary negotiation is an important skill. Do you have a specific offer to discuss?",
                    "Research market rates for your role and location before negotiating.",
                    "Remember to consider the total compensation package, not just base salary."
                ]
            }
        }
    
    async def start_conversation(
        self, 
        user_id: str, 
        context: ConversationContext = ConversationContext.GENERAL,
        user_profile: Dict[str, Any] = None
    ) -> str:
        """Start a new conversation session"""
        try:
            session_id = f"session_{user_id}_{datetime.utcnow().timestamp()}"
            
            session = ConversationSession(
                session_id=session_id,
                user_id=user_id,
                messages=[],
                context=context,
                user_profile=user_profile or {},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            self.conversation_sessions[session_id] = session
            
            # Generate personalized greeting
            greeting = self._generate_greeting(context, user_profile)
            
            # Add greeting message
            greeting_message = ConversationMessage(
                role="assistant",
                content=greeting,
                timestamp=datetime.utcnow(),
                context=context
            )
            session.messages.append(greeting_message)
            
            logger.info(f"Started conversation session {session_id} for user {user_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Error starting conversation: {e}")
            raise
    
    async def send_message(
        self, 
        session_id: str, 
        message: str,
        context: ConversationContext = None
    ) -> Dict[str, Any]:
        """Send a message and get AI response"""
        try:
            if session_id not in self.conversation_sessions:
                raise ValueError(f"Session {session_id} not found")
            
            session = self.conversation_sessions[session_id]
            
            # Add user message
            user_message = ConversationMessage(
                role="user",
                content=message,
                timestamp=datetime.utcnow(),
                context=context or session.context
            )
            session.messages.append(user_message)
            
            # Generate AI response
            response = await self._generate_response(session, message)
            
            # Add AI response
            ai_message = ConversationMessage(
                role="assistant",
                content=response["content"],
                timestamp=datetime.utcnow(),
                context=context or session.context,
                metadata=response.get("metadata", {})
            )
            session.messages.append(ai_message)
            
            session.updated_at = datetime.utcnow()
            
            return {
                "session_id": session_id,
                "response": response["content"],
                "context": ai_message.context.value,
                "suggestions": response.get("suggestions", []),
                "metadata": response.get("metadata", {}),
                "timestamp": ai_message.timestamp.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            return {
                "session_id": session_id,
                "response": "I apologize, but I'm having trouble processing your message right now. Could you please try again?",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _generate_response(
        self, 
        session: ConversationSession, 
        user_message: str
    ) -> Dict[str, Any]:
        """Generate AI response using DialoGPT and career knowledge"""
        try:
            # Analyze message context
            detected_context = self._detect_context(user_message)
            
            # Get career-specific response if applicable
            career_response = self._get_career_response(user_message, detected_context, session)
            
            if career_response:
                return career_response
            
            # Use DialoGPT for general conversation
            if self.model and self.tokenizer:
                dialogpt_response = await self._generate_dialogpt_response(session, user_message)
                
                # Enhance with career coaching elements
                enhanced_response = self._enhance_with_career_coaching(
                    dialogpt_response, detected_context, session
                )
                
                return enhanced_response
            else:
                # Fallback response
                return self._generate_fallback_response(user_message, detected_context, session)
                
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return {
                "content": "I'm here to help with your career development. Could you tell me more about what you'd like to discuss?",
                "metadata": {"error": str(e)}
            }
    
    async def _generate_dialogpt_response(
        self, 
        session: ConversationSession, 
        user_message: str
    ) -> str:
        """Generate response using DialoGPT model"""
        try:
            # Prepare conversation history
            conversation_history = []
            for msg in session.messages[-5:]:  # Last 5 messages for context
                conversation_history.append(msg.content)
            
            conversation_history.append(user_message)
            
            # Encode conversation
            input_text = " ".join(conversation_history)
            input_ids = self.tokenizer.encode(input_text, return_tensors="pt")
            
            # Generate response
            with torch.no_grad():
                output = self.model.generate(
                    input_ids,
                    max_length=input_ids.shape[1] + 50,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )
            
            # Decode response
            response = self.tokenizer.decode(
                output[0][input_ids.shape[1]:], 
                skip_special_tokens=True
            ).strip()
            
            return response if response else "I understand. Could you tell me more about that?"
            
        except Exception as e:
            logger.error(f"Error with DialoGPT generation: {e}")
            return "I'm here to help. Could you elaborate on what you'd like to discuss?"
    
    def _detect_context(self, message: str) -> ConversationContext:
        """Detect conversation context from user message"""
        message_lower = message.lower()
        
        for context_name, context_data in self.career_knowledge_base.items():
            keywords = context_data.get("keywords", [])
            if any(keyword in message_lower for keyword in keywords):
                return ConversationContext(context_name)
        
        return ConversationContext.GENERAL
    
    def _get_career_response(
        self, 
        message: str, 
        context: ConversationContext, 
        session: ConversationSession
    ) -> Optional[Dict[str, Any]]:
        """Get career-specific response based on context"""
        try:
            if context == ConversationContext.GENERAL:
                return None
            
            context_data = self.career_knowledge_base.get(context.value, {})
            responses = context_data.get("responses", [])
            
            if not responses:
                return None
            
            # Select appropriate response (simple round-robin for demo)
            response_index = len(session.messages) % len(responses)
            base_response = responses[response_index]
            
            # Personalize based on user profile
            personalized_response = self._personalize_response(
                base_response, session.user_profile, context
            )
            
            # Generate suggestions
            suggestions = self._generate_suggestions(context, session.user_profile)
            
            return {
                "content": personalized_response,
                "suggestions": suggestions,
                "metadata": {
                    "context": context.value,
                    "response_type": "career_specific"
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting career response: {e}")
            return None
    
    def _personalize_response(
        self, 
        base_response: str, 
        user_profile: Dict[str, Any], 
        context: ConversationContext
    ) -> str:
        """Personalize response based on user profile"""
        try:
            if not user_profile:
                return base_response
            
            # Add personalization based on available profile data
            experience_years = user_profile.get("experience_years", 0)
            skills = user_profile.get("skills", [])
            career_level = user_profile.get("career_level", "")
            
            personalization = ""
            
            if experience_years > 0:
                if experience_years < 2:
                    personalization += "As someone early in your career, "
                elif experience_years < 5:
                    personalization += "With your mid-level experience, "
                else:
                    personalization += "Given your senior-level experience, "
            
            if skills:
                top_skills = [skill.get("skill", "") for skill in skills[:3]]
                if top_skills:
                    personalization += f"considering your expertise in {', '.join(top_skills)}, "
            
            return personalization + base_response.lower() if personalization else base_response
            
        except Exception as e:
            logger.error(f"Error personalizing response: {e}")
            return base_response
    
    def _generate_suggestions(
        self, 
        context: ConversationContext, 
        user_profile: Dict[str, Any]
    ) -> List[str]:
        """Generate conversation suggestions based on context"""
        suggestions_map = {
            ConversationContext.CAREER_GUIDANCE: [
                "What are my career strengths?",
                "How do I set career goals?",
                "What industries should I consider?"
            ],
            ConversationContext.SKILL_DEVELOPMENT: [
                "What skills are in demand?",
                "How do I learn new technologies?",
                "Should I get certifications?"
            ],
            ConversationContext.JOB_SEARCH: [
                "How do I improve my resume?",
                "Where should I look for jobs?",
                "How do I network effectively?"
            ],
            ConversationContext.INTERVIEW_PREP: [
                "What are common interview questions?",
                "How do I handle technical interviews?",
                "What questions should I ask?"
            ]
        }
        
        return suggestions_map.get(context, [
            "Tell me about your career goals",
            "What challenges are you facing?",
            "How can I help you today?"
        ])
    
    def _enhance_with_career_coaching(
        self, 
        base_response: str, 
        context: ConversationContext, 
        session: ConversationSession
    ) -> Dict[str, Any]:
        """Enhance DialoGPT response with career coaching elements"""
        try:
            # Add career coaching tone and suggestions
            enhanced_response = base_response
            
            # Add follow-up questions based on context
            if context != ConversationContext.GENERAL:
                follow_ups = {
                    ConversationContext.CAREER_GUIDANCE: " What specific career goals are you working towards?",
                    ConversationContext.SKILL_DEVELOPMENT: " Which skills would you like to focus on developing?",
                    ConversationContext.JOB_SEARCH: " What type of roles are you most interested in?",
                    ConversationContext.INTERVIEW_PREP: " What kind of interview are you preparing for?"
                }
                
                follow_up = follow_ups.get(context, "")
                if follow_up:
                    enhanced_response += follow_up
            
            suggestions = self._generate_suggestions(context, session.user_profile)
            
            return {
                "content": enhanced_response,
                "suggestions": suggestions,
                "metadata": {
                    "context": context.value,
                    "response_type": "enhanced_dialogpt"
                }
            }
            
        except Exception as e:
            logger.error(f"Error enhancing response: {e}")
            return {
                "content": base_response,
                "metadata": {"error": str(e)}
            }
    
    def _generate_fallback_response(
        self, 
        message: str, 
        context: ConversationContext, 
        session: ConversationSession
    ) -> Dict[str, Any]:
        """Generate fallback response when models aren't available"""
        fallback_responses = [
            "That's an interesting point. Could you tell me more about your specific situation?",
            "I understand your concern. What would you like to focus on first?",
            "Let's explore that together. What's your main goal in this area?",
            "That's a great question. What's been your experience with this so far?",
            "I'm here to help you succeed. What specific guidance are you looking for?"
        ]
        
        # Simple response selection based on message length
        response_index = len(message) % len(fallback_responses)
        response = fallback_responses[response_index]
        
        suggestions = self._generate_suggestions(context, session.user_profile)
        
        return {
            "content": response,
            "suggestions": suggestions,
            "metadata": {
                "context": context.value,
                "response_type": "fallback"
            }
        }
    
    def _generate_greeting(
        self, 
        context: ConversationContext, 
        user_profile: Dict[str, Any]
    ) -> str:
        """Generate personalized greeting message"""
        try:
            base_greeting = "Hello! I'm your AI career coach, here to help you achieve your professional goals."
            
            context_greetings = {
                ConversationContext.CAREER_GUIDANCE: "I'm excited to help you explore your career path and set meaningful goals.",
                ConversationContext.SKILL_DEVELOPMENT: "Let's work together to identify and develop the skills that will advance your career.",
                ConversationContext.JOB_SEARCH: "I'm here to guide you through your job search journey and help you find the right opportunities.",
                ConversationContext.INTERVIEW_PREP: "Let's prepare you for interview success with practice and strategic guidance.",
                ConversationContext.SALARY_NEGOTIATION: "I'll help you approach salary negotiations with confidence and strategy."
            }
            
            context_specific = context_greetings.get(context, "")
            
            if user_profile:
                name = user_profile.get("name", "")
                if name:
                    base_greeting = f"Hello {name}! " + base_greeting[6:]  # Remove "Hello!"
            
            full_greeting = base_greeting
            if context_specific:
                full_greeting += f" {context_specific}"
            
            full_greeting += " What would you like to discuss today?"
            
            return full_greeting
            
        except Exception as e:
            logger.error(f"Error generating greeting: {e}")
            return "Hello! I'm your AI career coach. How can I help you today?"
    
    async def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for a session"""
        try:
            if session_id not in self.conversation_sessions:
                return []
            
            session = self.conversation_sessions[session_id]
            
            history = []
            for message in session.messages:
                history.append({
                    "role": message.role,
                    "content": message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "context": message.context.value,
                    "metadata": message.metadata or {}
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting conversation history: {e}")
            return []
    
    async def end_conversation(self, session_id: str) -> Dict[str, Any]:
        """End a conversation session"""
        try:
            if session_id not in self.conversation_sessions:
                return {"error": "Session not found"}
            
            session = self.conversation_sessions[session_id]
            session.is_active = False
            session.updated_at = datetime.utcnow()
            
            # Generate conversation summary
            summary = self._generate_conversation_summary(session)
            
            return {
                "session_id": session_id,
                "summary": summary,
                "message_count": len(session.messages),
                "duration": (session.updated_at - session.created_at).total_seconds(),
                "ended_at": session.updated_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error ending conversation: {e}")
            return {"error": str(e)}
    
    def _generate_conversation_summary(self, session: ConversationSession) -> str:
        """Generate a summary of the conversation"""
        try:
            if not session.messages:
                return "No messages in this conversation."
            
            user_messages = [msg for msg in session.messages if msg.role == "user"]
            
            if not user_messages:
                return "Conversation consisted only of system messages."
            
            # Simple summary based on context and message count
            context_summaries = {
                ConversationContext.CAREER_GUIDANCE: "Discussed career goals and professional development",
                ConversationContext.SKILL_DEVELOPMENT: "Explored skill development opportunities and learning paths",
                ConversationContext.JOB_SEARCH: "Covered job search strategies and opportunities",
                ConversationContext.INTERVIEW_PREP: "Prepared for upcoming interviews and practice sessions",
                ConversationContext.SALARY_NEGOTIATION: "Discussed salary negotiation strategies and tactics"
            }
            
            base_summary = context_summaries.get(
                session.context, 
                "General career coaching conversation"
            )
            
            return f"{base_summary}. Exchanged {len(session.messages)} messages over {len(user_messages)} user interactions."
            
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return "Conversation summary unavailable."


# Global conversational AI service instance
conversational_ai_service = ConversationalAIService()
