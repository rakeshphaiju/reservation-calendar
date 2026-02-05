from pydantic import BaseModel
import uuid
from typing import Optional


class ReservationCreate(BaseModel):
    name: str
    address: str
    phone_number: str
    food: str
    quantity: int
    day: str
    time: str


class ReservationResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    phone_number: str
    food: str
    quantity: int
    day: str
    time: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None