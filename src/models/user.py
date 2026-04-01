import uuid

from sqlalchemy import Boolean, Column, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from src.common.db import Base


class AppUser(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    calendar_slug = Column(String, nullable=False, unique=True, index=True)
    calendar_created = Column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    slot_capacity = Column(Integer, nullable=False, default=5, server_default="5")
    max_weeks = Column(Integer, nullable=False, default=4, server_default="4")
    time_slots = Column(Text, nullable=False, default="[]", server_default="[]")
    day_time_slots = Column(Text, nullable=False, default="{}", server_default="{}")
    bookable_days = Column(Text, nullable=False, default="[]", server_default="[]")
    calendar_description = Column(Text, nullable=True)
    calendar_location = Column(String, nullable=True)
