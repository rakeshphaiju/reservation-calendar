from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from src.common.db import get_db
from src.models.reservation import Reservation

router = APIRouter()


class ReservationCreate(BaseModel):
    name: str
    address: str
    phone_number: str
    food: str
    quantity: int
    day: str
    time: str


class ReservationResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    phone_number: str
    food: str
    quantity: int
    day: str
    time: str


@router.post("/api/reserve/add", response_model=ReservationResponse)
async def add_reservations(
    reservation: ReservationCreate, db: AsyncSession = Depends(get_db)
):
    db_reservation = Reservation(**reservation.model_dump())
    db.add(db_reservation)
    await db.commit()
    await db.refresh(db_reservation)
    return db_reservation


# Get all reservations
@router.get("/api/reserve", response_model=List[ReservationResponse])
async def get_all_reservations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation))
    reservations = result.scalars().all()
    return reservations


# Get a single reservation by ID
@router.get("/api/reserve/{reserve_id}", response_model=ReservationResponse)
async def get_reservation(reserve_id, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation).where(Reservation.id == reserve_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


# Delete a reservation by ID
@router.delete("/api/delete/{reserve_id}")
async def delete_reservation(reserve_id, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation).where(Reservation.id == reserve_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    await db.delete(reservation)
    await db.commit()
    return {"message": "Reservation deleted successfully"}
