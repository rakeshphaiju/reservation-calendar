import uuid
import http as hs
import json
import os
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.auth import DEFAULT_TIME_SLOTS, get_user_time_slots, manager
from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.schemas.reservation import (
    CalendarAvailabilityResponse,
    CalendarOwnerSummary,
    CalendarSlotSummary,
    PaginatedReservations,
    ReservationCreate,
    ReservationResponse,
    SlotCapacityUpdate,
    TimeSlotsUpdate,
)
from src.services.email_service import send_admin_notification, send_confirmation_email


router = APIRouter()
DEFAULT_SLOT_CAPACITY = 5
DEFAULT_OWNER_NOTIFICATION_EMAIL = os.getenv("MAIL_USERNAME")


async def get_calendar_owner(owner_slug: str, db: AsyncSession) -> AppUser:
    result = await db.execute(
        select(AppUser).where(AppUser.calendar_slug == owner_slug)
    )
    owner = result.scalars().first()
    if not owner:
        raise HTTPException(
            status_code=hs.HTTPStatus.NOT_FOUND,
            detail="Calendar not found",
        )
    return owner


@router.get("/api/calendars", response_model=List[CalendarOwnerSummary])
async def get_calendar_owners(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppUser).order_by(AppUser.username.asc()))
    users = result.scalars().all()
    return [
        CalendarOwnerSummary(username=user.username, calendar_slug=user.calendar_slug)
        for user in users
    ]


def get_owner_slot_capacity(owner: AppUser) -> int:
    return getattr(owner, "slot_capacity", None) or DEFAULT_SLOT_CAPACITY


def get_owner_time_slots(owner: AppUser) -> list[str]:
    return get_user_time_slots(owner)


@router.post(
    "/api/calendars/{owner_slug}/reservations/add", response_model=ReservationResponse
)
async def add_reservations(
    owner_slug: str,
    reservation: ReservationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    try:
        owner = await get_calendar_owner(owner_slug, db)
        allowed_time_slots = set(get_owner_time_slots(owner))

        if reservation.time not in allowed_time_slots:
            raise HTTPException(
                status_code=hs.HTTPStatus.BAD_REQUEST,
                detail="This time slot is not available for this calendar",
            )

        existing_email_result = await db.execute(
            select(Reservation).where(
                Reservation.owner_slug == owner_slug,
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

        slot_reservations_result = await db.execute(
            select(Reservation).where(
                Reservation.owner_slug == owner_slug,
                Reservation.day == reservation.day,
                Reservation.time == reservation.time,
            )
        )
        slot_reservations = slot_reservations_result.scalars().all()
        if len(slot_reservations) >= get_owner_slot_capacity(owner):
            raise HTTPException(
                status_code=hs.HTTPStatus.CONFLICT,
                detail="This time slot is fully booked",
            )

        db_reservation = Reservation(owner_slug=owner_slug, **reservation.model_dump())
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
            owner_email=owner.email or DEFAULT_OWNER_NOTIFICATION_EMAIL,
            customer_name=reservation.name,
            customer_email=reservation.email,
            customer_phone=reservation.phone_number,
            customer_address=reservation.address,
            day=reservation.day,
            time=reservation.time,
            reservation_id=str(db_reservation.id),
        )

        logger.info(
            "Created reservation %s for calendar '%s' owned by '%s'",
            db_reservation.id,
            owner_slug,
            owner.username,
        )

        return db_reservation

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error while creating reservation: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while saving the reservation.",
        )


@router.get("/api/reservations", response_model=PaginatedReservations)
async def get_all_reservations(
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum records to return"),
):
    try:
        total = await db.execute(
            select(func.count())
            .select_from(Reservation)
            .where(Reservation.owner_slug == user.calendar_slug)
        )
        total_count = total.scalar_one()

        result = await db.execute(
            select(Reservation)
            .where(Reservation.owner_slug == user.calendar_slug)
            .offset(skip)
            .limit(limit)
        )
        reservations = result.scalars().all()
        return {
            "total_count": total_count,
            "skip": skip,
            "limit": limit,
            "data": reservations,
        }
    except Exception as exc:
        logger.error("Failed to fetch reservations: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Error fetching reservations from the database.",
        )


@router.get(
    "/api/calendars/{owner_slug}/reservations/slots",
    response_model=CalendarAvailabilityResponse,
)
async def get_reserved_slots(owner_slug: str, db: AsyncSession = Depends(get_db)):
    try:
        owner = await get_calendar_owner(owner_slug, db)
        result = await db.execute(
            select(
                Reservation.day,
                Reservation.time,
                func.count().label("count"),
            )
            .where(Reservation.owner_slug == owner_slug)
            .group_by(Reservation.day, Reservation.time)
        )
        rows = result.all()
        slot_capacity = get_owner_slot_capacity(owner)
        time_slots = get_owner_time_slots(owner)
        return CalendarAvailabilityResponse(
            owner_slug=owner_slug,
            slot_capacity=slot_capacity,
            time_slots=time_slots,
            slots=[
                CalendarSlotSummary(
                    day=day,
                    time=time,
                    count=count,
                    capacity=slot_capacity,
                )
                for day, time, count in rows
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch reserved slots: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Error fetching reserved slots from the database.",
        )


@router.get("/api/dashboard/slot-capacity")
async def get_slot_capacity(user=Depends(manager)):
    return {"slot_capacity": get_owner_slot_capacity(user)}


@router.put("/api/dashboard/slot-capacity")
async def update_slot_capacity(
    payload: SlotCapacityUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(AppUser).where(AppUser.username == user.username)
        )
        db_user = result.scalars().first()
        if not db_user:
            raise HTTPException(
                status_code=hs.HTTPStatus.NOT_FOUND,
                detail="User not found",
            )

        db_user.slot_capacity = payload.slot_capacity
        await db.commit()
        await db.refresh(db_user)
        return {"slot_capacity": db_user.slot_capacity}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update slot capacity: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update slot capacity.",
        )


@router.get("/api/dashboard/time-slots")
async def get_time_slots(user=Depends(manager)):
    return {"time_slots": get_owner_time_slots(user)}


@router.put("/api/dashboard/time-slots")
async def update_time_slots(
    payload: TimeSlotsUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(AppUser).where(AppUser.username == user.username)
        )
        db_user = result.scalars().first()
        if not db_user:
            raise HTTPException(
                status_code=hs.HTTPStatus.NOT_FOUND,
                detail="User not found",
            )

        db_user.time_slots = json.dumps(payload.time_slots or DEFAULT_TIME_SLOTS)
        await db.commit()
        await db.refresh(db_user)
        return {"time_slots": get_owner_time_slots(db_user)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update time slots: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update time slots.",
        )


@router.get("/api/reservations/{reserve_id}", response_model=ReservationResponse)
async def get_reservation(
    reserve_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(
                Reservation.id == reserve_id,
                Reservation.owner_slug == user.calendar_slug,
            )
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
    except Exception as exc:
        logger.error(
            "Error retrieving reservation %s: %s", reserve_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reservation.",
        )


@router.delete("/api/reservations/{reserve_id}")
async def delete_reservation(
    reserve_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(
                Reservation.id == reserve_id,
                Reservation.owner_slug == user.calendar_slug,
            )
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
    except Exception as exc:
        logger.error(
            "Error deleting reservation %s: %s", reserve_id, exc, exc_info=True
        )
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to delete reservation.",
        )
