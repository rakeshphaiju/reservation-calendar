from src.tasks.cleanup_past_reservations import cleanup_past_reservations
from src.common.logger import logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

FINLAND_TIMEZONE = "Europe/Helsinki"

scheduler = AsyncIOScheduler(timezone=FINLAND_TIMEZONE)


async def initialize_scheduler():
    """Async initialize and configure the APScheduler"""

    scheduler.add_job(
        cleanup_past_reservations,
        CronTrigger(hour=20, minute=45, timezone=FINLAND_TIMEZONE),
        id="cleanup_past_reservations",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    logger.info("⏰ Scheduler initialized: Daily reservation cleanup at 12:00 PM")

    scheduler.start()
    logger.info("✅ Scheduler started")

    return scheduler
