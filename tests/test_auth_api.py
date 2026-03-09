import unittest
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.auth.auth import authenticate_user, User, manager
from tests.utils.auth_mock import mock_logged_in_user


class TestAdminAuth(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url="http://test")

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()

    async def test_admin_login(self):
        app.dependency_overrides[authenticate_user] = lambda: User(username="testuser")
        resp = await self.client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpass"},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertIn("access-token", resp.cookies)

    async def test_get_me_authenticated(self):
        mock_logged_in_user(app)
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("mock-user", resp.json()["username"])

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
