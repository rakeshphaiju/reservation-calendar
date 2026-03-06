from datetime import timedelta
from http import HTTPStatus as hs
from fastapi import APIRouter, Depends, Response
from fastapi_login.exceptions import InvalidCredentialsException

from src.auth.auth import TOKEN_URL, authenticate_user, manager, User
from src.common.logger import logger


router = APIRouter()


ACCESS_TOKEN_EXPIRE_MINUTES = 60


@router.post(TOKEN_URL)
async def login(response: Response, user: User = Depends(authenticate_user)):
    try:
        access_token = manager.create_access_token(
            data={"sub": user.username},
            expires=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        manager.set_cookie(response, access_token)
        logger.info(f"User {user.username} logged in")
    except Exception as exc:
        raise InvalidCredentialsException from exc

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
    }


@router.get("/api/auth/me")
async def get_me(user=Depends(manager)):
    try:
        return {
            "username": user.username,
            "authenticated": True,
        }
    except AttributeError as e:
        logger.error(f"Invalid user object: {e}", exc_info=True)
        raise HTTPException(
            status_code=hs.UNAUTHORIZED,
            detail="Invalid session. Please log in again.",
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
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
            secure=False,  # Set True in production
            path="/",
        )
        logger.info("User logged out successfully")
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Unexpected error during logout: {e}", exc_info=True)
        raise HTTPException(
            status_code=hs.INTERNAL_SERVER_ERROR,
            detail="Logout failed. Please try again.",
        )
