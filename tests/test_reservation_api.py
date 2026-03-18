import unittest
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from src.main import app
from src.models.reservation import Reservation
from src.common.db import get_db
from tests.utils.db_mock import mock_get_db
from tests.utils.auth_mock import mock_logged_in_user


mock_reservations = [
    Reservation(
        id="3fe6fd7c-1c87-11f1-941d-325096b39f47",
        name="John Doe",
        email="john@example.com",
        address="123 Main St",
        phone_number="123456789",
        day="2026-03-20",
        time="16:00-16:30",
    ),
    Reservation(
        id="f6eb947c-a5b5-43b0-8baa-0731a75fa6e5",
        name="Jane Doe",
        email="jane@example.com",
        address="456 Side St",
        phone_number="987654321",
        day="2026-03-21",
        time="11:00-11:00",
    ),
]

RESERVATION_PAYLOAD = {
    "name": "John Cena",
    "email": "john@cena.com",
    "address": "123 Main St",
    "phone_number": "1234467892",
    "day": "2026-03-20",
    "time": "17:00-18:00",
}


class TestReservationsApi(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        mock_get_db(app)
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url="http://test")
        mock_logged_in_user(app)

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()

    async def test_health_check(self):
        resp = await self.client.get("/api/health")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(resp.json(), {"status": "ok"})

    async def test_get_all_reservations(self):
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = len(mock_reservations)

        mock_data_result = MagicMock()
        mock_data_result.scalars.return_value.all.return_value = mock_reservations

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_count_result, mock_data_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/reservations?skip=0&limit=10")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(4, len(resp.json()))
        self.assertEqual(
            {
                "total_count": 2,
                "skip": 0,
                "limit": 10,
                "data": [
                    {
                        "id": "3fe6fd7c-1c87-11f1-941d-325096b39f47",
                        "name": "John Doe",
                        "email": "john@example.com",
                        "address": "123 Main St",
                        "phone_number": "123456789",
                        "day": "2026-03-20",
                        "time": "16:00-16:30",
                    },
                    {
                        "id": "f6eb947c-a5b5-43b0-8baa-0731a75fa6e5",
                        "name": "Jane Doe",
                        "email": "jane@example.com",
                        "address": "456 Side St",
                        "phone_number": "987654321",
                        "day": "2026-03-21",
                        "time": "11:00-11:00",
                    },
                ],
            },
            resp.json(),
        )

    async def test_get_all_reservations_unauthenticated(self):
        app.dependency_overrides.clear()
        self.client.cookies.delete("access-token")

        resp = await self.client.get("/api/reservations")
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)

    async def test_get_reservations_slots(self):
        mock_result = MagicMock()
        mock_result.all.return_value = [
            ("Monday", "16:00-16:30", 5),
            ("Tuesday", "11:00-11:30", 3),
        ]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/reservations/slots")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(2, len(resp.json()))
        self.assertEqual(
            [
                {"day": "Monday", "time": "16:00-16:30", "count": 5},
                {"day": "Tuesday", "time": "11:00-11:30", "count": 3},
            ],
            resp.json(),
        )

    async def test_delete_reservation_success(self):
        reservation = mock_reservations[0]
        reserve_id = reservation.id

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{reserve_id}")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"message": "Reservation deleted successfully"}, resp.json())

        mock_db.delete.assert_awaited_once_with(reservation)
        mock_db.commit.assert_awaited_once()

    async def test_delete_reservation_not_found(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(
            "/api/reservations/3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )
        self.assertEqual(hs.NOT_FOUND, resp.status_code)
        self.assertEqual("Reservation not found", resp.json()["detail"])

    async def test_delete_reservation_unauthenticated(self):
        app.dependency_overrides.clear()

        resp = await self.client.delete(
            "/api/reservations/3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)

    async def test_delete_reservation_db_error(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_reservations[0]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        mock_db.delete.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{mock_reservations[0].id}")
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual("Failed to delete reservation.", resp.json()["detail"])

        mock_db.rollback.assert_awaited_once()

    async def test_add_reservation_success(self):
        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalars.return_value.all.return_value = []

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_existing_email, mock_slot_reservations]
        mock_db.add = MagicMock()
        mock_db.refresh.side_effect = lambda obj: setattr(
            obj, "id", "3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )

        app.dependency_overrides[get_db] = lambda: mock_db

        with (
            patch("src.api.reservation_api.send_confirmation_email") as mock_confirm,
            patch("src.api.reservation_api.send_admin_notification") as mock_admin,
        ):
            resp = await self.client.post(
                "/api/reservations/add", json=RESERVATION_PAYLOAD
            )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("John Cena", resp.json()["name"])
        self.assertEqual("2026-03-20", resp.json()["day"])

        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_add_reservation_conflict(self):
        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_slot_reservations = MagicMock()

        mock_slot_reservations.scalars.return_value.all.return_value = [
            Reservation(
                id=f"slot-full-{i}",
                name="Mock User",
                email=f"mockuser{i}@example.com",
                address="Addr",
                phone_number="1234567890",
                day=RESERVATION_PAYLOAD["day"],
                time=RESERVATION_PAYLOAD["time"],
            )
            for i in range(5)
        ]

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_existing_email, mock_slot_reservations]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post("/api/reservations/add", json=RESERVATION_PAYLOAD)
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual("This time slot is fully booked", resp.json()["detail"])

        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_email_conflict(self):
        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = Reservation(
            id="existing-email-conflict",
            **RESERVATION_PAYLOAD,
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_existing_email

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post("/api/reservations/add", json=RESERVATION_PAYLOAD)
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual(
            "This user already has a reservation for this time slot",
            resp.json()["detail"],
        )

        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_db_error(self):
        mock_existing = MagicMock()
        mock_existing.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.return_value = mock_existing
        mock_db.commit.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post("/api/reservations/add", json=RESERVATION_PAYLOAD)
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual(
            "An unexpected error occurred while saving the reservation.",
            resp.json()["detail"],
        )
        mock_db.rollback.assert_awaited_once()

    async def test_add_reservation_invalid_payload(self):
        resp = await self.client.post("/api/reservations/add", json={"name": "John"})
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
