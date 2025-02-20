from sqlalchemy import Column, Integer, String
from src.common.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False) 
    phone_number = Column(String, nullable=False)
    ruoka = Column(String, nullable=False)
    quantity = Column(String, nullable=False)
    day = Column(String, nullable=False)
    time = Column(String, nullable=False)