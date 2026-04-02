import uuid
import http as hs

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.auth import manager
from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.schemas.reservation import PaginatedReservations, ReservationResponse

router = APIRouter()


@router.get("/api/reservations", response_model=PaginatedReservations)
async def get_all_reservations(
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=1000, description="Maximum records to return"),
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


@router.get("/api/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(
                Reservation.id == reservation_id,
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
            "Error retrieving reservation %s: %s", reservation_id, exc, exc_info=True
        )
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reservation.",
        )


@router.delete("/api/reservations/{reservation_id}")
async def delete_reservation(
    reservation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(manager),
):
    try:
        result = await db.execute(
            select(Reservation).where(
                Reservation.id == reservation_id,
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
            "Error deleting reservation %s: %s", reservation_id, exc, exc_info=True
        )
        await db.rollback()
        raise HTTPException(
            status_code=hs.HTTPStatus.INTERNAL_SERVER_ERROR,
            detail="Failed to delete reservation.",
        )
