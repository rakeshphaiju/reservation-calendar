from http import HTTPStatus as hs
from unittest.mock import AsyncMock, MagicMock

from src.main import app
from src.common.db import get_db
from tests.utils.base import BaseApiTest
from tests.utils.fixtures import make_mock_user


class TestDashboardApi(BaseApiTest):
    async def test_get_slot_capacity(self):
        resp = await self.client.get("/api/dashboard/slot-capacity")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"slot_capacity": 5}, resp.json())

    async def test_update_slot_capacity(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            slot_capacity=8
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/slot-capacity",
            json={"slot_capacity": 8},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"slot_capacity": 8}, resp.json())
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_get_max_weeks(self):
        resp = await self.client.get("/api/dashboard/max-weeks")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"max_weeks": 4}, resp.json())

    async def test_update_max_weeks(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            max_weeks=12
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/max-weeks",
            json={"max_weeks": 12},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"max_weeks": 12}, resp.json())
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_get_time_slots(self):
        resp = await self.client.get("/api/dashboard/time-slots")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "time_slots": [
                    "10:00-11:00",
                    "11:00-12:00",
                    "12:00-13:00",
                    "13:00-14:00",
                    "15:00-16:00",
                    "16:00-17:00",
                    "17:00-18:00",
                ],
                "day_time_slots": {
                    "Monday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Tuesday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Wednesday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Thursday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Friday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Saturday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                    "Sunday": [
                        "10:00-11:00",
                        "11:00-12:00",
                        "12:00-13:00",
                        "13:00-14:00",
                        "15:00-16:00",
                        "16:00-17:00",
                        "17:00-18:00",
                    ],
                },
                "date_time_slots": {},
            },
            resp.json(),
        )

    async def test_update_time_slots(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user()

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/time-slots",
            json={
                "day_time_slots": {
                    "Monday": ["09:00-10:00", "10:00-11:00"],
                    "Tuesday": ["09:00-10:00", "10:00-11:00"],
                    "Wednesday": ["09:00-10:00", "10:00-11:00"],
                    "Thursday": ["09:00-10:00", "10:00-11:00"],
                    "Friday": ["09:00-10:00", "10:00-11:00"],
                    "Saturday": ["11:00-12:00"],
                    "Sunday": ["11:00-12:00"],
                },
                "date_time_slots": {"2026-04-04": ["14:00-15:00"]},
            },
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "time_slots": [
                    "09:00-10:00",
                    "10:00-11:00",
                    "11:00-12:00",
                    "14:00-15:00",
                ],
                "day_time_slots": {
                    "Monday": ["09:00-10:00", "10:00-11:00"],
                    "Tuesday": ["09:00-10:00", "10:00-11:00"],
                    "Wednesday": ["09:00-10:00", "10:00-11:00"],
                    "Thursday": ["09:00-10:00", "10:00-11:00"],
                    "Friday": ["09:00-10:00", "10:00-11:00"],
                    "Saturday": ["11:00-12:00"],
                    "Sunday": ["11:00-12:00"],
                },
                "date_time_slots": {"2026-04-04": ["14:00-15:00"]},
            },
            resp.json(),
        )
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_get_bookable_days(self):
        resp = await self.client.get("/api/dashboard/bookable-days")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {"bookable_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]},
            resp.json(),
        )

    async def test_update_bookable_days(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user()

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/bookable-days",
            json={"bookable_days": ["Monday", "Wednesday", "Saturday"]},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {"bookable_days": ["Monday", "Wednesday", "Saturday"]},
            resp.json(),
        )
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_update_bookable_days_allows_empty_list(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            bookable_days="[]"
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/bookable-days",
            json={"bookable_days": []},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"bookable_days": []}, resp.json())
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_get_calendar_details(self):
        resp = await self.client.get("/api/dashboard/calendar-details")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "calendar_description": "Bring any documents you need reviewed.",
                "calendar_location": "Helsinki office",
            },
            resp.json(),
        )

    async def test_update_calendar_details(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user()

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/calendar-details",
            json={
                "calendar_description": "Meet in the front lobby.",
                "calendar_location": "Room 204",
            },
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "calendar_description": "Meet in the front lobby.",
                "calendar_location": "Room 204",
            },
            resp.json(),
        )
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_create_calendar(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            calendar_created=False
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post("/api/dashboard/create-calendar")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "calendar_created": True,
                "calendar_slug": "mock-user",
                "calendar_url": "/calendar/mock-user",
            },
            resp.json(),
        )
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()

    async def test_make_calendar_private(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = make_mock_user(
            calendar_created=True
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post("/api/dashboard/make-calendar-private")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {
                "calendar_created": False,
                "calendar_slug": "mock-user",
                "calendar_url": None,
            },
            resp.json(),
        )
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()
