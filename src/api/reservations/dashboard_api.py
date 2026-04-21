import json
import http as hs

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.auth.auth import (
    DEFAULT_BOOKABLE_DAYS,
    DEFAULT_TIME_SLOTS,
    ALL_BOOKABLE_DAYS,
    ensure_user_calendar,
    get_default_day_time_slots,
    manager,
    sort_time_slots,
)
from src.common.db import get_db
from src.common.logger import logger
from src.models.user import AppUser
from src.schemas.reservation import (
    BookableDaysUpdate,
    CalendarDetailsUpdate,
    MaxWeeksUpdate,
    SlotCapacityUpdate,
    TimeSlotsUpdate,
)
from src.api.reservations._utils import (
    get_owner_calendar_description,
    get_owner_calendar_location,
    get_owner_bookable_days,
    get_owner_day_time_slots,
    get_owner_max_weeks,
    get_owner_slot_capacity,
    get_owner_time_slots,
)

router = APIRouter(tags=["Dashboard"])


async def _get_db_user(email: str, db: AsyncSession) -> AppUser:
    result = await db.execute(
        select(AppUser)
        .options(joinedload(AppUser.calendar))
        .where(AppUser.email == email)
    )
    db_user = result.scalars().first()
    if not db_user:
        raise HTTPException(
            status_code=hs.HTTPStatus.NOT_FOUND, detail="User not found"
        )
    await ensure_user_calendar(db_user, db)
    return db_user


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
        db_user = await _get_db_user(user.email, db)
        db_user.calendar.slot_capacity = payload.slot_capacity
        await db.commit()
        await db.refresh(db_user.calendar)
        return {"slot_capacity": db_user.calendar.slot_capacity}
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
        db_user = await _get_db_user(user.email, db)
        db_user.calendar.max_weeks = payload.max_weeks
        await db.commit()
        await db.refresh(db_user.calendar)
        return {"max_weeks": db_user.calendar.max_weeks}
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
    return {
        "time_slots": get_owner_time_slots(user),
        "day_time_slots": get_owner_day_time_slots(user),
    }


@router.put("/api/dashboard/time-slots")
async def update_time_slots(
    payload: TimeSlotsUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        db_user = await _get_db_user(user.email, db)
        day_time_slots = payload.get_day_time_slots() or get_default_day_time_slots()
        db_user.calendar.day_time_slots = json.dumps(day_time_slots)
        merged_time_slots: list[str] = []
        seen = set()
        for day in ALL_BOOKABLE_DAYS:
            for slot in day_time_slots.get(day, []):
                if slot in seen:
                    continue
                seen.add(slot)
                merged_time_slots.append(slot)
        db_user.calendar.time_slots = json.dumps(
            sort_time_slots(merged_time_slots) or DEFAULT_TIME_SLOTS
        )
        await db.commit()
        await db.refresh(db_user.calendar)
        return {
            "time_slots": get_owner_time_slots(db_user),
            "day_time_slots": get_owner_day_time_slots(db_user),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update time slots: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update time slots.",
        )


@router.get("/api/dashboard/bookable-days")
async def get_bookable_days(user=Depends(manager)):
    return {"bookable_days": get_owner_bookable_days(user)}


@router.put("/api/dashboard/bookable-days")
async def update_bookable_days(
    payload: BookableDaysUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        db_user = await _get_db_user(user.email, db)
        db_user.calendar.bookable_days = json.dumps(
            payload.bookable_days or DEFAULT_BOOKABLE_DAYS
        )
        await db.commit()
        await db.refresh(db_user.calendar)
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


@router.get("/api/dashboard/calendar-details")
async def get_calendar_details(user=Depends(manager)):
    return {
        "calendar_description": get_owner_calendar_description(user),
        "calendar_location": get_owner_calendar_location(user),
    }


@router.put("/api/dashboard/calendar-details")
async def update_calendar_details(
    payload: CalendarDetailsUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        db_user = await _get_db_user(user.email, db)
        db_user.calendar.calendar_description = payload.calendar_description
        db_user.calendar.calendar_location = payload.calendar_location
        await db.commit()
        await db.refresh(db_user.calendar)
        return {
            "calendar_description": get_owner_calendar_description(db_user),
            "calendar_location": get_owner_calendar_location(db_user),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to update calendar details: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to update calendar details.",
        )


@router.post("/api/dashboard/create-calendar")
async def create_calendar(
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        db_user = await _get_db_user(user.email, db)
        if not db_user.calendar.calendar_created:
            db_user.calendar.calendar_created = True
            await db.commit()
            await db.refresh(db_user.calendar)

        return {
            "calendar_created": db_user.calendar.calendar_created,
            "calendar_slug": db_user.calendar_slug,
            "calendar_url": f"/calendar/{db_user.calendar_slug}",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to create calendar: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to create calendar.",
        )


@router.post("/api/dashboard/make-calendar-private")
async def make_calendar_private(
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        db_user = await _get_db_user(user.email, db)
        if db_user.calendar.calendar_created:
            db_user.calendar.calendar_created = False
            await db.commit()
            await db.refresh(db_user.calendar)

        return {
            "calendar_created": db_user.calendar.calendar_created,
            "calendar_slug": db_user.calendar_slug,
            "calendar_url": (
                f"/calendar/{db_user.calendar_slug}"
                if db_user.calendar.calendar_created
                else None
            ),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to make calendar private: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to make calendar private.",
        )
