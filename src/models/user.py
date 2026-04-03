import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from src.common.db import Base


class AppUser(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    calendar = relationship(
        "UserCalendar",
        back_populates="user",
        uselist=False,
        lazy="joined",
        cascade="all, delete-orphan",
        single_parent=True,
        passive_deletes=True,
    )

    def __init__(self, **kwargs):
        calendar_fields = {
            "calendar_slug",
            "calendar_description",
            "calendar_location",
            "slot_capacity",
            "max_weeks",
            "time_slots",
            "day_time_slots",
            "bookable_days",
            "calendar_created",
        }
        calendar_kwargs = {
            field: kwargs.pop(field)
            for field in tuple(calendar_fields)
            if field in kwargs
        }
        super().__init__(**kwargs)
        if calendar_kwargs:
            self.calendar = UserCalendar(**calendar_kwargs)

    @property
    def calendar_slug(self):
        return self.calendar.calendar_slug if self.calendar else self.username

    @property
    def calendar_description(self):
        return self.calendar.calendar_description if self.calendar else None

    @property
    def calendar_location(self):
        return self.calendar.calendar_location if self.calendar else None

    @property
    def slot_capacity(self):
        return self.calendar.slot_capacity if self.calendar else 5

    @property
    def max_weeks(self):
        return self.calendar.max_weeks if self.calendar else 4

    @property
    def time_slots(self):
        return self.calendar.time_slots if self.calendar else "[]"

    @property
    def day_time_slots(self):
        return self.calendar.day_time_slots if self.calendar else "{}"

    @property
    def bookable_days(self):
        return self.calendar.bookable_days if self.calendar else "[]"

    @property
    def calendar_created(self):
        return self.calendar.calendar_created if self.calendar else False


class UserCalendar(Base):
    __tablename__ = "user_calendars"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    calendar_slug = Column(String, nullable=False, unique=True, index=True)
    calendar_description = Column(Text, nullable=True)
    calendar_location = Column(String, nullable=True)
    slot_capacity = Column(Integer, nullable=False, default=5, server_default="5")
    max_weeks = Column(Integer, nullable=False, default=4, server_default="4")
    time_slots = Column(Text, nullable=False, default="[]", server_default="[]")
    day_time_slots = Column(Text, nullable=False, default="{}", server_default="{}")
    bookable_days = Column(Text, nullable=False, default="[]", server_default="[]")
    calendar_created = Column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("AppUser", back_populates="calendar")
