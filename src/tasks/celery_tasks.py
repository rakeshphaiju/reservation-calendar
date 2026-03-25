import asyncio

from src.common.logger import logger
from src.services.email_service import send_admin_notification, send_confirmation_email
from src.tasks.celery_app import celery_app
from src.tasks.scripts.cleanup_past_reservations import cleanup_past_reservations


@celery_app.task(name="src.tasks.celery_tasks.send_confirmation_email_task")
def send_confirmation_email_task(
    recipient_email: str,
    recipient_name: str,
    day: str,
    time: str,
    reservation_key: str,
    is_update: bool = False,
):
    asyncio.run(
        send_confirmation_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            day=day,
            time=time,
            reservation_key=reservation_key,
            is_update=is_update,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.send_admin_notification_task")
def send_admin_notification_task(
    owner_email: str | None,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    customer_address: str,
    day: str,
    time: str,
    reservation_id: str,
    reservation_key: str,
    is_update: bool = False,
):
    asyncio.run(
        send_admin_notification(
            owner_email=owner_email,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            customer_address=customer_address,
            day=day,
            time=time,
            reservation_id=reservation_id,
            reservation_key=reservation_key,
            is_update=is_update,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.cleanup_past_reservations_task")
def cleanup_past_reservations_task():
    logger.info("Starting Celery cleanup task for past reservations")
    asyncio.run(cleanup_past_reservations())
