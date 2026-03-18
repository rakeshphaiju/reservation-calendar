import uuid

from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from src.common.db import Base


class AppUser(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    calendar_slug = Column(String, nullable=False, unique=True, index=True)
    slot_capacity = Column(Integer, nullable=False, default=5, server_default="5")
