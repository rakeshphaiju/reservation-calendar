from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from datetime import datetime, timezone

from src.common.db import Base


class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    owner_slug = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    day = Column(String, nullable=False)
    time = Column(String, nullable=False)
    reservation_key = Column(String, nullable=True, unique=True, index=True)
    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
