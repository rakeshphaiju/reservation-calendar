import unittest
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

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
            email="testuser@example.com",
            service_name="Test User",
            is_verified=True,
            calendar_slug="testuser",
        )
        resp = await self.client.post(
            "/api/auth/login",
            data={"username": "testuser@example.com", "password": "testpass"},
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

    @patch("src.api.auth_api.send_verification_email")
    @patch("src.api.auth_api.set_resend_lock", new_callable=AsyncMock)
    @patch("src.api.auth_api.create_and_store_otp", new_callable=AsyncMock)
    @patch("src.api.auth_api.generate_unique_calendar_slug", new_callable=AsyncMock)
    async def test_register_user(
        self,
        mock_generate_unique_calendar_slug,
        mock_create_and_store_otp,
        mock_set_resend_lock,
        mock_send_verification_email,
    ):
        existing_email_result = MagicMock()
        existing_email_result.scalars.return_value.first.return_value = None

        existing_service_name_result = MagicMock()
        existing_service_name_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [
            existing_email_result,
            existing_service_name_result,
        ]

        async def override_get_db():
            return mock_db

        app.dependency_overrides[get_db] = override_get_db

        mock_generate_unique_calendar_slug.return_value = "new-user"
        mock_create_and_store_otp.return_value = "123456"

        resp = await self.client.post(
            "/api/auth/register",
            json={
                "email": "new-user@example.com",
                "service_name": "New User",
                "password": "strongpass123",
            },
        )
        self.assertEqual(hs.OK, resp.status_code)
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
        mock_generate_unique_calendar_slug.assert_awaited_once()
        mock_create_and_store_otp.assert_awaited_once_with("new-user@example.com")
        mock_set_resend_lock.assert_awaited_once_with("new-user@example.com")
        mock_send_verification_email.assert_called_once()

        app.dependency_overrides.clear()

    async def test_register_user_rejects_duplicate_service_name(self):
        existing_email_result = MagicMock()
        existing_email_result.scalars.return_value.first.return_value = None

        existing_service_name_result = MagicMock()
        existing_service_name_result.scalars.return_value.first.return_value = (
            MagicMock()
        )

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [
            existing_email_result,
            existing_service_name_result,
        ]

        async def override_get_db():
            return mock_db

        app.dependency_overrides[get_db] = override_get_db

        resp = await self.client.post(
            "/api/auth/register",
            json={
                "email": "new-user@example.com",
                "service_name": "Existing Service",
                "password": "strongpass123",
            },
        )

        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual("Service name already exists", resp.json()["detail"])
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

        app.dependency_overrides.clear()

    async def test_get_me_authenticated(self):
        mock_logged_in_user(app)
        resp = await self.client.get("/api/auth/me")
        self.assertEqual(hs.OK, resp.status_code)
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
        mock_user.email = "mock-user@example.com"
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
            email="testuser@example.com",
            service_name="Test User",
            is_verified=True,
            calendar_slug="testuser",
        )

        resp = await self.client.post(
            "/api/auth/login",
            data={
                "username": "testuser@example.com",
                "password": "testpass",
                "remember_me": "true",
            },
        )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertIn("access-token", resp.cookies)
        self.assertEqual("testuser", resp.json()["calendar_slug"])

        set_cookie_headers = resp.headers.get_list("set-cookie")
        self.assertTrue(
            any("Max-Age=2592000" in header for header in set_cookie_headers)
        )
