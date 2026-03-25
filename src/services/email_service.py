import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from src.common.logger import logger

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "Reservation App"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)


async def send_confirmation_email(
    recipient_email: EmailStr,
    recipient_name: str,
    day: str,
    time: str,
    reservation_key: str,
    is_update: bool = False,
):

    action = "Updated" if is_update else "Confirmed"
    action_text = "updated" if is_update else "made"

    try:
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Reservation {action}!</h2>
            <p>Dear <strong>{recipient_name}</strong>,</p>
            <p>Your reservation has been successfully {action_text}. Here are the details:</p>
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
          </body>
        </html>
        """

        message = MessageSchema(
            subject=f"Reservation {action}",
            recipients=[recipient_email],
            body=html_body,
            subtype=MessageType.html,
        )

        logger.info(
            "Attempting to send %s email to customer: %s",
            action.lower(),
            recipient_email,
        )

        fm = FastMail(conf)
        await fm.send_message(message)

        logger.info("Successfully sent %s email to %s", action.lower(), recipient_email)

    except Exception as e:
        logger.error(
            "Failed to send %s email to %s. Error: %s",
            action.lower(),
            recipient_email,
            str(e),
        )


async def send_admin_notification(
    owner_email: EmailStr | None,
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
    if not owner_email:
        logger.warning(
            "Skipping admin notification for reservation %s because no owner email is configured",
            reservation_id,
        )
        return

    action = "Updated" if is_update else "New"
    action_label = "updated" if is_update else "booked"

    try:
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2c3e50;">{action}  Reservation Received!</h2>
            <p>A new reservation has been successfully {action_label}.</p>
            
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
                <td style="padding: 8px; border: 1px solid #ddd;">
                  <a href="mailto:{customer_email}">{customer_email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Phone</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{customer_phone}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Address</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">{customer_address}</td>
              </tr>
            </table>
            <br>
            <p style="font-size: 12px; color: gray;">Ref ID: {reservation_id}</p>
            <p style="font-size: 12px; color: gray;">Reservation Key: {reservation_key}</p>
          </body>
        </html>
        """

        message = MessageSchema(
            subject=f"{action} Booking: {customer_name} on {day}",
            recipients=[owner_email],
            body=html_body,
            subtype=MessageType.html,
        )

        logger.info(
            "Attempting to send admin %s notification to: %s for reservation %s",
            action.lower(),
            owner_email,
            reservation_id,
        )

        fm = FastMail(conf)
        await fm.send_message(message)

        logger.info(
            "Successfully sent admin %s notification to %s",
            action.lower(),
            owner_email,
        )

    except Exception as e:
        logger.error(
            "Failed to send admin %s notification to %s. Error: %s",
            action.lower(),
            owner_email,
            str(e),
        )
