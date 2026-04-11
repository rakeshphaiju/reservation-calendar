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
                service_name="Alice Example",
                password_hash="hash",
                calendar_slug="alice",
                calendar_created=True,
            ),
            AppUser(
                username="bob",
                email="bob@example.com",
                service_name="Bob Example",
                password_hash="hash",
                calendar_slug="bob",
                calendar_created=True,
            ),
        ]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_users_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            [
                {"service_name": "Alice Example", "calendar_slug": "alice"},
                {"service_name": "Bob Example", "calendar_slug": "bob"},
            ],
            resp.json(),
        )

    async def test_get_reservations_slots(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            service_name="Mock User",
            password_hash="hash",
            calendar_slug="mock-user",
            calendar_created=True,
            time_slots=json.dumps(["16:00-16:30", "11:00-11:30"]),
            bookable_days=json.dumps(["Monday", "Tuesday"]),
            calendar_description="Please arrive five minutes early.",
            calendar_location="Studio B",
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
        self.assertEqual(4, resp.json()["max_weeks"])
        self.assertEqual(["16:00-16:30", "11:00-11:30"], resp.json()["time_slots"])
        self.assertEqual(
            {
                "Monday": ["16:00-16:30", "11:00-11:30"],
                "Tuesday": ["16:00-16:30", "11:00-11:30"],
                "Wednesday": ["16:00-16:30", "11:00-11:30"],
                "Thursday": ["16:00-16:30", "11:00-11:30"],
                "Friday": ["16:00-16:30", "11:00-11:30"],
                "Saturday": ["16:00-16:30", "11:00-11:30"],
                "Sunday": ["16:00-16:30", "11:00-11:30"],
            },
            resp.json()["day_time_slots"],
        )
        self.assertEqual(["Monday", "Tuesday"], resp.json()["bookable_days"])
        self.assertEqual(
            "Please arrive five minutes early.",
            resp.json()["calendar_description"],
        )
        self.assertEqual("Studio B", resp.json()["calendar_location"])
        self.assertEqual(
            [
                {"day": "Monday", "time": "16:00-16:30", "count": 5, "capacity": 5},
                {"day": "Tuesday", "time": "11:00-11:30", "count": 3, "capacity": 5},
            ],
            resp.json()["slots"],
        )
