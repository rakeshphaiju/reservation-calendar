from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from src.common.db import get_db
from src.models.reservation import Reservation
from src.services.email_service import send_confirmation_email, send_admin_notification

router = APIRouter()


class ReservationCreate(BaseModel):
    name: str
    address: str
    email: EmailStr
    phone_number: str
    day: str
    time: str


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    address: str
    phone_number: str
    day: str
    time: str


@router.post("/api/reserve/add", response_model=ReservationResponse)
async def add_reservations(
    reservation: ReservationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    db_reservation = Reservation(**reservation.model_dump())
    db.add(db_reservation)
    await db.commit()
    await db.refresh(db_reservation)

    background_tasks.add_task(
        send_confirmation_email,
        recipient_email=reservation.email,
        recipient_name=reservation.name,
        day=reservation.day,
        time=reservation.time,
    )

    background_tasks.add_task(
        send_admin_notification,
        customer_name=reservation.name,
        customer_email=reservation.email,
        customer_phone=reservation.phone_number,
        customer_address=reservation.address,
        day=reservation.day,
        time=reservation.time,
        reservation_id=str(db_reservation.id),
    )

    return db_reservation


# Get all reservations
@router.get("/api/reserve", response_model=List[ReservationResponse])
async def get_all_reservations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation))
    reservations = result.scalars().all()
    return reservations


# Get a single reservation by ID
@router.get("/api/reserve/{reserve_id}", response_model=ReservationResponse)
async def get_reservation(reserve_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation).where(Reservation.id == reserve_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


# Delete a reservation by ID
@router.delete("/api/reserve/{reserve_id}")
async def delete_reservation(reserve_id, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Reservation).where(Reservation.id == reserve_id))
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    await db.delete(reservation)
    await db.commit()
    return {"message": "Reservation deleted successfully"}
