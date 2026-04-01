import json
from http import HTTPStatus as hs
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.common.db import get_db
from tests.utils.base import BaseApiTest
from tests.utils.fixtures import RESERVATION_PAYLOAD, make_mock_user


class TestAddReservationApi(BaseApiTest):
    async def test_add_reservation_success(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"])
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 0

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]
        mock_db.add = MagicMock()
        mock_db.refresh.side_effect = lambda obj: setattr(
            obj, "id", "3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )

        app.dependency_overrides[get_db] = lambda: mock_db

        with (
            patch(
                "src.api.reservations.reservations_api.send_confirmation_email_task.delay"
            ) as mock_confirm,
            patch(
                "src.api.reservations.reservations_api.send_admin_notification_task.delay"
            ) as mock_admin,
        ):
            resp = await self.client.post(
                "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
            )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("John Cena", resp.json()["name"])
        self.assertEqual("2026-03-20", resp.json()["day"])
        self.assertEqual("mock-user", resp.json()["owner_slug"])

        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()
        mock_confirm.assert_called_once()
        mock_admin.assert_called_once()
        self.assertEqual(
            "owner@example.com",
            mock_admin.call_args.kwargs["owner_email"],
        )
        self.assertTrue(mock_confirm.call_args.kwargs["reservation_key"])
        self.assertEqual(
            mock_confirm.call_args.kwargs["reservation_key"],
            mock_admin.call_args.kwargs["reservation_key"],
        )

    async def test_add_reservation_conflict(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"])
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 5

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual("This time slot is fully booked", resp.json()["detail"])
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_email_conflict(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"])
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = Reservation(
            id="existing-email-conflict",
            owner_slug="mock-user",
            **RESERVATION_PAYLOAD,
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual(
            "This user already has a reservation for this time slot",
            resp.json()["detail"],
        )
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_db_error(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"])
        )

        mock_existing = MagicMock()
        mock_existing.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 0

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing,
            mock_slot_reservations,
        ]
        mock_db.commit.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual(
            "An unexpected error occurred while saving the reservation.",
            resp.json()["detail"],
        )
        mock_db.rollback.assert_awaited_once()

    async def test_add_reservation_invalid_payload(self):
        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json={"name": "John"}
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)

    async def test_add_reservation_invalid_day_format(self):
        payload = {**RESERVATION_PAYLOAD, "day": "2026-02-30"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn(
            "Day must be a valid date in YYYY-MM-DD format", resp.json()["detail"]
        )

    async def test_add_reservation_invalid_time_range(self):
        payload = {**RESERVATION_PAYLOAD, "time": "25:00-26:00"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn("Time must use valid 24-hour values", resp.json()["detail"])

    async def test_add_reservation_rejects_time_that_does_not_end_after_it_starts(self):
        payload = {**RESERVATION_PAYLOAD, "time": "11:00-11:00"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn("Time must end after it starts", resp.json()["detail"])

    async def test_add_reservation_rejects_unconfigured_time_slot(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["09:00-10:00"])
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_lock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertEqual(
            "This time slot is not available for this calendar",
            resp.json()["detail"],
        )

    async def test_add_reservation_rejects_unconfigured_day(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"]),
            bookable_days=json.dumps(["Monday", "Tuesday"]),
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_lock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertEqual(
            "This day is not available for this calendar",
            resp.json()["detail"],
        )

    async def test_add_reservation_uses_day_specific_time_slots(self):
        saturday_payload = {
            **RESERVATION_PAYLOAD,
            "day": "2026-03-21",
            "time": "09:00-10:00",
        }

        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            time_slots=json.dumps(["17:00-18:00"]),
            day_time_slots=json.dumps(
                {
                    "Monday": ["17:00-18:00"],
                    "Tuesday": ["17:00-18:00"],
                    "Wednesday": ["17:00-18:00"],
                    "Thursday": ["17:00-18:00"],
                    "Friday": ["17:00-18:00"],
                    "Saturday": ["09:00-10:00"],
                    "Sunday": ["10:00-11:00"],
                }
            ),
            bookable_days=json.dumps(["Friday", "Saturday"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 0

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]
        mock_db.add = MagicMock()
        mock_db.refresh.side_effect = lambda obj: setattr(
            obj, "id", "3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )

        app.dependency_overrides[get_db] = lambda: mock_db

        with (
            patch(
                "src.api.reservations.reservations_api.send_confirmation_email_task.delay"
            ),
            patch(
                "src.api.reservations.reservations_api.send_admin_notification_task.delay"
            ),
        ):
            resp = await self.client.post(
                "/api/calendars/mock-user/reservations/add", json=saturday_payload
            )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("09:00-10:00", resp.json()["time"])
