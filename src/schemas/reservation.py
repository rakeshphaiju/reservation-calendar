import uuid
from typing import Literal, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ReservationCreate(BaseModel):
    name: str = Field(..., min_length=2)
    address: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., pattern=r"^\d{10}$")
    day: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: Literal[
        "10:00-11:00",
        "11:00-12:00",
        "12:00-13:00",
        "13:00-14:00",
        "15:00-16:00",
        "16:00-17:00",
        "17:00-18:00",
    ]


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    owner_slug: str
    name: str
    email: str
    address: str
    phone_number: str
    day: str
    time: str


class ReservationSlot(BaseModel):
    day: str
    time: str
    count: int


class CalendarSlotSummary(BaseModel):
    day: str
    time: str
    count: int
    capacity: int


class CalendarAvailabilityResponse(BaseModel):
    owner_slug: str
    slot_capacity: int
    slots: List[CalendarSlotSummary]


class PaginatedReservations(BaseModel):
    total_count: int
    skip: int
    limit: int
    data: List[ReservationResponse]


class CalendarOwnerSummary(BaseModel):
    username: str
    calendar_slug: str


class SlotCapacityUpdate(BaseModel):
    slot_capacity: int = Field(..., ge=1, le=100)
