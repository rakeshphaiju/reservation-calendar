import http as hs
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.schemas.reservation import (
    CalendarAvailabilityResponse,
    CalendarOwnerSummary,
    CalendarSlotSummary,
)
from src.api.reservations._utils import (
    get_calendar_owner,
    get_owner_calendar_description,
    get_owner_calendar_location,
    get_owner_bookable_days,
    get_owner_date_time_slots,
    get_owner_day_time_slots,
    get_owner_max_weeks,
    get_owner_slot_capacity,
    get_owner_time_slots,
)

router = APIRouter()


@router.get("/api/calendars", response_model=List[CalendarOwnerSummary])
async def get_calendar_owners(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AppUser)
        .where(AppUser.calendar_created.is_(True))
        .order_by(AppUser.username.asc())
    )
    users = result.scalars().all()
    return [
        CalendarOwnerSummary(username=user.username, calendar_slug=user.calendar_slug)
        for user in users
    ]


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
        return CalendarAvailabilityResponse(
            owner_slug=owner_slug,
            slot_capacity=slot_capacity,
            max_weeks=get_owner_max_weeks(owner),
            time_slots=get_owner_time_slots(owner),
            day_time_slots=get_owner_day_time_slots(owner),
            date_time_slots=get_owner_date_time_slots(owner),
            bookable_days=get_owner_bookable_days(owner),
            calendar_description=get_owner_calendar_description(owner),
            calendar_location=get_owner_calendar_location(owner),
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
