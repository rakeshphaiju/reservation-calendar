import unittest
from unittest.mock import MagicMock, patch

from tests.utils.base import BaseApiTest
from src.services.email_service import (
    send_confirmation_email,
    send_admin_notification,
    send_cancellation_email,
    send_admin_cancellation_notification,
)


RECIPIENT = "testuser@mock.com"
OWNER = "owner@test.com"
BASE_KWARGS = dict(
    day="Monday 2026-04-01", time="10:00-11:00", reservation_key="test-123"
)


class TestEmailService(BaseApiTest):
    @patch("src.services.email_service.resend.Emails.send")
    async def test_new_confirmation_sent(self, mock_send):

        await send_confirmation_email(
            recipient_email=RECIPIENT,
            recipient_name="John",
            calender_owner="Jane",
            **BASE_KWARGS,
        )

        mock_send.assert_called_once()
        payload = mock_send.call_args[0][0]
        self.assertEqual(payload["to"], RECIPIENT)
        self.assertIn("Confirmed", payload["subject"])

    @patch("src.services.email_service.resend.Emails.send")
    async def test_update_confirmation_sent(self, mock_send):
        await send_confirmation_email(
            recipient_email=RECIPIENT,
            recipient_name="John",
            calender_owner="Jane",
            is_update=True,
            **BASE_KWARGS,
        )

        payload = mock_send.call_args[0][0]
        self.assertIn("Updated", payload["subject"])
        self.assertIn("updated", payload["html"])

    @patch("src.services.email_service.resend.Emails.send")
    async def test_resend_failure_is_silent(self, mock_send):

        mock_send.side_effect = Exception("SMTP failure")

        await send_confirmation_email(
            recipient_email=RECIPIENT,
            recipient_name="John",
            calender_owner="Jane",
            **BASE_KWARGS,
        )

    @patch("src.services.email_service.resend.Emails.send")
    async def test_admin_notification_sent(self, mock_send):

        await send_admin_notification(
            owner_email=OWNER,
            customer_name="John",
            customer_email=RECIPIENT,
            customer_phone="+358401234567",
            reservation_id="res-001",
            **BASE_KWARGS,
        )

        payload = mock_send.call_args[0][0]
        self.assertEqual(payload["to"], OWNER)
        self.assertIn("John", payload["subject"])
        self.assertIn(RECIPIENT, payload["html"])

    @patch("src.services.email_service.resend.Emails.send")
    async def test_admin_notification_skipped_when_no_owner_email(self, mock_send):

        await send_admin_notification(
            owner_email=None,
            customer_name="John",
            customer_email=RECIPIENT,
            customer_phone="+358401234567",
            reservation_id="res-001",
            **BASE_KWARGS,
        )

        mock_send.assert_not_called()

    @patch("src.services.email_service.resend.Emails.send")
    async def test_admin_notification_update(self, mock_send):
        await send_admin_notification(
            owner_email=OWNER,
            customer_name="John",
            customer_email=RECIPIENT,
            customer_phone="+358401234567",
            reservation_id="res-001",
            is_update=True,
            **BASE_KWARGS,
        )

        payload = mock_send.call_args[0][0]
        self.assertIn("Updated", payload["subject"])

    @patch("src.services.email_service.resend.Emails.send")
    async def test_cancellation_email_sent(self, mock_send):

        await send_cancellation_email(
            recipient_email=RECIPIENT,
            recipient_name="John",
            calender_owner="Jane",
            **BASE_KWARGS,
        )

        payload = mock_send.call_args[0][0]
        self.assertEqual(payload["to"], RECIPIENT)
        self.assertIn("Cancelled", payload["subject"])
        self.assertIn("cancelled", payload["html"].lower())

    @patch("src.services.email_service.resend.Emails.send")
    async def test_cancellation_failure_is_silent(self, mock_send):
        mock_send.side_effect = Exception("timeout")

        await send_cancellation_email(
            recipient_email=RECIPIENT,
            recipient_name="John",
            calender_owner="Jane",
            **BASE_KWARGS,
        )

    @patch("src.services.email_service.resend.Emails.send")
    async def test_admin_cancellation_sent(self, mock_send):
        await send_admin_cancellation_notification(
            owner_email=OWNER,
            customer_name="John",
            customer_email=RECIPIENT,
            reservation_id="res-001",
            **BASE_KWARGS,
        )

        payload = mock_send.call_args[0][0]
        self.assertEqual(payload["to"], OWNER)
        self.assertIn("John", payload["subject"])

    @patch("src.services.email_service.resend.Emails.send")
    async def test_admin_cancellation_skipped_when_no_owner_email(self, mock_send):

        await send_admin_cancellation_notification(
            owner_email=None,
            customer_name="John",
            customer_email=RECIPIENT,
            reservation_id="res-001",
            **BASE_KWARGS,
        )

        mock_send.assert_not_called()
