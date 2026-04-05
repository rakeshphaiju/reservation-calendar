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


def _otp_key(email: str) -> str:
    return f"email_verify:otp:{email}"


def _resend_key(email: str) -> str:
    return f"email_verify:resend_lock:{email}"


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=OTP_LENGTH))


async def create_and_store_otp(email: str) -> str:
    code = _generate_otp()
    await redis_client.setex(_otp_key(email), OTP_TTL_SECONDS, code)
    logger.info("OTP created for %s (TTL=%ds)", email, OTP_TTL_SECONDS)
    return code


async def verify_otp(email: str, code: str) -> bool:
    stored = await redis_client.get(_otp_key(email))
    if not stored:
        logger.warning("OTP verify attempt for %s — no code in Redis", email)
        return False

    submitted = code.strip()
    if stored != submitted:
        logger.warning("OTP mismatch for %s", email)
        return False

    await redis_client.delete(_otp_key(email))
    logger.info("OTP verified successfully for %s", email)
    return True


async def can_resend(email: str) -> bool:
    return not await redis_client.exists(_resend_key(email))


async def set_resend_lock(email: str) -> None:
    await redis_client.setex(_resend_key(email), OTP_RESEND_SECONDS, "1")
