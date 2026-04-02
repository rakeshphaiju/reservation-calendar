import http as hs
import os

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
)
from src.api.reservations._utils import (
    acquire_slot_lock,
    ensure_reservation_slot_available,
    generate_reservation_key,
    get_calendar_owner,
    get_reservation_by_key,
)

router = APIRouter()
DEFAULT_OWNER_NOTIFICATION_EMAIL = os.getenv("MAIL_USERNAME")


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
            calender_owner=owner.fullname,
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
            db,
            db_reservation.owner_slug,
            payload.day,
            payload.time,
        )
        await ensure_reservation_slot_available(
            db,
            owner,
            payload,
            db_reservation.email,
            db_reservation.owner_slug,
            ignore_reservation_id=db_reservation.id,
        )
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
            calender_owner=owner.fullname,
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
        }

        await db.delete(reservation)
        await db.commit()

        send_cancellation_email_task.delay(
            recipient_email=snapshot["email"],
            recipient_name=snapshot["name"],
            day=snapshot["day"],
            time=snapshot["time"],
            reservation_key=reservation_key,
            calender_owner=owner.fullname,
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

        logger.info(
            "Deleted reservation %s for calendar '%s' owned by '%s'",
            snapshot["id"],
            snapshot["owner_slug"],
            owner.username,
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
