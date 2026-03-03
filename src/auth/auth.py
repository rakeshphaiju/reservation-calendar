import os
from http import HTTPStatus as hs

from fastapi import Depends, HTTPException
from fastapi_login import LoginManager
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from src.common.logger import logger


SECRET_KEY = os.getenv("SECRET_KEY", "secret")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")


TOKEN_URL = "/api/auth/login"

manager = LoginManager(SECRET_KEY, token_url=TOKEN_URL)


class User(BaseModel):
    username: str


ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")

_USERS_DB: dict[str, dict[str, str]] = {
    ADMIN_USERNAME: {
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD,
    }
}


@manager.user_loader()
def load_user(username: str) -> User | None:
    user_data = _USERS_DB.get(username)
    if not user_data:
        return None
    return User(username=user_data["username"])


async def authenticate_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> User:
    username = form_data.username
    password = form_data.password

    user_record = _USERS_DB.get(username)
    if not user_record or user_record["password"] != password:
        logger.warning("Invalid login attempt for user '%s'", username)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return User(username=username)
