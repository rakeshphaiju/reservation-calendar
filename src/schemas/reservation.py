import re
import uuid
from datetime import datetime
from typing import List

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

VALID_BOOKABLE_DAYS = {
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
}
BOOKABLE_DAY_ORDER = (
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
)


class ReservationCreate(BaseModel):
    name: str = Field(..., min_length=2)
    address: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., pattern=r"^\d{10}$")
    day: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str

    @field_validator("day")
    @classmethod
    def validate_day(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError("Day must be a valid date in YYYY-MM-DD format") from exc
        return value

    @field_validator("time")
    @classmethod
    def validate_time(cls, value: str) -> str:
        trimmed = value.strip()
        if not re.fullmatch(r"^\d{2}:\d{2}-\d{2}:\d{2}$", trimmed):
            raise ValueError("Time must be in HH:MM-HH:MM format")
        start, end = trimmed.split("-")

        try:
            start_time = datetime.strptime(start, "%H:%M")
            end_time = datetime.strptime(end, "%H:%M")
        except ValueError as exc:
            raise ValueError("Time must use valid 24-hour values") from exc

        if start_time >= end_time:
            raise ValueError("Time must end after it starts")

        return trimmed


class ReservationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    day: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str

    @field_validator("day")
    @classmethod
    def validate_day(cls, value: str) -> str:
        return ReservationCreate.validate_day(value)

    @field_validator("time")
    @classmethod
    def validate_time(cls, value: str) -> str:
        return ReservationCreate.validate_time(value)


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    owner_slug: str
    reservation_key: str | None = None
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
    max_weeks: int
    time_slots: List[str]
    day_time_slots: dict[str, List[str]]
    bookable_days: List[str]
    calendar_description: str | None = None
    calendar_location: str | None = None
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


class MaxWeeksUpdate(BaseModel):
    max_weeks: int = Field(..., ge=1, le=52)


class TimeSlotsUpdate(BaseModel):
    time_slots: List[str] | None = Field(default=None, min_length=1, max_length=50)
    day_time_slots: dict[str, List[str]] | None = Field(
        default=None, min_length=1, max_length=7
    )

    @classmethod
    def _normalize_slots(cls, value: List[str]) -> List[str]:
        normalized: List[str] = []
        seen = set()

        for slot in value:
            trimmed = slot.strip()
            if not re.fullmatch(r"^\d{2}:\d{2}-\d{2}:\d{2}$", trimmed):
                raise ValueError("Each time slot must be in HH:MM-HH:MM format")
            start, end = trimmed.split("-")
            if start >= end:
                raise ValueError("Each time slot must end after it starts")
            if trimmed in seen:
                continue
            seen.add(trimmed)
            normalized.append(trimmed)

        if not normalized:
            raise ValueError("At least one time slot is required")

        return normalized

    @field_validator("time_slots")
    @classmethod
    def validate_time_slots(cls, value: List[str] | None) -> List[str] | None:
        if value is None:
            return None
        return cls._normalize_slots(value)

    @field_validator("day_time_slots")
    @classmethod
    def validate_day_time_slots(
        cls, value: dict[str, List[str]] | None
    ) -> dict[str, List[str]] | None:
        if value is None:
            return None

        normalized: dict[str, List[str]] = {}
        for day, slots in value.items():
            trimmed_day = day.strip()
            if trimmed_day not in VALID_BOOKABLE_DAYS:
                raise ValueError("Each day must be a valid weekday name")
            normalized[trimmed_day] = cls._normalize_slots(slots)

        if not normalized:
            raise ValueError("At least one weekday schedule is required")

        return normalized

    @model_validator(mode="after")
    def validate_payload(self):
        if self.day_time_slots:
            return self
        if self.time_slots:
            self.day_time_slots = {
                day: self.time_slots.copy() for day in BOOKABLE_DAY_ORDER
            }
            return self
        raise ValueError("At least one time slot is required")

    def get_day_time_slots(self) -> dict[str, List[str]]:
        return self.day_time_slots or {}


class BookableDaysUpdate(BaseModel):
    bookable_days: List[str] = Field(..., min_length=1, max_length=7)

    @field_validator("bookable_days")
    @classmethod
    def validate_bookable_days(cls, value: List[str]) -> List[str]:
        normalized: List[str] = []
        seen = set()

        for day in value:
            trimmed = day.strip()
            if trimmed not in VALID_BOOKABLE_DAYS:
                raise ValueError("Each day must be a valid weekday name")
            if trimmed in seen:
                continue
            seen.add(trimmed)
            normalized.append(trimmed)

        if not normalized:
            raise ValueError("At least one bookable day is required")

        return normalized


class CalendarDetailsUpdate(BaseModel):
    calendar_description: str | None = Field(default=None, max_length=2000)
    calendar_location: str | None = Field(default=None, max_length=255)

    @field_validator("calendar_description", "calendar_location")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None
