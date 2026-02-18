from src.tasks.cleanup_past_reservations import cleanup_past_reservations
from src.common.logger import logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


async def initialize_scheduler():
    """Async initialize and configure the APScheduler"""

    scheduler.add_job(
        cleanup_past_reservations,
        CronTrigger(hour=12, minute=0),
        id="cleanup_past_reservations",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    logger.info("⏰ Scheduler initialized: Daily reservation cleanup at 12:00 PM")

    scheduler.start()
    logger.info("✅ Scheduler started")

    return scheduler
