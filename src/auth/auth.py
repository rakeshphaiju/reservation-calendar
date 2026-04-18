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
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.common.db import get_db, get_db_context
from src.common.logger import logger
from src.models.user import AppUser, UserCalendar


SECRET_KEY = os.getenv("SECRET_KEY", "secret-key")
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


def sort_time_slots(slots: list[str]) -> list[str]:
    return sorted(slots, key=lambda slot: slot.split("-", 1)[0])


def get_default_day_time_slots() -> dict[str, list[str]]:
    return {day: DEFAULT_TIME_SLOTS.copy() for day in ALL_BOOKABLE_DAYS}


class User(BaseModel):
    email: EmailStr
    service_name: str
    is_verified: bool = False
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
        cleaned = [str(slot).strip() for slot in raw_slots if str(slot).strip()]
        return sort_time_slots(cleaned)
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

    return sort_time_slots(unique_slots) or DEFAULT_TIME_SLOTS.copy()


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
    slug_source: str, db: AsyncSession, *, excluded_email: str | None = None
) -> str:
    base_slug = _slugify(slug_source)
    candidate = base_slug
    suffix = 1

    while True:
        result = await db.execute(
            select(UserCalendar)
            .options(joinedload(UserCalendar.user))
            .where(UserCalendar.calendar_slug == candidate)
        )
        existing_calendar = result.scalars().first()
        existing_user = existing_calendar.user if existing_calendar else None
        if not existing_user or (
            excluded_email and existing_user.email == excluded_email
        ):
            return candidate
        suffix += 1
        candidate = f"{base_slug}-{suffix}"


async def ensure_user_calendar(user: AppUser, db: AsyncSession) -> UserCalendar:
    if user.calendar:
        return user.calendar

    calendar_slug = await generate_unique_calendar_slug(
        user.service_name, db, excluded_email=user.email
    )
    calendar = UserCalendar(
        calendar_slug=calendar_slug,
        calendar_created=False,
        slot_capacity=5,
        max_weeks=DEFAULT_MAX_WEEKS,
        time_slots=json.dumps(DEFAULT_TIME_SLOTS),
        day_time_slots=json.dumps(get_default_day_time_slots()),
        bookable_days=json.dumps(DEFAULT_BOOKABLE_DAYS),
    )
    user.calendar = calendar
    db.add(calendar)
    await db.flush()
    return calendar


@manager.user_loader()
async def load_user(identifier: str) -> User | None:
    async with get_db_context() as db:
        result = await db.execute(
            select(AppUser)
            .options(joinedload(AppUser.calendar))
            .where(or_(AppUser.email == identifier, AppUser.username == identifier))
        )
        user = result.scalars().first()
        if not user:
            return None
        return User(
            email=user.email,
            service_name=user.service_name,
            is_verified=getattr(user, "is_verified", False),
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
    login_input = (form_data.username or "").strip()
    password = form_data.password

    if "@" not in login_input:
        logger.warning("Login rejected: non-email identifier")
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Sign in with your email address and password.",
        )

    result = await db.execute(
        select(AppUser)
        .options(joinedload(AppUser.calendar))
        .where(AppUser.email == login_input)
    )

    user_record = result.scalars().first()
    if not user_record or not verify_password(password, user_record.password_hash):
        logger.warning("Invalid login attempt for user '%s'", login_input)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not getattr(user_record, "is_verified", False):
        logger.warning("Unverified login attempt for user '%s'", login_input)
        raise HTTPException(
            status_code=hs.FORBIDDEN,
            detail="Please verify your email before signing in.",
        )

    return User(
        email=user_record.email,
        service_name=user_record.service_name,
        is_verified=getattr(user_record, "is_verified", False),
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
