import unittest
from httpx import AsyncClient, ASGITransport
from src.main import app
from tests.utils.db_mock import mock_get_db
from tests.utils.auth_mock import mock_logged_in_user


class BaseApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        mock_get_db(app)
        self.client = AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        )
        mock_logged_in_user(app)

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()
