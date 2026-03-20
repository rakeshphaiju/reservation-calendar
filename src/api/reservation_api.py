import uuid
import http as hs
import json
import os
import secrets
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


def generate_reservation_key() -> str:
    return secrets.token_urlsafe(8)


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


async def get_reservation_by_key(reservation_key: str, db: AsyncSession) -> Reservation:
    result = await db.execute(
        select(Reservation).where(Reservation.reservation_key == reservation_key)
    )
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(
            status_code=hs.HTTPStatus.NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


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


async def ensure_reservation_slot_available(
    db: AsyncSession,
    owner: AppUser,
    reservation: ReservationCreate,
    owner_slug: str,
    ignore_reservation_id: uuid.UUID | None = None,
):
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
    existing_email_reservation = existing_email_result.scalars().first()
    if (
        existing_email_reservation
        and existing_email_reservation.id != ignore_reservation_id
    ):
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
    active_slot_reservations = [
        slot_reservation
        for slot_reservation in slot_reservations
        if slot_reservation.id != ignore_reservation_id
    ]
    if len(active_slot_reservations) >= get_owner_slot_capacity(owner):
        raise HTTPException(
            status_code=hs.HTTPStatus.CONFLICT,
            detail="This time slot is fully booked",
        )


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
        await ensure_reservation_slot_available(db, owner, reservation, owner_slug)

        reservation_key = generate_reservation_key()
        db_reservation = Reservation(
            owner_slug=owner_slug,
            reservation_key=reservation_key,
            **reservation.model_dump(),
        )
        db.add(db_reservation)
        await db.commit()
        await db.refresh(db_reservation)

        background_tasks.add_task(
            send_confirmation_email,
            recipient_email=reservation.email,
            recipient_name=reservation.name,
            day=reservation.day,
            time=reservation.time,
            reservation_key=reservation_key,
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
            reservation_key=reservation_key,
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


@router.get(
    "/api/public/reservations/{reservation_key}", response_model=ReservationResponse
)
async def get_reservation_by_reservation_key(
    reservation_key: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_reservation_by_key(reservation_key, db)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error retrieving reservation for key %s: %s",
            reservation_key,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reservation.",
        )


@router.put(
    "/api/public/reservations/{reservation_key}", response_model=ReservationResponse
)
async def update_reservation_by_reservation_key(
    reservation_key: str,
    payload: ReservationCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        db_reservation = await get_reservation_by_key(reservation_key, db)
        owner = await get_calendar_owner(db_reservation.owner_slug, db)
        await ensure_reservation_slot_available(
            db,
            owner,
            payload,
            db_reservation.owner_slug,
            ignore_reservation_id=db_reservation.id,
        )

        for field, value in payload.model_dump().items():
            setattr(db_reservation, field, value)

        await db.commit()
        await db.refresh(db_reservation)
        return db_reservation
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error updating reservation for key %s: %s",
            reservation_key,
            exc,
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update reservation.",
        )


@router.delete("/api/public/reservations/{reservation_key}")
async def delete_reservation_by_reservation_key(
    reservation_key: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        reservation = await get_reservation_by_key(reservation_key, db)
        await db.delete(reservation)
        await db.commit()
        return {"message": "Reservation deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(
            "Error deleting reservation for key %s: %s",
            reservation_key,
            exc,
            exc_info=True,
        )
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to delete reservation.",
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
