from http import HTTPStatus as hs
from unittest.mock import AsyncMock, MagicMock

from src.main import app
from src.common.db import get_db
from tests.utils.base import BaseApiTest
from tests.utils.fixtures import make_mock_reservations


class TestReservationsApi(BaseApiTest):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.mock_reservations = make_mock_reservations()

    async def test_get_all_reservations(self):
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = len(self.mock_reservations)

        mock_data_result = MagicMock()
        mock_data_result.scalars.return_value.all.return_value = self.mock_reservations

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
                        "owner_slug": "mock-user",
                        "reservation_key": "reservation-key-1",
                        "name": "John Doe",
                        "email": "john@example.com",
                        "phone_number": "123456789",
                        "day": "2026-03-20",
                        "time": "16:00-16:30",
                    },
                    {
                        "id": "f6eb947c-a5b5-43b0-8baa-0731a75fa6e5",
                        "owner_slug": "mock-user",
                        "reservation_key": "reservation-key-2",
                        "name": "Jane Doe",
                        "email": "jane@example.com",
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

    async def test_delete_reservation_success(self):
        reservation = self.mock_reservations[0]

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{reservation.id}")
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
        reservation = self.mock_reservations[0]

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        mock_db.delete.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{reservation.id}")
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual("Failed to delete reservation.", resp.json()["detail"])
        mock_db.rollback.assert_awaited_once()
