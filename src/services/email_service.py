import os
import resend
from pydantic import EmailStr
from src.common.logger import logger


resend.api_key = os.getenv("RESEND_API_KEY")


MAIL_FROM = os.getenv("MAIL_FROM", "onboarding@resend.dev")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "Booking Nest")
FROM = f"{MAIL_FROM_NAME} <{MAIL_FROM}>"


def _send(*, to: str, subject: str, html: str, context: str) -> None:
    """Sync Resend call; logs only on failure."""
    try:
        resend.Emails.send({"from": FROM, "to": to, "subject": subject, "html": html})
    except Exception as e:
        logger.error("Failed to send %s email to %s. Error: %s", context, to, str(e))


async def send_verification_email(email: str, service_name: str, code: str) -> None:
    """Send the 6-digit OTP to the user's inbox."""
    first_name = service_name.split()[0] if service_name else "there"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 480px;">
        <h2 style="color: #1a1a1a;">Verify your email</h2>
        <p>Hi <strong>{first_name}</strong>, thanks for signing up for <strong>Booking Nest</strong>.</p>
        <p>Enter the code below to activate your account. It expires in <strong>15 minutes</strong>.</p>
        <div style="display:inline-block;padding:16px 32px;background:#f4f4f4;border-radius:8px;font-size:36px;font-weight:700;letter-spacing:12px;color:#111;margin:16px 0;">
          {code}
        </div>
        <p style="color:#888;font-size:13px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; color: gray;">
          Please do not reply to this message. The message was sent automatically and replies will not be read.
        </p>
      </body>
    </html>
    """

    _send(
        to=email,
        subject="Your Booking Nest verification code",
        html=html,
        context="email verification",
    )


async def send_confirmation_email(
    recipient_email: EmailStr,
    recipient_name: str,
    day: str,
    time: str,
    reservation_key: str,
    is_update: bool = False,
    calender_owner: str = "",
) -> None:
    action = "Updated" if is_update else "Confirmed"
    action_text = "updated" if is_update else "made"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reservation {action}!</h2>
        <p>Dear <strong>{recipient_name}</strong>,</p>
        <p>Your reservation has been successfully {action_text} with {calender_owner}. Here are the details:</p>
        <table style="border-collapse: collapse; width: 300px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{day}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{time}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Reservation Key</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{reservation_key}</td>
          </tr>
        </table>
        <p>Please keep this reservation key safe. You can use it later to cancel or modify your reservation.</p>
        <p>Thank you for your booking!</p>
        <br>
        <p style="font-size: 12px; color: gray;">Please do not reply to this message. The message was sent automatically and replies will not be read.</p>
      </body>
    </html>
    """

    _send(
        to=recipient_email,
        subject=f"Reservation {action}",
        html=html,
        context=f"confirmation ({'update' if is_update else 'new'})",
    )


async def send_admin_notification(
    owner_email: EmailStr | None,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    day: str,
    time: str,
    reservation_id: str,
    reservation_key: str,
    is_update: bool = False,
) -> None:
    if not owner_email:
        logger.warning(
            "Skipping admin notification for reservation %s — no owner email configured",
            reservation_id,
        )
        return

    action = "Updated" if is_update else "New"
    action_label = "updated" if is_update else "booked"

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2c3e50;">{action} Reservation Received!</h2>
        <p>A reservation has been successfully {action_label}.</p>

        <h3>Booking Details</h3>
        <table style="border-collapse: collapse; width: 400px; text-align: left;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{day}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{time}</td>
          </tr>
        </table>

        <h3>Customer Details</h3>
        <table style="border-collapse: collapse; width: 400px; text-align: left;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:{customer_email}">{customer_email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Phone</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{customer_phone}</td>
          </tr>
        </table>
        <br>
        <p style="font-size: 12px; color: gray;">Please do not reply to this message. The message was sent automatically and replies will not be read.</p>
      </body>
    </html>
    """

    _send(
        to=owner_email,
        subject=f"{action} Booking: {customer_name} on {day}",
        html=html,
        context=f"admin notification ({'update' if is_update else 'new'})",
    )


async def send_cancellation_email(
    recipient_email: EmailStr,
    recipient_name: str,
    day: str,
    time: str,
    reservation_key: str,
    calender_owner: str = "",
) -> None:
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reservation Cancelled</h2>
        <p>Dear <strong>{recipient_name}</strong>,</p>
        <p>Your reservation with {calender_owner} has been successfully cancelled. Here are the details:</p>
        <table style="border-collapse: collapse; width: 300px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{day}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{time}</td>
          </tr>
        </table>
        <p>If this was a mistake or you'd like to rebook, please visit our booking page.</p>
        <p>We hope to see you again!</p>
        <br>
        <p style="font-size: 12px; color: gray;">Please do not reply to this message. The message was sent automatically and replies will not be read.</p>
      </body>
    </html>
    """

    _send(
        to=recipient_email,
        subject="Reservation Cancelled",
        html=html,
        context="cancellation",
    )


async def send_admin_cancellation_notification(
    owner_email: EmailStr | None,
    customer_name: str,
    customer_email: str,
    day: str,
    time: str,
    reservation_id: str,
    reservation_key: str,
) -> None:
    if not owner_email:
        logger.warning(
            "Skipping admin cancellation notification for reservation %s — no owner email configured",
            reservation_id,
        )
        return

    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #c0392b;">Reservation Cancelled</h2>
        <p>A reservation has been cancelled by the customer.</p>

        <h3>Cancelled Booking Details</h3>
        <table style="border-collapse: collapse; width: 400px; text-align: left;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Date</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{day}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Time</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{time}</td>
          </tr>
        </table>

        <h3>Customer Details</h3>
        <table style="border-collapse: collapse; width: 400px; text-align: left;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Name</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">{customer_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Email</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:{customer_email}">{customer_email}</a></td>
          </tr>
        </table>
        <br>
        <p style="font-size: 12px; color: gray;">Please do not reply to this message. The message was sent automatically and replies will not be read.</p>
      </body>
    </html>
    """

    _send(
        to=owner_email,
        subject=f"Cancelled Booking: {customer_name} on {day}",
        html=html,
        context="admin cancellation",
    )
