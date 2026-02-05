from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ChatMessageBase(BaseModel):
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ChatMessageCreate(ChatMessageBase):
    session_token: Optional[str] = None


class ChatMessageResponse(ChatMessageBase):
    id: uuid.UUID
    session_id: uuid.UUID
    created_at: datetime
    reservation_id: Optional[uuid.UUID] = None


class ChatRequest(BaseModel):
    message: str
    session_token: Optional[str] = None
    include_availability: bool = True
    date_filter: Optional[str] = None  # Format: YYYY-MM-DD


class ChatResponse(BaseModel):
    message: str
    session_token: str
    suggestions: List[str] = []
    available_slots: Optional[List[Dict[str, Any]]] = None
    needs_human_assistance: bool = False
    metadata: Optional[Dict[str, Any]] = None


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    session_token: str
    created_at: datetime
    updated_at: Optional[datetime]
    message_count: int


class AvailableSlot(BaseModel):
    day: str
    time: str
    available: bool
    conflicting_reservations: Optional[int] = 0
    suggested_alternative: Optional[str] = None