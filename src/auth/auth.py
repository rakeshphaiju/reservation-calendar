import base64
import hashlib
import os
import re
import secrets
from http import HTTPStatus as hs

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_login import LoginManager
from pydantic import BaseModel
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


class User(BaseModel):
    username: str
    calendar_slug: str


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
        return User(username=user.username, calendar_slug=user.calendar_slug)


async def authenticate_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> User:
    username = form_data.username
    password = form_data.password

    result = await db.execute(select(AppUser).where(AppUser.username == username))
    user_record = result.scalars().first()
    if not user_record or not verify_password(password, user_record.password_hash):
        logger.warning("Invalid login attempt for user '%s'", username)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return User(username=user_record.username, calendar_slug=user_record.calendar_slug)
