from pydantic import BaseModel, EmailStr, Field


class UserRegistrationRequest(BaseModel):
    email: EmailStr
    service_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Public-facing service or business name (used for your calendar URL slug).",
    )
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    email: EmailStr | None = None
    service_name: str
    calendar_slug: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    )
    calendar_created: bool = True
    slot_capacity: int
    max_weeks: int
    time_slots: list[str]
    day_time_slots: dict[str, list[str]]
    bookable_days: list[str]
    calendar_description: str | None = None
    calendar_location: str | None = None
    authenticated: bool = True
