import json
from http import HTTPStatus as hs
from unittest.mock import AsyncMock, MagicMock

from src.main import app
from src.models.user import AppUser
from src.common.db import get_db
from tests.utils.base import BaseApiTest


class TestCalendarsApi(BaseApiTest):
    async def test_get_calendar_owners(self):
        mock_users_result = MagicMock()
        mock_users_result.scalars.return_value.all.return_value = [
            AppUser(
                username="alice",
                email="alice@example.com",
                password_hash="hash",
                calendar_slug="alice",
            ),
            AppUser(
                username="bob",
                email="bob@example.com",
                password_hash="hash",
                calendar_slug="bob",
            ),
        ]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_users_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            [
                {"username": "alice", "calendar_slug": "alice"},
                {"username": "bob", "calendar_slug": "bob"},
            ],
            resp.json(),
        )

    async def test_get_reservations_slots(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["16:00-16:30", "11:00-11:30"]),
            bookable_days=json.dumps(["Monday", "Tuesday"]),
        )

        mock_result = MagicMock()
        mock_result.all.return_value = [
            ("Monday", "16:00-16:30", 5),
            ("Tuesday", "11:00-11:30", 3),
        ]

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars/mock-user/reservations/slots")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("mock-user", resp.json()["owner_slug"])
        self.assertEqual(5, resp.json()["slot_capacity"])
        self.assertEqual(["16:00-16:30", "11:00-11:30"], resp.json()["time_slots"])
        self.assertEqual(["Monday", "Tuesday"], resp.json()["bookable_days"])
        self.assertEqual(
            [
                {"day": "Monday", "time": "16:00-16:30", "count": 5, "capacity": 5},
                {"day": "Tuesday", "time": "11:00-11:30", "count": 3, "capacity": 5},
            ],
            resp.json()["slots"],
        )
