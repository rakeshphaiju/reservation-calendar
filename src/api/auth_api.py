from datetime import timedelta
from http import HTTPStatus as hs

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi_login.exceptions import InvalidCredentialsException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.auth import (
    TOKEN_URL,
    User,
    authenticate_user,
    generate_unique_calendar_slug,
    hash_password,
    manager,
)
from src.common.db import get_db
from src.common.logger import logger
from src.models.user import AppUser
from src.schemas.user import UserRegistrationRequest


router = APIRouter()


ACCESS_TOKEN_EXPIRE_MINUTES = 60


def get_slot_capacity(user) -> int:
    return getattr(user, "slot_capacity", 5) or 5


@router.post("/api/auth/register")
async def register_user(
    payload: UserRegistrationRequest,
    db: AsyncSession = Depends(get_db),
):
    existing_user_result = await db.execute(
        select(AppUser).where(AppUser.username == payload.username)
    )
    if existing_user_result.scalars().first():
        raise HTTPException(
            status_code=hs.CONFLICT,
            detail="Username already exists",
        )

    calendar_slug = await generate_unique_calendar_slug(payload.username, db)
    user = AppUser(
        username=payload.username,
        password_hash=hash_password(payload.password),
        calendar_slug=calendar_slug,
    )
    db.add(user)
    await db.commit()

    logger.info(
        "Created new user '%s' with calendar '%s'", user.username, calendar_slug
    )

    return {
        "username": user.username,
        "calendar_slug": user.calendar_slug,
        "slot_capacity": get_slot_capacity(user),
        "calendar_url": f"/calendar/{user.calendar_slug}",
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
        "calendar_slug": user.calendar_slug,
        "slot_capacity": get_slot_capacity(user),
        "calendar_url": f"/calendar/{user.calendar_slug}",
    }


@router.get("/api/auth/me")
async def get_me(user=Depends(manager)):
    try:
        return {
            "username": user.username,
            "calendar_slug": user.calendar_slug,
            "slot_capacity": get_slot_capacity(user),
            "calendar_url": f"/calendar/{user.calendar_slug}",
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
async def logout(response: Response):
    try:
        response.delete_cookie(
            key="access-token",
            httponly=True,
            samesite="lax",
            secure=False,
            path="/",
        )
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
    except Exception as exc:
        logger.error("Unexpected error during logout: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Logout failed. Please try again.",
        )
