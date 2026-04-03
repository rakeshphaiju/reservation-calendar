import base64
import hashlib
import json
import os
import re
import secrets
from http import HTTPStatus as hs

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_login import LoginManager
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.common.db import get_db, get_db_context
from src.common.logger import logger
from src.models.user import AppUser


SECRET_KEY = os.getenv("SECRET_KEY", "this-is-a-32-byte-test-secret-key!!")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")


TOKEN_URL = "/api/auth/login"

manager = LoginManager(SECRET_KEY, token_url=TOKEN_URL, use_cookie=True)


DEFAULT_TIME_SLOTS = [
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "15:00-16:00",
    "16:00-17:00",
    "17:00-18:00",
]
ALL_BOOKABLE_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
DEFAULT_BOOKABLE_DAYS = ALL_BOOKABLE_DAYS[:5]
DEFAULT_MAX_WEEKS = 4


def get_default_day_time_slots() -> dict[str, list[str]]:
    return {day: DEFAULT_TIME_SLOTS.copy() for day in ALL_BOOKABLE_DAYS}


class User(BaseModel):
    username: str
    email: EmailStr | None = None
    fullname: str
    calendar_slug: str
    calendar_created: bool = True
    slot_capacity: int = 5
    max_weeks: int = DEFAULT_MAX_WEEKS
    time_slots: list[str] = DEFAULT_TIME_SLOTS.copy()
    day_time_slots: dict[str, list[str]] = Field(
        default_factory=get_default_day_time_slots
    )
    bookable_days: list[str] = DEFAULT_BOOKABLE_DAYS.copy()
    calendar_description: str | None = None
    calendar_location: str | None = None


def get_user_calendar_description(user) -> str | None:
    raw_description = getattr(user, "calendar_description", None)
    if not isinstance(raw_description, str):
        return None
    trimmed = raw_description.strip()
    return trimmed or None


def get_user_calendar_location(user) -> str | None:
    raw_location = getattr(user, "calendar_location", None)
    if not isinstance(raw_location, str):
        return None
    trimmed = raw_location.strip()
    return trimmed or None


def _normalize_time_slots(raw_slots) -> list[str]:
    if isinstance(raw_slots, list) and raw_slots:
        return [str(slot).strip() for slot in raw_slots if str(slot).strip()]
    return []


def _parse_legacy_time_slots(user) -> list[str]:
    raw_slots = getattr(user, "time_slots", None)
    normalized = _normalize_time_slots(raw_slots)
    if normalized:
        return normalized
    if isinstance(raw_slots, str):
        try:
            parsed = json.loads(raw_slots)
            normalized = _normalize_time_slots(parsed)
            if normalized:
                return normalized
        except json.JSONDecodeError:
            pass
    return DEFAULT_TIME_SLOTS.copy()


def get_user_day_time_slots(user) -> dict[str, list[str]]:
    raw_day_slots = getattr(user, "day_time_slots", None)
    parsed_day_slots = raw_day_slots

    if isinstance(raw_day_slots, str):
        try:
            parsed_day_slots = json.loads(raw_day_slots)
        except json.JSONDecodeError:
            parsed_day_slots = None

    if isinstance(parsed_day_slots, dict):
        normalized: dict[str, list[str]] = {}
        for day in ALL_BOOKABLE_DAYS:
            slots = _normalize_time_slots(parsed_day_slots.get(day))
            if slots:
                normalized[day] = slots
        if normalized:
            return normalized

    legacy_slots = _parse_legacy_time_slots(user)
    return {day: legacy_slots.copy() for day in ALL_BOOKABLE_DAYS}


def get_user_time_slots(user) -> list[str]:
    day_time_slots = get_user_day_time_slots(user)
    unique_slots: list[str] = []
    seen = set()

    for day in ALL_BOOKABLE_DAYS:
        for slot in day_time_slots.get(day, []):
            if slot in seen:
                continue
            seen.add(slot)
            unique_slots.append(slot)

    return unique_slots or DEFAULT_TIME_SLOTS.copy()


def get_user_time_slots_for_day(user, weekday: str) -> list[str]:
    return get_user_day_time_slots(user).get(weekday, []).copy()


def get_user_bookable_days(user) -> list[str]:
    raw_days = getattr(user, "bookable_days", None)
    if isinstance(raw_days, list) and raw_days:
        normalized = [str(day) for day in raw_days if str(day) in ALL_BOOKABLE_DAYS]
        if normalized:
            return normalized
    if isinstance(raw_days, str):
        try:
            parsed = json.loads(raw_days)
            if isinstance(parsed, list) and parsed:
                normalized = [
                    str(day) for day in parsed if str(day) in ALL_BOOKABLE_DAYS
                ]
                if normalized:
                    return normalized
        except json.JSONDecodeError:
            pass
    return DEFAULT_BOOKABLE_DAYS.copy()


def get_user_max_weeks(user) -> int:
    raw_max_weeks = getattr(user, "max_weeks", None)
    if isinstance(raw_max_weeks, int) and raw_max_weeks > 0:
        return raw_max_weeks
    return DEFAULT_MAX_WEEKS


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390000)
    return (
        f"{base64.b64encode(salt).decode('utf-8')}:"
        f"{base64.b64encode(digest).decode('utf-8')}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        encoded_salt, encoded_digest = stored_hash.split(":", 1)
        salt = base64.b64decode(encoded_salt.encode("utf-8"))
        expected_digest = base64.b64decode(encoded_digest.encode("utf-8"))
        actual_digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, 390000
        )
        return secrets.compare_digest(actual_digest, expected_digest)
    except Exception:
        return False


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "calendar"


async def generate_unique_calendar_slug(
    username: str, db: AsyncSession, *, excluded_username: str | None = None
) -> str:
    base_slug = _slugify(username)
    candidate = base_slug
    suffix = 1

    while True:
        result = await db.execute(
            select(AppUser).where(AppUser.calendar_slug == candidate)
        )
        existing_user = result.scalars().first()
        if not existing_user or existing_user.username == excluded_username:
            return candidate
        suffix += 1
        candidate = f"{base_slug}-{suffix}"


@manager.user_loader()
async def load_user(username: str) -> User | None:
    async with get_db_context() as db:
        result = await db.execute(select(AppUser).where(AppUser.username == username))
        user = result.scalars().first()
        if not user:
            return None
        return User(
            username=user.username,
            email=user.email,
            fullname=user.fullname,
            calendar_slug=user.calendar_slug,
            calendar_created=getattr(user, "calendar_created", True),
            slot_capacity=getattr(user, "slot_capacity", 5) or 5,
            max_weeks=get_user_max_weeks(user),
            time_slots=get_user_time_slots(user),
            day_time_slots=get_user_day_time_slots(user),
            bookable_days=get_user_bookable_days(user),
            calendar_description=get_user_calendar_description(user),
            calendar_location=get_user_calendar_location(user),
        )


async def authenticate_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> User:
    login_input = form_data.username
    password = form_data.password

    is_email = "@" in login_input
    if is_email:
        result = await db.execute(select(AppUser).where(AppUser.email == login_input))
    else:
        result = await db.execute(
            select(AppUser).where(AppUser.username == login_input)
        )

    user_record = result.scalars().first()
    if not user_record or not verify_password(password, user_record.password_hash):
        logger.warning("Invalid login attempt for user '%s'", login_input)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid username/email or password",
        )

    return User(
        username=user_record.username,
        email=user_record.email,
        fullname=user_record.fullname,
        calendar_slug=user_record.calendar_slug,
        calendar_created=getattr(user_record, "calendar_created", True),
        slot_capacity=getattr(user_record, "slot_capacity", 5) or 5,
        max_weeks=get_user_max_weeks(user_record),
        time_slots=get_user_time_slots(user_record),
        day_time_slots=get_user_day_time_slots(user_record),
        bookable_days=get_user_bookable_days(user_record),
        calendar_description=get_user_calendar_description(user_record),
        calendar_location=get_user_calendar_location(user_record),
    )
