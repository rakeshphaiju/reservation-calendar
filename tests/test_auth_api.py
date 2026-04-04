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
            username="testuser",
            email="testuser@example.com",
            fullname="Test User",
            calendar_slug="testuser",
        )
        resp = await self.client.post(
            "/api/auth/login",
            data={"username": "testuser", "password": "testpass"},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertIn("access-token", resp.cookies)
        self.assertEqual("testuser", resp.json()["calendar_slug"])
        self.assertIn("max_weeks", resp.json())
        self.assertIn("time_slots", resp.json())
        self.assertIn("day_time_slots", resp.json())
        self.assertIn("bookable_days", resp.json())
        self.assertIn("calendar_description", resp.json())
        self.assertIn("calendar_location", resp.json())

    async def test_register_user(self):
        existing_username_result = MagicMock()
        existing_username_result.scalars.return_value.first.return_value = None

        existing_email_result = MagicMock()
        existing_email_result.scalars.return_value.first.return_value = None

        unique_slug_result = MagicMock()
        unique_slug_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [
            existing_username_result,
            existing_email_result,
            unique_slug_result,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/auth/register",
            json={
                "username": "new-user",
                "email": "new-user@example.com",
                "fullname": "New User",
                "password": "strongpass123",
            },
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("new-user", resp.json()["username"])
        self.assertEqual("new-user@example.com", resp.json()["email"])
        self.assertEqual("new-user", resp.json()["calendar_slug"])
        self.assertFalse(resp.json()["calendar_created"])
        self.assertIsNone(resp.json()["calendar_url"])
        self.assertIn("max_weeks", resp.json())
        self.assertIn("time_slots", resp.json())
        self.assertIn("day_time_slots", resp.json())
        self.assertIn("bookable_days", resp.json())
        self.assertIn("calendar_description", resp.json())
        self.assertIn("calendar_location", resp.json())
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()

    async def test_get_me_authenticated(self):
        mock_logged_in_user(app)
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("mock-user", resp.json()["username"])
        self.assertEqual("mock-user@example.com", resp.json()["email"])
        self.assertEqual("mock-user", resp.json()["calendar_slug"])
        self.assertTrue(resp.json()["calendar_created"])
        self.assertIn("max_weeks", resp.json())
        self.assertIn("time_slots", resp.json())
        self.assertIn("day_time_slots", resp.json())
        self.assertIn("bookable_days", resp.json())
        self.assertEqual(
            "Bring any documents you need reviewed.",
            resp.json()["calendar_description"],
        )
        self.assertEqual("Helsinki office", resp.json()["calendar_location"])

    async def test_logout_success(self):
        mock_logged_in_user(app)
        resp = await self.client.post("/api/logout")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertNotIn("access-token", resp.cookies)
        self.assertEqual("Logged out successfully", resp.json()["message"])

    async def test_delete_account_success(self):
        mock_user_result = MagicMock()
        mock_user = MagicMock()
        mock_user.username = "mock-user"
        mock_user.calendar_slug = "mock-user"
        mock_user_result.scalars.return_value.first.return_value = mock_user

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db
        mock_logged_in_user(app)

        resp = await self.client.delete("/api/auth/account")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("Account deleted successfully", resp.json()["message"])
        mock_db.delete.assert_awaited_once_with(mock_user)
        mock_db.commit.assert_awaited_once()

    async def test_delete_account_not_found(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db
        mock_logged_in_user(app)

        resp = await self.client.delete("/api/auth/account")
        self.assertEqual(hs.NOT_FOUND, resp.status_code)
        self.assertEqual("User not found", resp.json()["detail"])

    async def test_get_me_unauthenticated(self):
        self.client.cookies.delete("access-token")
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)
        self.assertIn("Invalid credentials", resp.json()["detail"])

    
    async def test_admin_login_with_remember_me(self):
        app.dependency_overrides[authenticate_user] = lambda: User(
            username="testuser",
            email="testuser@example.com",
            fullname="Test User",
            calendar_slug="testuser",
        )

        resp = await self.client.post(
            "/api/auth/login",
            data={
                "username": "testuser",
                "password": "testpass",
                "remember_me": "true",
            },
        )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertIn("access-token", resp.cookies)
        self.assertEqual("testuser", resp.json()["calendar_slug"])

        set_cookie_headers = resp.headers.get_list("set-cookie")
        self.assertTrue(any("Max-Age=2592000" in header for header in set_cookie_headers))

