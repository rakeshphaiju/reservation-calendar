# src/services/email_service.py
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

ADMIN_EMAIL = os.getenv("MAIL_USERNAME")


async def send_confirmation_email(
    recipient_email: EmailStr,
    recipient_name: str,
    day: str,
    time: str,
):
    try:
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Reservation Confirmed!</h2>
            <p>Dear <strong>{recipient_name}</strong>,</p>
            <p>Your reservation has been successfully made. Here are the details:</p>
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
            <p>If you need to cancel or modify your reservation, please contact us.</p>
            <p>Thank you for your booking!</p>
          </body>
        </html>
        """

        message = MessageSchema(
            subject="Reservation Confirmed",
            recipients=[recipient_email],
            body=html_body,
            subtype=MessageType.html,
        )

        logger.info(
            f"Attempting to send confirmation email to customer: {recipient_email}"
        )

        fm = FastMail(conf)
        await fm.send_message(message)

        logger.info(f"Successfully sent confirmation email to {recipient_email}")

    except Exception as e:
        logger.error(
            f"Failed to send confirmation email to {recipient_email}. Error: {str(e)}"
        )


async def send_admin_notification(
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    customer_address: str,
    day: str,
    time: str,
    reservation_id: str,
):
    try:
        html_body = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #2c3e50;">New Reservation Received!</h2>
            <p>A new reservation has been successfully booked.</p>
            
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
          </body>
        </html>
        """

        message = MessageSchema(
            subject=f"New Booking: {customer_name} on {day}",
            recipients=[ADMIN_EMAIL],
            body=html_body,
            subtype=MessageType.html,
        )

        logger.info(
            f"Attempting to send admin notification email to: {ADMIN_EMAIL} for reservation {reservation_id}"
        )

        fm = FastMail(conf)
        await fm.send_message(message)

        logger.info(f"Successfully sent admin notification to {ADMIN_EMAIL}")

    except Exception as e:
        logger.error(
            f"Failed to send admin notification email to {ADMIN_EMAIL}. Error: {str(e)}"
        )
