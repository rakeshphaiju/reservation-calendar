from tests.utils.base import BaseApiTest
from http import HTTPStatus as hs


class TestHealthApi(BaseApiTest):
    async def test_health_check(self):
        resp = await self.client.get("/api/health")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"status": "ok"}, resp.json())
