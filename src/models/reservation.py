from sqlalchemy import Column, Integer, String
from sqlalchemy.dialects.postgresql import UUID
import uuid
from src.common.db import Base


class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    food = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    day = Column(String, nullable=False)
    time = Column(String, nullable=False)
