import unittest
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport
from src.main import app
from src.common.db import get_db
from tests.utils.db_mock import mock_get_db


class TestDeliveryOrderPriceService(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        mock_get_db(app)
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url="http://test")

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()

    async def test_health_check(self):
        resp = await self.client.get("/api/health")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(resp.json(), {"status": "ok"})
