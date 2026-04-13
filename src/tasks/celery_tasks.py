import asyncio

from src.services.email_service import (
    send_admin_notification,
    send_admin_cancellation_notification,
    send_cancellation_email,
    send_confirmation_email,
    send_verification_email,
)
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
    calender_owner: str = "",
):
    asyncio.run(
        send_confirmation_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            day=day,
            time=time,
            reservation_key=reservation_key,
            is_update=is_update,
            calender_owner=calender_owner,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.send_admin_notification_task")
def send_admin_notification_task(
    owner_email: str | None,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
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
            day=day,
            time=time,
            reservation_id=reservation_id,
            reservation_key=reservation_key,
            is_update=is_update,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.send_cancellation_email_task")
def send_cancellation_email_task(
    recipient_email: str,
    recipient_name: str,
    day: str,
    time: str,
    reservation_key: str,
    calender_owner: str = "",
):
    asyncio.run(
        send_cancellation_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            day=day,
            time=time,
            reservation_key=reservation_key,
            calender_owner=calender_owner,
        )
    )


@celery_app.task(
    name="src.tasks.celery_tasks.send_admin_cancellation_notification_task"
)
def send_admin_cancellation_notification_task(
    owner_email: str | None,
    customer_name: str,
    customer_email: str,
    day: str,
    time: str,
    reservation_id: str,
    reservation_key: str,
):
    asyncio.run(
        send_admin_cancellation_notification(
            owner_email=owner_email,
            customer_name=customer_name,
            customer_email=customer_email,
            day=day,
            time=time,
            reservation_id=reservation_id,
            reservation_key=reservation_key,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.send_verification_email_task")
def send_verification_email_task(
    email: str,
    service_name: str,
    code: str,
):
    asyncio.run(
        send_verification_email(
            email=email,
            service_name=service_name,
            code=code,
        )
    )


@celery_app.task(name="src.tasks.celery_tasks.cleanup_past_reservations_task")
def cleanup_past_reservations_task():
    asyncio.run(cleanup_past_reservations())
