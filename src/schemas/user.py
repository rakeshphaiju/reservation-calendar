from pydantic import BaseModel, EmailStr, Field


class UserRegistrationRequest(BaseModel):
    username: str = Field(
        ..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    email: EmailStr
    fullname: str = Field(
        ..., min_length=2, max_length=100, pattern=r"^[a-zA-Z\s'\-\.]+$"
    )
    password: str = Field(..., min_length=8, max_length=128)


class UserResponse(BaseModel):
    username: str
    email: EmailStr | None = None
    fullname: str
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
