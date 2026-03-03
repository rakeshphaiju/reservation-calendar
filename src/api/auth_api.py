from datetime import timedelta
from http import HTTPStatus as hs

from fastapi import APIRouter, Depends
from fastapi_login.exceptions import InvalidCredentialsException

from src.auth.auth import TOKEN_URL, authenticate_user, manager, User


router = APIRouter()


ACCESS_TOKEN_EXPIRE_MINUTES = 60


@router.post(TOKEN_URL)
async def login(user: User = Depends(authenticate_user)):
    try:
        access_token = manager.create_access_token(
            data={"sub": user.username},
            expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
    except Exception as exc:
        raise InvalidCredentialsException from exc

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
    }
