from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List
import uuid

from src.common.db import get_db
from src.models.chatbot import ChatSession, ChatMessage
from src.schemas.chatbot import ChatRequest, ChatResponse, ChatSessionResponse
from src.services.chatbot_service import chatbot

router = APIRouter()


@router.post("/api/chatbot/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Chat with the reservation assistant
    """
    # Get or create chat session
    session = None
    if request.session_token:
        result = await db.execute(
            select(ChatSession).where(ChatSession.session_token == request.session_token)
        )
        session = result.scalars().first()
    
    if not session:
        # Create new session
        session = ChatSession(session_token=str(uuid.uuid4()))
        db.add(session)
        await db.commit()
        await db.refresh(session)
    
    try:
        # Generate chatbot response
        result = await chatbot.generate_chat_response(
            db=db,
            user_message=request.message,
            session_token=session.session_token,
            include_availability=request.include_availability,
            date_filter=request.date_filter
        )
        
        # Save conversation in background
        background_tasks.add_task(
            _save_conversation,
            db,
            session.id,
            request.message,
            result["message"],
            result.get("metadata", {})
        )
        
        return ChatResponse(
            message=result["message"],
            session_token=session.session_token,
            suggestions=result["suggestions"],
            available_slots=result.get("available_slots"),
            needs_human_assistance=result["needs_human_assistance"],
            metadata=result.get("metadata")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chatbot error: {str(e)}")


@router.get("/api/chatbot/sessions/{session_token}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Get chat session information"""
    result = await db.execute(
        select(ChatSession).where(ChatSession.session_token == session_token)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Get message count
    message_count_result = await db.execute(
        select(func.count()).where(ChatMessage.session_id == session.id)
    )
    message_count = message_count_result.scalar()
    
    return ChatSessionResponse(
        id=session.id,
        session_token=session.session_token,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=message_count
    )


@router.get("/api/chatbot/availability")
async def get_availability(
    date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots directly"""
    available_slots = await chatbot.find_available_slots(
        db, date_filter=date
    )
    
    # Format response
    available_times = []
    for slot in available_slots:
        if slot["available"]:
            available_times.append({
                "day": slot["day"],
                "time": slot["time"],
                "capacity_remaining": slot["max_capacity"] - slot["capacity_used"]
            })
    
    return {
        "date_filter": date,
        "available_slots": available_times,
        "total_available": len(available_times)
    }


@router.get("/api/chatbot/suggestions")
async def get_suggested_questions():
    """Get suggested questions to ask the chatbot"""
    suggestions = [
        "What times are available for Friday?",
        "Can I make a reservation for 4 people?",
        "Do you have vegetarian options?",
        "What's your cancellation policy?",
        "Are you open on Sundays?",
        "Can I modify my existing reservation?",
        "What's on your menu?",
        "Do you take walk-ins?"
    ]
    
    return {"suggestions": suggestions}


async def _save_conversation(
    db: AsyncSession,
    session_id: uuid.UUID,
    user_message: str,
    bot_response: str,
    metadata: dict
):
    """Save conversation to database (run in background)"""
    try:
        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=user_message,
            extra_data={"intent": metadata.get("intent", {})}
        )
        db.add(user_msg)
        
        # Save bot response
        bot_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=bot_response,
            extra_data={
                "token_usage": metadata.get("token_usage", {}),
                "suggestions": metadata.get("suggestions", [])
            }
        )
        db.add(bot_msg)
        
        await db.commit()
    except Exception as e:
        # Log error but don't fail the request
        print(f"Error saving conversation: {e}")