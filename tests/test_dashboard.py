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
                ]
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
            json={"time_slots": ["09:00-10:00", "10:00-11:00"]},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"time_slots": ["09:00-10:00", "10:00-11:00"]}, resp.json())
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
