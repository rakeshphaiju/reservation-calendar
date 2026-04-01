from datetime import timedelta
from http import HTTPStatus as hs
import json

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import RedirectResponse
from fastapi_login.exceptions import InvalidCredentialsException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.auth import (
    DEFAULT_BOOKABLE_DAYS,
    TOKEN_URL,
    User,
    authenticate_user,
    generate_unique_calendar_slug,
    get_user_calendar_description,
    get_user_calendar_location,
    get_user_bookable_days,
    get_user_day_time_slots,
    get_user_max_weeks,
    get_user_time_slots,
    get_default_day_time_slots,
    hash_password,
    manager,
)
from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.schemas.user import UserRegistrationRequest


router = APIRouter()


ACCESS_TOKEN_EXPIRE_MINUTES = 60


def get_slot_capacity(user) -> int:
    return getattr(user, "slot_capacity", 5) or 5


def get_time_slots(user) -> list[str]:
    return get_user_time_slots(user)


def get_bookable_days(user) -> list[str]:
    return get_user_bookable_days(user)


def get_day_time_slots(user) -> dict[str, list[str]]:
    return get_user_day_time_slots(user)


def get_max_weeks(user) -> int:
    return get_user_max_weeks(user)


def get_calendar_description(user) -> str | None:
    return get_user_calendar_description(user)


def get_calendar_location(user) -> str | None:
    return get_user_calendar_location(user)


def build_calendar_url(user) -> str | None:
    if not getattr(user, "calendar_created", True):
        return None
    return f"/calendar/{user.calendar_slug}"


@router.get("/api/auth/register")
async def register_get_redirect():
    """Registration is POST-only; browsers that open this URL get sent to the UI."""
    return RedirectResponse(url="/login?register=1", status_code=307)


@router.post("/api/auth/register")
async def register_user(
    payload: UserRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    existing_username_result = await db.execute(
        select(AppUser).where(AppUser.username == payload.username)
    )
    if existing_username_result.scalars().first():
        raise HTTPException(
            status_code=hs.CONFLICT,
            detail="Username already exists",
        )

    existing_email_result = await db.execute(
        select(AppUser).where(AppUser.email == payload.email)
    )
    if existing_email_result.scalars().first():
        raise HTTPException(
            status_code=hs.CONFLICT,
            detail="Email already exists",
        )

    calendar_slug = await generate_unique_calendar_slug(payload.username, db)
    user = AppUser(
        username=payload.username,
        email=payload.email,
        fullname=payload.fullname,
        password_hash=hash_password(payload.password),
        calendar_slug=calendar_slug,
        calendar_created=False,
        time_slots=json.dumps(get_time_slots(None)),
        day_time_slots=json.dumps(get_default_day_time_slots()),
        bookable_days=json.dumps(get_bookable_days(None) or DEFAULT_BOOKABLE_DAYS),
    )
    db.add(user)
    await db.commit()

    logger.info(
        "Created new user '%s' with draft calendar '%s'", user.username, calendar_slug
    )

    return {
        "username": user.username,
        "email": user.email,
        "fullname": user.fullname,
        "calendar_slug": user.calendar_slug,
        "calendar_created": user.calendar_created,
        "slot_capacity": get_slot_capacity(user),
        "max_weeks": get_max_weeks(user),
        "time_slots": get_time_slots(user),
        "day_time_slots": get_day_time_slots(user),
        "bookable_days": get_bookable_days(user),
        "calendar_description": get_calendar_description(user),
        "calendar_location": get_calendar_location(user),
        "calendar_url": build_calendar_url(user),
    }


@router.post(TOKEN_URL)
async def login(response: Response, user: User = Depends(authenticate_user)):
    try:
        access_token = manager.create_access_token(
            data={"sub": user.username},
            expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        manager.set_cookie(response, access_token)
        logger.info("User %s logged in", user.username)
    except Exception as exc:
        raise InvalidCredentialsException from exc

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "fullname": user.fullname,
        "email": user.email,
        "calendar_slug": user.calendar_slug,
        "calendar_created": user.calendar_created,
        "slot_capacity": get_slot_capacity(user),
        "max_weeks": get_max_weeks(user),
        "time_slots": get_time_slots(user),
        "day_time_slots": get_day_time_slots(user),
        "bookable_days": get_bookable_days(user),
        "calendar_description": get_calendar_description(user),
        "calendar_location": get_calendar_location(user),
        "calendar_url": build_calendar_url(user),
    }


@router.get("/api/auth/me")
async def get_me(user=Depends(manager)):
    try:
        return {
            "username": user.username,
            "email": user.email,
            "fullname": user.fullname,
            "calendar_slug": user.calendar_slug,
            "calendar_created": user.calendar_created,
            "slot_capacity": get_slot_capacity(user),
            "max_weeks": get_max_weeks(user),
            "time_slots": get_time_slots(user),
            "day_time_slots": get_day_time_slots(user),
            "bookable_days": get_bookable_days(user),
            "calendar_description": get_calendar_description(user),
            "calendar_location": get_calendar_location(user),
            "calendar_url": build_calendar_url(user),
            "authenticated": True,
        }
    except AttributeError as exc:
        logger.error("Invalid user object: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid session. Please log in again.",
        )
    except Exception as exc:
        logger.error("Unexpected error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user info.",
        )


@router.post("/api/logout")
async def logout(response: Response, user=Depends(manager)):
    try:
        response.delete_cookie(
            key="access-token",
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
        )
        logger.info("User %s logged out successfully", user.username)
        return {"message": "Logged out successfully"}
    except Exception as exc:
        logger.error("Unexpected error during logout: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Logout failed. Please try again.",
        )


@router.delete("/api/auth/account")
async def delete_account(
    response: Response,
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
                status_code=hs.NOT_FOUND,
                detail="User not found",
            )

        await db.execute(
            delete(Reservation).where(Reservation.owner_slug == db_user.calendar_slug)
        )
        await db.delete(db_user)
        await db.commit()

        response.delete_cookie(
            key="access-token",
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
        )
        logger.info(
            "Deleted user '%s' and reservations for calendar '%s'",
            db_user.username,
            db_user.calendar_slug,
        )
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to delete account: %s", exc, exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Failed to delete account.",
        )
