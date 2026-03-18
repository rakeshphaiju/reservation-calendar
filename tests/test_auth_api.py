import unittest
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock

from src.main import app
from src.auth.auth import authenticate_user, User, manager
from src.common.db import get_db
from tests.utils.auth_mock import mock_logged_in_user


class TestAdminAuth(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url="http://test")

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()

    async def test_admin_login(self):
        app.dependency_overrides[authenticate_user] = lambda: User(
            username="testuser", calendar_slug="testuser"
        )
        resp = await self.client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpass"},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertIn("access-token", resp.cookies)
        self.assertEqual("testuser", resp.json()["calendar_slug"])

    async def test_register_user(self):
        existing_user_result = MagicMock()
        existing_user_result.scalars.return_value.first.return_value = None

        unique_slug_result = MagicMock()
        unique_slug_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [existing_user_result, unique_slug_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/auth/register",
            json={"username": "new-user", "password": "strongpass123"},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("new-user", resp.json()["username"])
        self.assertEqual("new-user", resp.json()["calendar_slug"])
        self.assertEqual("/calendar/new-user", resp.json()["calendar_url"])
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()

    async def test_get_me_authenticated(self):
        mock_logged_in_user(app)
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("mock-user", resp.json()["username"])
        self.assertEqual("mock-user", resp.json()["calendar_slug"])

    async def test_logout_success(self):
        mock_logged_in_user(app)
        resp = await self.client.post("/api/logout")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertNotIn("access-token", resp.cookies)
        self.assertEqual("Logged out successfully", resp.json()["message"])

    async def test_get_me_unauthenticated(self):
        self.client.cookies.delete("access-token")
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)
        self.assertIn("Invalid credentials", resp.json()["detail"])
