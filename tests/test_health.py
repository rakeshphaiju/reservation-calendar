import unittest
from unittest.mock import AsyncMock, patch
from http import HTTPStatus as hs

from tests.utils.base import BaseApiTest


class TestHealthApi(BaseApiTest):
    async def test_health_check_ok(self):
        resp = await self.client.get("/api/health")
        self.assertEqual(hs.OK, resp.status_code)
        body = resp.json()
        self.assertEqual("ok", body["status"])
        self.assertEqual("ok", body["checks"]["database"])
