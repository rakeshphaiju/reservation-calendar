import os
import random
import string

import redis.asyncio as aioredis

from src.common.logger import logger

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")

redis_client: aioredis.Redis = aioredis.from_url(
    CELERY_BROKER_URL,
    encoding="utf-8",
    decode_responses=True,
)

OTP_TTL_SECONDS = 15 * 60
OTP_RESEND_SECONDS = 60
OTP_LENGTH = 6


def _purpose_prefix(purpose: str) -> str:
    normalized = purpose.strip().lower().replace(" ", "_")
    return normalized or "email_verify"


def _otp_key(email: str, purpose: str = "email_verify") -> str:
    return f"{_purpose_prefix(purpose)}:otp:{email}"


def _resend_key(email: str, purpose: str = "email_verify") -> str:
    return f"{_purpose_prefix(purpose)}:resend_lock:{email}"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


async def create_and_store_otp(email: str, purpose: str = "email_verify") -> str:
    code = _generate_otp()
    await redis_client.setex(_otp_key(email, purpose), OTP_TTL_SECONDS, code)
    logger.info(
        "OTP created for %s (purpose=%s, TTL=%ds)",
        email,
        purpose,
        OTP_TTL_SECONDS,
    )
    return code


async def verify_otp(email: str, code: str, purpose: str = "email_verify") -> bool:
    stored = await redis_client.get(_otp_key(email, purpose))
    if not stored:
        logger.warning(
            "OTP verify attempt for %s failed: no code in Redis for purpose=%s",
            email,
            purpose,
        )
        return False

    submitted = code.strip()
    if stored != submitted:
        logger.warning("OTP mismatch for %s (purpose=%s)", email, purpose)
        return False

    await redis_client.delete(_otp_key(email, purpose))
    logger.info("OTP verified successfully for %s (purpose=%s)", email, purpose)
    return True


async def can_resend(email: str, purpose: str = "email_verify") -> bool:
    return not await redis_client.exists(_resend_key(email, purpose))


async def set_resend_lock(email: str, purpose: str = "email_verify") -> None:
    await redis_client.setex(_resend_key(email, purpose), OTP_RESEND_SECONDS, "1")
