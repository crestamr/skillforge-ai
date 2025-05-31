"""
Conversational AI Coach API endpoints for SkillForge AI Backend
Provides DialoGPT-based career coaching and guidance
"""

from typing import Any, List, Dict, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
import logging
from datetime import datetime

# Import conversational AI services (with fallback for development)
try:
    from app.services.conversational_ai_service import (
        conversational_ai_service,
        ConversationContext
    )
    CONVERSATIONAL_AI_AVAILABLE = True
except ImportError:
    CONVERSATIONAL_AI_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class StartConversationRequest(BaseModel):
    user_id: str
    context: str = "general"
    user_profile: Optional[Dict[str, Any]] = None


class StartConversationResponse(BaseModel):
    session_id: str
    greeting: str
    context: str
    suggestions: List[str] = []
    timestamp: str


class SendMessageRequest(BaseModel):
    session_id: str
    message: str
    context: Optional[str] = None


class SendMessageResponse(BaseModel):
    session_id: str
    response: str
    context: str
    suggestions: List[str] = []
    metadata: Dict[str, Any] = {}
    timestamp: str


class ConversationHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    total_messages: int
    timestamp: str


class EndConversationResponse(BaseModel):
    session_id: str
    summary: str
    message_count: int
    duration: float
    ended_at: str


@router.get("/status")
async def conversational_ai_status():
    """Get conversational AI service status"""
    try:
        return {
            "status": "operational" if CONVERSATIONAL_AI_AVAILABLE else "limited",
            "conversational_ai_available": CONVERSATIONAL_AI_AVAILABLE,
            "message": "Conversational AI coach ready" if CONVERSATIONAL_AI_AVAILABLE else "Conversational AI in mock mode",
            "features": {
                "dialogpt_integration": CONVERSATIONAL_AI_AVAILABLE,
                "career_coaching": True,
                "context_awareness": True,
                "personalization": True,
                "conversation_history": True,
                "multi_context_support": True
            },
            "supported_contexts": [
                "general",
                "career_guidance", 
                "skill_development",
                "job_search",
                "interview_prep",
                "salary_negotiation",
                "career_transition"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Conversational AI status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversational AI status check failed: {str(e)}"
        )


@router.post("/start", response_model=StartConversationResponse)
async def start_conversation(request: StartConversationRequest):
    """Start a new conversation with the AI career coach"""
    try:
        if CONVERSATIONAL_AI_AVAILABLE:
            # Convert context string to enum
            try:
                context = ConversationContext(request.context)
            except ValueError:
                context = ConversationContext.GENERAL
            
            # Start conversation
            session_id = await conversational_ai_service.start_conversation(
                user_id=request.user_id,
                context=context,
                user_profile=request.user_profile
            )
            
            # Get the greeting message
            history = await conversational_ai_service.get_conversation_history(session_id)
            greeting = history[0]["content"] if history else "Hello! How can I help you today?"
            
            # Generate initial suggestions
            suggestions = [
                "Tell me about your career goals",
                "What challenges are you facing?",
                "How can I help you grow professionally?"
            ]
            
            if context != ConversationContext.GENERAL:
                context_suggestions = {
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
                suggestions = context_suggestions.get(context, suggestions)
        
        else:
            # Mock response for development
            session_id = f"mock_session_{request.user_id}_{datetime.utcnow().timestamp()}"
            
            context_greetings = {
                "career_guidance": "Hello! I'm excited to help you explore your career path and set meaningful goals. What would you like to discuss today?",
                "skill_development": "Hi there! Let's work together to identify and develop the skills that will advance your career. What skills are you interested in?",
                "job_search": "Welcome! I'm here to guide you through your job search journey. What type of opportunities are you looking for?",
                "interview_prep": "Hello! Let's prepare you for interview success. What kind of interview are you getting ready for?",
                "general": "Hello! I'm your AI career coach, here to help you achieve your professional goals. What would you like to discuss?"
            }
            
            greeting = context_greetings.get(request.context, context_greetings["general"])
            suggestions = [
                "Tell me about your career goals",
                "What challenges are you facing?",
                "How can I help you today?"
            ]
        
        return StartConversationResponse(
            session_id=session_id,
            greeting=greeting,
            context=request.context,
            suggestions=suggestions,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start conversation: {str(e)}"
        )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(request: SendMessageRequest):
    """Send a message to the AI career coach"""
    try:
        if CONVERSATIONAL_AI_AVAILABLE:
            # Convert context string to enum if provided
            context = None
            if request.context:
                try:
                    context = ConversationContext(request.context)
                except ValueError:
                    context = ConversationContext.GENERAL
            
            # Send message and get response
            response = await conversational_ai_service.send_message(
                session_id=request.session_id,
                message=request.message,
                context=context
            )
            
            return SendMessageResponse(
                session_id=response["session_id"],
                response=response["response"],
                context=response["context"],
                suggestions=response.get("suggestions", []),
                metadata=response.get("metadata", {}),
                timestamp=response["timestamp"]
            )
        
        else:
            # Mock response for development
            mock_responses = [
                "That's a great question! Based on your experience, I'd recommend focusing on developing both technical and leadership skills.",
                "I understand your concern. Career transitions can be challenging, but with the right strategy, you can successfully navigate this change.",
                "Excellent point! Networking is indeed crucial for career growth. Have you considered joining professional associations in your field?",
                "That's an interesting perspective. Let's explore how you can leverage your current skills in new ways.",
                "I appreciate you sharing that with me. Building confidence is key to career success. What specific areas would you like to work on?"
            ]
            
            # Simple response selection based on message content
            response_index = len(request.message) % len(mock_responses)
            mock_response = mock_responses[response_index]
            
            suggestions = [
                "Tell me more about that",
                "What's your biggest challenge?",
                "How can I help you with this?"
            ]
            
            return SendMessageResponse(
                session_id=request.session_id,
                response=mock_response,
                context=request.context or "general",
                suggestions=suggestions,
                metadata={"response_type": "mock"},
                timestamp=datetime.utcnow().isoformat()
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/history/{session_id}", response_model=ConversationHistoryResponse)
async def get_conversation_history(session_id: str):
    """Get conversation history for a session"""
    try:
        if CONVERSATIONAL_AI_AVAILABLE:
            history = await conversational_ai_service.get_conversation_history(session_id)
            
            return ConversationHistoryResponse(
                session_id=session_id,
                messages=history,
                total_messages=len(history),
                timestamp=datetime.utcnow().isoformat()
            )
        
        else:
            # Mock history for development
            mock_history = [
                {
                    "role": "assistant",
                    "content": "Hello! I'm your AI career coach. How can I help you today?",
                    "timestamp": datetime.utcnow().isoformat(),
                    "context": "general",
                    "metadata": {}
                },
                {
                    "role": "user",
                    "content": "I want to advance my career in software development",
                    "timestamp": datetime.utcnow().isoformat(),
                    "context": "career_guidance",
                    "metadata": {}
                },
                {
                    "role": "assistant",
                    "content": "That's excellent! Software development offers many growth opportunities. What specific areas interest you most?",
                    "timestamp": datetime.utcnow().isoformat(),
                    "context": "career_guidance",
                    "metadata": {"response_type": "mock"}
                }
            ]
            
            return ConversationHistoryResponse(
                session_id=session_id,
                messages=mock_history,
                total_messages=len(mock_history),
                timestamp=datetime.utcnow().isoformat()
            )
        
    except Exception as e:
        logger.error(f"Failed to get conversation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )


@router.post("/end/{session_id}", response_model=EndConversationResponse)
async def end_conversation(session_id: str):
    """End a conversation session"""
    try:
        if CONVERSATIONAL_AI_AVAILABLE:
            result = await conversational_ai_service.end_conversation(session_id)
            
            if "error" in result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=result["error"]
                )
            
            return EndConversationResponse(
                session_id=result["session_id"],
                summary=result["summary"],
                message_count=result["message_count"],
                duration=result["duration"],
                ended_at=result["ended_at"]
            )
        
        else:
            # Mock end conversation for development
            return EndConversationResponse(
                session_id=session_id,
                summary="Mock conversation about career development and professional growth",
                message_count=5,
                duration=300.0,  # 5 minutes
                ended_at=datetime.utcnow().isoformat()
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end conversation: {str(e)}"
        )


@router.get("/contexts")
async def get_conversation_contexts():
    """Get available conversation contexts"""
    try:
        contexts = [
            {
                "id": "general",
                "name": "General Career Coaching",
                "description": "Open-ended career discussions and general guidance"
            },
            {
                "id": "career_guidance",
                "name": "Career Guidance",
                "description": "Career path planning, goal setting, and professional development"
            },
            {
                "id": "skill_development",
                "name": "Skill Development",
                "description": "Learning new skills, certifications, and competency building"
            },
            {
                "id": "job_search",
                "name": "Job Search",
                "description": "Job hunting strategies, resume optimization, and application guidance"
            },
            {
                "id": "interview_prep",
                "name": "Interview Preparation",
                "description": "Interview practice, question preparation, and confidence building"
            },
            {
                "id": "salary_negotiation",
                "name": "Salary Negotiation",
                "description": "Compensation discussions, negotiation strategies, and market research"
            },
            {
                "id": "career_transition",
                "name": "Career Transition",
                "description": "Changing careers, industry transitions, and role pivots"
            }
        ]
        
        return {
            "contexts": contexts,
            "total_contexts": len(contexts),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get conversation contexts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation contexts: {str(e)}"
        )
