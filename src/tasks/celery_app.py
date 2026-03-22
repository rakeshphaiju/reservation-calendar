import os

from celery import Celery
from celery.schedules import crontab


CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", CELERY_BROKER_URL)
FINLAND_TIMEZONE = "Europe/Helsinki"


celery_app = Celery(
    "reservation_calendar",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    timezone=FINLAND_TIMEZONE,
    enable_utc=True,
    imports=("src.tasks.celery_tasks",),
    beat_schedule={
        "cleanup_past_reservations": {
            "task": "src.tasks.celery_tasks.cleanup_past_reservations_task",
            "schedule": crontab(hour=10, minute=00),
        }
    },
)
