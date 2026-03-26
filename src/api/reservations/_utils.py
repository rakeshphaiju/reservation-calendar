import uuid
import http as hs
import secrets
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text

from src.auth.auth import (
    DEFAULT_MAX_WEEKS,
    get_user_bookable_days,
    get_user_max_weeks,
    get_user_time_slots,
)
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.schemas.reservation import ReservationCreate

DEFAULT_SLOT_CAPACITY = 5


def generate_reservation_key() -> str:
    return secrets.token_urlsafe(8)


def get_owner_slot_capacity(owner: AppUser) -> int:
    return getattr(owner, "slot_capacity", None) or DEFAULT_SLOT_CAPACITY


def get_owner_max_weeks(owner: AppUser) -> int:
    return get_user_max_weeks(owner) or DEFAULT_MAX_WEEKS


def get_owner_time_slots(owner: AppUser) -> list[str]:
    return get_user_time_slots(owner)


def get_owner_bookable_days(owner: AppUser) -> list[str]:
    return get_user_bookable_days(owner)


async def acquire_slot_lock(
    db: AsyncSession,
    owner_slug: str,
    day: str,
    time: str,
):
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


async def get_reservation_by_key(
    reservation_key: str, email: str, db: AsyncSession
) -> Reservation:
    result = await db.execute(
        select(Reservation).where(
            Reservation.reservation_key == reservation_key, Reservation.email == email
        )
    )
    reservation = result.scalars().first()
    if not reservation:
        raise HTTPException(
            status_code=hs.HTTPStatus.NOT_FOUND,
            detail="Reservation not found",
        )
    return reservation


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
    if existing_email_result.scalars().first():
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
