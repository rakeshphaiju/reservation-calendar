from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from src.models.reservation import Reservation
from src.models.user import UserCalendar

MAX_MONTHLY_RESERVATIONS = 50  # default free tier limit


async def check_calendar_monthly_limit(
    owner_slug: str,
    db: AsyncSession,
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    count_result = await db.execute(
        select(func.count(Reservation.id)).where(
            Reservation.owner_slug == owner_slug,
            Reservation.created_at >= month_start,
        )
    )
    monthly_count = count_result.scalar()

    limit = MAX_MONTHLY_RESERVATIONS  # swap with calendar.monthly_limit if tier-based

    if monthly_count >= limit:
        raise HTTPException(
            status_code=429,
            detail="This calendar has reached its monthly reservation limit.",
        )
