from datetime import timedelta
from http import HTTPStatus as hs
import json

from fastapi import APIRouter, Depends, HTTPException, Response, Form
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
from src.auth.email_verification import (
    can_resend,
    create_and_store_otp,
    set_resend_lock,
    verify_otp,
)
from src.services.email_service import send_verification_email
from src.common.db import get_db
from src.common.logger import logger
from src.models.reservation import Reservation
from src.models.user import AppUser, UserCalendar
from src.schemas.user import (
    UserRegistrationRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
)

router = APIRouter()

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REMEMBER_ME_EXPIRE_DAYS = 30


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


def _build_user_payload(user: AppUser) -> dict:
    return {
        "email": user.email,
        "service_name": user.service_name,
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
        "is_verified": getattr(user, "is_verified", False),
    }


@router.get("/api/auth/register")
async def register_get_redirect():
    return RedirectResponse(url="/login?register=1", status_code=307)


@router.post("/api/auth/register")
async def register_user(
    payload: UserRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    existing_email_result = await db.execute(
        select(AppUser).where(AppUser.email == payload.email)
    )
    if existing_email_result.scalars().first():
        raise HTTPException(status_code=hs.CONFLICT, detail="Email already exists")

    calendar_slug = await generate_unique_calendar_slug(payload.service_name, db)
    user = AppUser(
        username=payload.email,
        email=payload.email,
        service_name=payload.service_name,
        password_hash=hash_password(payload.password),
        is_verified=False,
    )
    user.calendar = UserCalendar(
        calendar_slug=calendar_slug,
        calendar_created=False,
        time_slots=json.dumps(get_time_slots(None)),
        day_time_slots=json.dumps(get_default_day_time_slots()),
        bookable_days=json.dumps(get_bookable_days(None) or DEFAULT_BOOKABLE_DAYS),
    )

    db.add(user)
    await db.commit()

    try:
        code = await create_and_store_otp(payload.email)
        await set_resend_lock(payload.email)
        await send_verification_email(payload.email, payload.service_name, code)
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", payload.email, exc)

    logger.info(
        "Registered user '%s' (unverified), calendar '%s'",
        user.username,
        calendar_slug,
    )

    return {
        **_build_user_payload(user),
        "is_verified": False,
        "message": "Account created. Please check your email for a 6-digit verification code.",
    }


@router.post("/api/auth/verify-email")
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AppUser).where(AppUser.email == payload.email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=hs.NOT_FOUND, detail="User not found")

    if getattr(user, "is_verified", False):
        return {"message": "Email already verified. You can sign in."}

    if not await verify_otp(payload.email, payload.code):
        raise HTTPException(
            status_code=hs.UNPROCESSABLE_ENTITY,
            detail="Invalid or expired verification code.",
        )

    user.is_verified = True
    await db.commit()

    logger.info("User '%s' verified their email", user.username)
    return {"message": "Email verified successfully. You can now sign in."}


@router.post("/api/auth/resend-verify")
async def resend_verification(
    payload: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AppUser).where(AppUser.email == payload.email))
    user = result.scalars().first()

    if not user or getattr(user, "is_verified", False):
        return {
            "message": "If that email exists and is unverified, a new code has been sent."
        }

    if not await can_resend(payload.email):
        raise HTTPException(
            status_code=hs.TOO_MANY_REQUESTS,
            detail="Please wait before requesting a new code.",
        )

    try:
        code = await create_and_store_otp(payload.email)
        await set_resend_lock(payload.email)
        await send_verification_email(payload.email, user.service_name, code)
    except Exception as exc:
        logger.error("Failed to resend OTP to %s: %s", payload.email, exc)
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Failed to send email.",
        )

    return {
        "message": "If that email exists and is unverified, a new code has been sent."
    }


@router.post(TOKEN_URL)
async def login(
    response: Response,
    remember_me: bool = Form(False),
    user: User = Depends(authenticate_user),
):
    if not getattr(user, "is_verified", False):
        raise HTTPException(
            status_code=hs.FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    try:
        expires = (
            timedelta(days=REMEMBER_ME_EXPIRE_DAYS)
            if remember_me
            else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        access_token = manager.create_access_token(
            data={"sub": user.email},
            expires=expires,
        )
        response.set_cookie(
            key="access-token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
            max_age=int(expires.total_seconds()) if remember_me else None,
        )
    except Exception as exc:
        raise InvalidCredentialsException from exc

    return {
        "access_token": access_token,
        "token_type": "bearer",
        **_build_user_payload(user),
    }


@router.get("/api/auth/me")
async def get_me(user=Depends(manager)):
    if not getattr(user, "is_verified", False):
        raise HTTPException(
            status_code=hs.FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    try:
        return {
            **_build_user_payload(user),
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
        result = await db.execute(select(AppUser).where(AppUser.email == user.email))
        db_user = result.scalars().first()
        if not db_user:
            raise HTTPException(status_code=hs.NOT_FOUND, detail="User not found")

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
