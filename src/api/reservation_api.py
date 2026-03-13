import uuid
from typing import List, Literal
import http as hs
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.services.email_service import send_confirmation_email, send_admin_notification
from src.auth.auth import manager


router = APIRouter()

SLOT_CAPACITY = 5


class ReservationCreate(BaseModel):
    name: str = Field(..., min_length=2)
    address: str = Field(..., min_length=1)
    email: EmailStr
    phone_number: str = Field(..., pattern=r"^\d{10}$")
    day: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: Literal[
        "17:00-17:30",
        "17:30-18:00",
        "18:00-18:30",
        "18:30-19:00",
        "19:00-19:30",
        "19:30-20:00",
        "20:00-20:30",
    ]


class ReservationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    address: str
    phone_number: str
    day: str
    time: str


class ReservationSlot(BaseModel):
    day: str
    time: str
    count: int


@router.post("/api/reserve/add", response_model=ReservationResponse)
async def add_reservations(
    reservation: ReservationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    try:
        # Check if this email already has a reservation for the same slot
        existing_email_result = await db.execute(
            select(Reservation).where(
                Reservation.day == reservation.day,
                Reservation.time == reservation.time,
                Reservation.email == reservation.email,
            )
        )
        if existing_email_result.scalars().first():
            raise HTTPException(
                status_code=hs.HTTPStatus.CONFLICT,
                detail="This user already has a reservation for this time slot",
            )

        # Check overall capacity for this slot
        slot_reservations_result = await db.execute(
            select(Reservation).where(
                Reservation.day == reservation.day,
                Reservation.time == reservation.time,
            )
        )
        slot_reservations = slot_reservations_result.scalars().all()
        if len(slot_reservations) >= SLOT_CAPACITY:
            raise HTTPException(
                status_code=hs.HTTPStatus.CONFLICT,
                detail="This time slot is fully booked",
            )

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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error while creating reservation: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while saving the reservation.",
        )


@router.get("/api/reserve", response_model=List[ReservationResponse])
async def get_all_reservations(
    db: AsyncSession = Depends(get_db),
    _user=Depends(manager),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum records to return"),
):
    try:
        result = await db.execute(select(Reservation))
        reservations = result.scalars().all()
        return reservations
    except Exception as e:
        logger.error(f"Failed to fetch reservations: {e}", exc_info=True)
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Error fetching reservations from the database.",
        )


@router.get("/api/reserve/slots", response_model=List[ReservationSlot])
async def get_reserved_slots(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(
                Reservation.day,
                Reservation.time,
                func.count().label("count"),
            ).group_by(Reservation.day, Reservation.time)
        )
        rows = result.all()
        return [
            ReservationSlot(day=day, time=time, count=count)
            for day, time, count in rows
        ]
    except Exception as e:
        logger.error(f"Failed to fetch reserved slots: {e}", exc_info=True)
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Error fetching reserved slots from the database.",
        )


@router.get("/api/reserve/{reserve_id}", response_model=ReservationResponse)
async def get_reservation(
    reserve_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(Reservation.id == reserve_id)
        )
        reservation = result.scalars().first()
        if not reservation:
            raise HTTPException(
                status_code=hs.HTTPStatus.NOT_FOUND,
                detail="Reservation not found",
            )
        return reservation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving reservation {reserve_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reservation.",
        )


@router.delete("/api/reserve/{reserve_id}")
async def delete_reservation(
    reserve_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(Reservation.id == reserve_id)
        )
        reservation = result.scalars().first()
        if not reservation:
            raise HTTPException(
                status_code=hs.HTTPStatus.NOT_FOUND,
                detail="Reservation not found",
            )

        await db.delete(reservation)
        await db.commit()
        return {"message": "Reservation deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting reservation {reserve_id}: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to delete reservation.",
        )
