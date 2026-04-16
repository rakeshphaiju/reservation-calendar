import http as hs
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.schemas.reservation import (
    ReservationCreate,
    ReservationResponse,
    ReservationUpdate,
)
from src.tasks.celery_tasks import (
    send_admin_notification_task,
    send_confirmation_email_task,
    send_admin_cancellation_notification_task,
    send_cancellation_email_task,
    send_reservation_reminder_task,
)
from src.api.reservations._utils import (
    acquire_slot_lock,
    ensure_reservation_slot_available,
    generate_reservation_key,
    get_calendar_owner,
    get_reservation_by_key,
)
from src.dependencies.rate_limits import check_calendar_monthly_limit

router = APIRouter()
DEFAULT_OWNER_NOTIFICATION_EMAIL = os.getenv("MAIL_USERNAME")
APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Europe/Helsinki"))


def _get_reservation_datetimes(day: str, time: str) -> tuple[str, datetime, datetime]:
    start_time = time[:5]
    start_local = datetime.strptime(f"{day} {start_time}", "%Y-%m-%d %H:%M").replace(
        tzinfo=APP_TIMEZONE
    )
    reminder_utc = (start_local - timedelta(hours=24)).astimezone(timezone.utc)
    return start_time, start_local, reminder_utc


def _schedule_reminder(
    day: str,
    time: str,
    recipient_email: str,
    recipient_name: str,
    reservation_key: str,
    calendar_owner: str = "",
) -> str | None:
    """
    Schedules a reminder 24h before the reservation start time.
    Returns the Celery task ID, or None if the reminder time has already passed.
    day format: 'YYYY-MM-DD', time format: 'HH:MM-HH:MM'
    """
    try:
        start_time, _, reminder_dt = _get_reservation_datetimes(day, time)
        if reminder_dt <= datetime.now(timezone.utc):
            logger.info(
                "Skipping reminder for %s %s — reminder time already passed", day, time
            )
            return None

        result = send_reservation_reminder_task.apply_async(
            kwargs=dict(
                recipient_email=recipient_email,
                recipient_name=recipient_name,
                day=day,
                time=start_time,
                reservation_key=reservation_key,
                calendar_owner=calendar_owner,
            ),
            eta=reminder_dt,
        )
        logger.info(
            "Reminder scheduled at %s for reservation %s", reminder_dt, reservation_key
        )
        return result.id
    except Exception as exc:
        logger.error("Failed to schedule reminder for %s: %s", reservation_key, exc)
        return None


def _revoke_reminder(task_id: str | None) -> None:
    """Revokes a previously scheduled reminder task if it exists."""
    if not task_id:
        return
    try:
        send_reservation_reminder_task.AsyncResult(task_id).revoke(terminate=False)
        logger.info("Revoked reminder task %s", task_id)
    except Exception as exc:
        logger.warning("Failed to revoke reminder task %s: %s", task_id, exc)


@router.post(
    "/api/calendars/{owner_slug}/reservations/add",
    response_model=ReservationResponse,
)
async def add_reservations(
    owner_slug: str,
    reservation: ReservationCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        owner = await get_calendar_owner(owner_slug, db)
        await check_calendar_monthly_limit(owner_slug, db)
        await acquire_slot_lock(db, owner_slug, reservation.day, reservation.time)
        await ensure_reservation_slot_available(
            db,
            owner,
            reservation,
            reservation.email,
            owner_slug,
        )

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
            calender_owner=owner.service_name,
        )
        send_admin_notification_task.delay(
            owner_email=owner.email or DEFAULT_OWNER_NOTIFICATION_EMAIL,
            customer_name=reservation.name,
            customer_email=reservation.email,
            customer_phone=reservation.phone_number,
            day=reservation.day,
            time=reservation.time,
            reservation_id=str(db_reservation.id),
            reservation_key=reservation_key,
        )

        # Schedule 24h reminder
        reminder_task_id = _schedule_reminder(
            day=reservation.day,
            time=reservation.time,
            recipient_email=reservation.email,
            recipient_name=reservation.name,
            reservation_key=reservation_key,
            calendar_owner=owner.service_name,
        )
        if reminder_task_id:
            db_reservation.reminder_task_id = reminder_task_id
            await db.commit()

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


@router.get(
    "/api/public/reservations/{reservation_key}",
    response_model=ReservationResponse,
)
async def get_reservation_by_reservation_key(
    reservation_key: str,
    email: str = Query(..., description="Email used when booking"),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await get_reservation_by_key(reservation_key, email, db)
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
    "/api/public/reservations/{reservation_key}",
    response_model=ReservationResponse,
)
async def update_reservation_by_reservation_key(
    reservation_key: str,
    payload: ReservationUpdate,
    email: str = Query(..., description="Email used when booking"),
    db: AsyncSession = Depends(get_db),
):
    try:
        db_reservation = await get_reservation_by_key(reservation_key, email, db)
        owner = await get_calendar_owner(db_reservation.owner_slug, db)
        await acquire_slot_lock(
            db, db_reservation.owner_slug, payload.day, payload.time
        )
        await ensure_reservation_slot_available(
            db,
            owner,
            payload,
            db_reservation.email,
            db_reservation.owner_slug,
            ignore_reservation_id=db_reservation.id,
        )

        # Revoke old reminder before rescheduling
        _revoke_reminder(getattr(db_reservation, "reminder_task_id", None))

        db_reservation.day = payload.day
        db_reservation.time = payload.time
        await db.commit()
        await db.refresh(db_reservation)

        send_confirmation_email_task.delay(
            recipient_email=db_reservation.email,
            recipient_name=db_reservation.name,
            day=db_reservation.day,
            time=db_reservation.time,
            reservation_key=reservation_key,
            is_update=True,
            calender_owner=owner.service_name,
        )
        send_admin_notification_task.delay(
            owner_email=owner.email or DEFAULT_OWNER_NOTIFICATION_EMAIL,
            customer_name=db_reservation.name,
            customer_email=db_reservation.email,
            customer_phone=db_reservation.phone_number,
            day=db_reservation.day,
            time=db_reservation.time,
            reservation_id=str(db_reservation.id),
            reservation_key=reservation_key,
            is_update=True,
        )

        # Reschedule reminder for new time
        reminder_task_id = _schedule_reminder(
            day=db_reservation.day,
            time=db_reservation.time,
            recipient_email=db_reservation.email,
            recipient_name=db_reservation.name,
            reservation_key=reservation_key,
            calendar_owner=owner.service_name,
        )
        db_reservation.reminder_task_id = reminder_task_id
        await db.commit()

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
    email: str = Query(..., description="Email used when booking"),
    db: AsyncSession = Depends(get_db),
):
    try:
        reservation = await get_reservation_by_key(reservation_key, email, db)
        owner = await get_calendar_owner(reservation.owner_slug, db)

        snapshot = {
            "name": reservation.name,
            "email": reservation.email,
            "day": reservation.day,
            "time": reservation.time,
            "id": str(reservation.id),
            "owner_slug": reservation.owner_slug,
            "reminder_task_id": getattr(reservation, "reminder_task_id", None),
        }

        await db.delete(reservation)
        await db.commit()

        # Revoke pending reminder since reservation no longer exists
        _revoke_reminder(snapshot["reminder_task_id"])

        send_cancellation_email_task.delay(
            recipient_email=snapshot["email"],
            recipient_name=snapshot["name"],
            day=snapshot["day"],
            time=snapshot["time"],
            reservation_key=reservation_key,
            calender_owner=owner.service_name,
        )
        send_admin_cancellation_notification_task.delay(
            owner_email=owner.email or DEFAULT_OWNER_NOTIFICATION_EMAIL,
            customer_name=snapshot["name"],
            customer_email=snapshot["email"],
            day=snapshot["day"],
            time=snapshot["time"],
            reservation_id=snapshot["id"],
            reservation_key=reservation_key,
        )

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
