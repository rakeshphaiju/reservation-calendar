import json
from http import HTTPStatus as hs
from unittest.mock import AsyncMock, MagicMock, patch

from src.main import app
from src.models.user import AppUser
from src.common.db import get_db
from tests.utils.base import BaseApiTest
from tests.utils.fixtures import make_mock_reservations, RESERVATION_PAYLOAD


class TestPublicReservationsApi(BaseApiTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.mock_reservations = make_mock_reservations()

    async def test_get_public_reservation_by_key_success(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = self.mock_reservations[0]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/public/reservations/reservation-key-1")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("reservation-key-1", resp.json()["reservation_key"])
        self.assertEqual("John Doe", resp.json()["name"])

    async def test_get_public_reservation_by_key_not_found(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/public/reservations/missing-key")
        self.assertEqual(hs.NOT_FOUND, resp.status_code)
        self.assertEqual("Reservation not found", resp.json()["detail"])

    async def test_update_public_reservation_by_key_success(self):
        reservation = self.mock_reservations[0]

        mock_reservation_result = MagicMock()
        mock_reservation_result.scalars.return_value.first.return_value = reservation

        mock_owner_result = MagicMock()
        mock_owner_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00", "18:00-19:00", "19:00-20:00"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 1

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_reservation_result,
            mock_owner_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        payload = {**RESERVATION_PAYLOAD, "name": "Updated Name", "time": "19:00-20:00"}

        with (
            patch(
                "src.api.reservations.reservations_api.send_confirmation_email_task.delay"
            ),
            patch(
                "src.api.reservations.reservations_api.send_admin_notification_task.delay"
            ),
        ):
            resp = await self.client.put(
                "/api/public/reservations/reservation-key-1",
                json=payload,
            )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("Updated Name", resp.json()["name"])
        self.assertEqual("19:00-20:00", resp.json()["time"])
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once_with(reservation)

    async def test_delete_public_reservation_by_key_success(self):
        reservation = self.mock_reservations[0]

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete("/api/public/reservations/reservation-key-1")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"message": "Reservation deleted successfully"}, resp.json())
        mock_db.delete.assert_awaited_once_with(reservation)
        mock_db.commit.assert_awaited_once()
