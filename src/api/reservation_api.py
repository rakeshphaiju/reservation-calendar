import uuid
import http as hs
import json
import os
import secrets
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

from src.auth.auth import (
    DEFAULT_BOOKABLE_DAYS,
    DEFAULT_MAX_WEEKS,
    DEFAULT_TIME_SLOTS,
    get_user_bookable_days,
    get_user_max_weeks,
    get_user_time_slots,
    manager,
)
from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.schemas.reservation import (
    CalendarAvailabilityResponse,
    CalendarOwnerSummary,
    CalendarSlotSummary,
    MaxWeeksUpdate,
    PaginatedReservations,
    ReservationCreate,
    ReservationResponse,
    SlotCapacityUpdate,
    BookableDaysUpdate,
    TimeSlotsUpdate,
)
from src.tasks.celery_tasks import (
    send_admin_notification_task,
    send_confirmation_email_task,
)


router = APIRouter()
DEFAULT_SLOT_CAPACITY = 5
DEFAULT_OWNER_NOTIFICATION_EMAIL = os.getenv("MAIL_USERNAME")


def generate_reservation_key() -> str:
    return secrets.token_urlsafe(8)


async def acquire_slot_lock(
    db: AsyncSession,
    owner_slug: str,
    day: str,
    time: str,
):
    # Serialize writes for the same slot across all API replicas.
    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
        {"lock_key": f"{owner_slug}:{day}:{time}"},
    )


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


def get_owner_max_weeks(owner: AppUser) -> int:
    return get_user_max_weeks(owner) or DEFAULT_MAX_WEEKS


def get_owner_time_slots(owner: AppUser) -> list[str]:
    return get_user_time_slots(owner)


def get_owner_bookable_days(owner: AppUser) -> list[str]:
    return get_user_bookable_days(owner)


async def ensure_reservation_slot_available(
    db: AsyncSession,
    owner: AppUser,
    reservation: ReservationCreate,
    owner_slug: str,
    ignore_reservation_id: uuid.UUID | None = None,
):
    reservation_weekday = datetime.strptime(reservation.day, "%Y-%m-%d").strftime("%A")
    allowed_bookable_days = set(get_owner_bookable_days(owner))
    allowed_time_slots = set(get_owner_time_slots(owner))

    if reservation_weekday not in allowed_bookable_days:
        raise HTTPException(
            status_code=hs.HTTPStatus.BAD_REQUEST,
            detail="This day is not available for this calendar",
        )

    if reservation.time not in allowed_time_slots:
        raise HTTPException(
            status_code=hs.HTTPStatus.BAD_REQUEST,
            detail="This time slot is not available for this calendar",
        )

    existing_email_filters = [
        Reservation.owner_slug == owner_slug,
        Reservation.day == reservation.day,
        Reservation.time == reservation.time,
        Reservation.email == reservation.email,
    ]
    if ignore_reservation_id:
        existing_email_filters.append(Reservation.id != ignore_reservation_id)

    existing_email_result = await db.execute(
        select(Reservation.id).where(*existing_email_filters)
    )
    existing_email_reservation_id = existing_email_result.scalars().first()
    if existing_email_reservation_id:
        raise HTTPException(
            status_code=hs.HTTPStatus.CONFLICT,
            detail="This user already has a reservation for this time slot",
        )

    slot_reservation_filters = [
        Reservation.owner_slug == owner_slug,
        Reservation.day == reservation.day,
        Reservation.time == reservation.time,
    ]
    if ignore_reservation_id:
        slot_reservation_filters.append(Reservation.id != ignore_reservation_id)

    slot_reservations_result = await db.execute(
        select(func.count()).where(*slot_reservation_filters)
    )
    active_slot_reservations = slot_reservations_result.scalar_one()

    if active_slot_reservations >= get_owner_slot_capacity(owner):
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
    db: AsyncSession = Depends(get_db),
):
    try:
        owner = await get_calendar_owner(owner_slug, db)
        await acquire_slot_lock(db, owner_slug, reservation.day, reservation.time)
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

        send_confirmation_email_task.delay(
            recipient_email=reservation.email,
            recipient_name=reservation.name,
            day=reservation.day,
            time=reservation.time,
            reservation_key=reservation_key,
        )

        send_admin_notification_task.delay(
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
    except IntegrityError as exc:
        logger.warning("Reservation conflict while creating reservation: %s", exc)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.CONFLICT,
            detail="This user already has a reservation for this time slot",
        )
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
        bookable_days = get_owner_bookable_days(owner)
        return CalendarAvailabilityResponse(
            owner_slug=owner_slug,
            slot_capacity=slot_capacity,
            max_weeks=get_owner_max_weeks(owner),
            time_slots=time_slots,
            bookable_days=bookable_days,
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


@router.get("/api/dashboard/max-weeks")
async def get_max_weeks(user=Depends(manager)):
    return {"max_weeks": get_owner_max_weeks(user)}


@router.put("/api/dashboard/max-weeks")
async def update_max_weeks(
    payload: MaxWeeksUpdate,
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

        db_user.max_weeks = payload.max_weeks
        await db.commit()
        await db.refresh(db_user)
        return {"max_weeks": db_user.max_weeks}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update max weeks: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update max weeks.",
        )


@router.get("/api/dashboard/time-slots")
async def get_time_slots(user=Depends(manager)):
    return {"time_slots": get_owner_time_slots(user)}


@router.get("/api/dashboard/bookable-days")
async def get_bookable_days(user=Depends(manager)):
    return {"bookable_days": get_owner_bookable_days(user)}


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


@router.put("/api/dashboard/bookable-days")
async def update_bookable_days(
    payload: BookableDaysUpdate,
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

        db_user.bookable_days = json.dumps(
            payload.bookable_days or DEFAULT_BOOKABLE_DAYS
        )
        await db.commit()
        await db.refresh(db_user)
        return {"bookable_days": get_owner_bookable_days(db_user)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update bookable days: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update bookable days.",
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
        await acquire_slot_lock(
            db,
            db_reservation.owner_slug,
            payload.day,
            payload.time,
        )
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

        send_confirmation_email_task.delay(
            recipient_email=db_reservation.email,
            recipient_name=db_reservation.name,
            day=db_reservation.day,
            time=db_reservation.time,
            reservation_key=reservation_key,
            is_update=True,
        )

        send_admin_notification_task.delay(
            owner_email=owner.email or DEFAULT_OWNER_NOTIFICATION_EMAIL,
            customer_name=db_reservation.name,
            customer_email=db_reservation.email,
            customer_phone=db_reservation.phone_number,
            customer_address=db_reservation.address,
            day=db_reservation.day,
            time=db_reservation.time,
            reservation_id=str(db_reservation.id),
            reservation_key=reservation_key,
            is_update=True,
        )

        logger.info(
            "Updated reservation %s for calendar '%s' owned by '%s'",
            db_reservation.id,
            db_reservation.owner_slug,
            owner.username,
        )

        return db_reservation
    except IntegrityError as exc:
        logger.warning("Reservation conflict while updating reservation: %s", exc)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.CONFLICT,
            detail="This user already has a reservation for this time slot",
        )
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
