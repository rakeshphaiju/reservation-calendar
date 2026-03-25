import unittest
import json
from http import HTTPStatus as hs
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock

from src.main import app
from src.models.reservation import Reservation
from src.models.user import AppUser
from src.common.db import get_db
from tests.utils.db_mock import mock_get_db
from tests.utils.auth_mock import mock_logged_in_user


mock_reservations = [
    Reservation(
        id="3fe6fd7c-1c87-11f1-941d-325096b39f47",
        owner_slug="mock-user",
        name="John Doe",
        email="john@example.com",
        address="123 Main St",
        phone_number="123456789",
        day="2026-03-20",
        time="16:00-16:30",
        reservation_key="reservation-key-1",
    ),
    Reservation(
        id="f6eb947c-a5b5-43b0-8baa-0731a75fa6e5",
        owner_slug="mock-user",
        name="Jane Doe",
        email="jane@example.com",
        address="456 Side St",
        phone_number="987654321",
        day="2026-03-21",
        time="11:00-11:00",
        reservation_key="reservation-key-2",
    ),
]

RESERVATION_PAYLOAD = {
    "name": "John Cena",
    "email": "john@cena.com",
    "address": "123 Main St",
    "phone_number": "1234467892",
    "day": "2026-03-20",
    "time": "17:00-18:00",
}


class TestReservationsApi(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        mock_get_db(app)
        transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=transport, base_url="http://test")
        mock_logged_in_user(app)

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()

    async def test_health_check(self):
        resp = await self.client.get("/api/health")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(resp.json(), {"status": "ok"})

    async def test_get_all_reservations(self):
        mock_count_result = MagicMock()
        mock_count_result.scalar_one.return_value = len(mock_reservations)

        mock_data_result = MagicMock()
        mock_data_result.scalars.return_value.all.return_value = mock_reservations

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_count_result, mock_data_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/reservations?skip=0&limit=10")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(4, len(resp.json()))
        self.assertEqual(
            {
                "total_count": 2,
                "skip": 0,
                "limit": 10,
                "data": [
                    {
                        "id": "3fe6fd7c-1c87-11f1-941d-325096b39f47",
                        "owner_slug": "mock-user",
                        "reservation_key": "reservation-key-1",
                        "name": "John Doe",
                        "email": "john@example.com",
                        "address": "123 Main St",
                        "phone_number": "123456789",
                        "day": "2026-03-20",
                        "time": "16:00-16:30",
                    },
                    {
                        "id": "f6eb947c-a5b5-43b0-8baa-0731a75fa6e5",
                        "owner_slug": "mock-user",
                        "reservation_key": "reservation-key-2",
                        "name": "Jane Doe",
                        "email": "jane@example.com",
                        "address": "456 Side St",
                        "phone_number": "987654321",
                        "day": "2026-03-21",
                        "time": "11:00-11:00",
                    },
                ],
            },
            resp.json(),
        )

    async def test_get_all_reservations_unauthenticated(self):
        app.dependency_overrides.clear()
        self.client.cookies.delete("access-token")

        resp = await self.client.get("/api/reservations")
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)

    async def test_get_reservations_slots(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["16:00-16:30", "11:00-11:30"]),
            bookable_days=json.dumps(["Monday", "Tuesday"]),
        )

        mock_result = MagicMock()
        mock_result.all.return_value = [
            ("Monday", "16:00-16:30", 5),
            ("Tuesday", "11:00-11:30", 3),
        ]

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars/mock-user/reservations/slots")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("mock-user", resp.json()["owner_slug"])
        self.assertEqual(5, resp.json()["slot_capacity"])
        self.assertEqual(["16:00-16:30", "11:00-11:30"], resp.json()["time_slots"])
        self.assertEqual(["Monday", "Tuesday"], resp.json()["bookable_days"])
        self.assertEqual(
            [
                {"day": "Monday", "time": "16:00-16:30", "count": 5, "capacity": 5},
                {"day": "Tuesday", "time": "11:00-11:30", "count": 3, "capacity": 5},
            ],
            resp.json()["slots"],
        )

    async def test_get_slot_capacity(self):
        resp = await self.client.get("/api/dashboard/slot-capacity")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"slot_capacity": 5}, resp.json())

    async def test_update_slot_capacity(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            slot_capacity=8,
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
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
        )

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_user_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.put(
            "/api/dashboard/time-slots",
            json={"time_slots": ["09:00-10:00", "10:00-11:00"]},
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            {"time_slots": ["09:00-10:00", "10:00-11:00"]},
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
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
        )

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

    async def test_get_calendar_owners(self):
        mock_users_result = MagicMock()
        mock_users_result.scalars.return_value.all.return_value = [
            AppUser(
                username="alice",
                email="alice@example.com",
                password_hash="hash",
                calendar_slug="alice",
            ),
            AppUser(
                username="bob",
                email="bob@example.com",
                password_hash="hash",
                calendar_slug="bob",
            ),
        ]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_users_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            [
                {"username": "alice", "calendar_slug": "alice"},
                {"username": "bob", "calendar_slug": "bob"},
            ],
            resp.json(),
        )

    async def test_get_calendar_owners(self):
        mock_users_result = MagicMock()
        mock_users_result.scalars.return_value.all.return_value = [
            AppUser(
                username="alice",
                email="alice@example.com",
                password_hash="hash",
                calendar_slug="alice",
            ),
            AppUser(
                username="bob",
                email="bob@example.com",
                password_hash="hash",
                calendar_slug="bob",
            ),
        ]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_users_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/calendars")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual(
            [
                {"username": "alice", "calendar_slug": "alice"},
                {"username": "bob", "calendar_slug": "bob"},
            ],
            resp.json(),
        )

    async def test_delete_reservation_success(self):
        reservation = mock_reservations[0]
        reserve_id = reservation.id

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{reserve_id}")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"message": "Reservation deleted successfully"}, resp.json())

        mock_db.delete.assert_awaited_once_with(reservation)
        mock_db.commit.assert_awaited_once()

    async def test_delete_reservation_not_found(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(
            "/api/reservations/3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )
        self.assertEqual(hs.NOT_FOUND, resp.status_code)
        self.assertEqual("Reservation not found", resp.json()["detail"])

    async def test_delete_reservation_unauthenticated(self):
        app.dependency_overrides.clear()

        resp = await self.client.delete(
            "/api/reservations/3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )
        self.assertEqual(hs.UNAUTHORIZED, resp.status_code)

    async def test_delete_reservation_db_error(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_reservations[0]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result
        mock_db.delete.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete(f"/api/reservations/{mock_reservations[0].id}")
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual("Failed to delete reservation.", resp.json()["detail"])

        mock_db.rollback.assert_awaited_once()

    async def test_get_public_reservation_by_key_success(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = mock_reservations[0]

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/public/reservations/reservation-key-1")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("reservation-key-1", resp.json()["reservation_key"])
        self.assertEqual("John Doe", resp.json()["name"])

    async def test_get_public_reservation_by_key_not_found(self):
        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = None

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.get("/api/public/reservations/missing-key")
        self.assertEqual(hs.NOT_FOUND, resp.status_code)
        self.assertEqual("Reservation not found", resp.json()["detail"])

    async def test_update_public_reservation_by_key_success(self):
        reservation = mock_reservations[0]

        mock_reservation_result = MagicMock()
        mock_reservation_result.scalars.return_value.first.return_value = reservation

        mock_owner_result = MagicMock()
        mock_owner_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00", "18:00-19:00", "19:00-20:00"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 1

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_reservation_result,
            mock_owner_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        payload = {
            **RESERVATION_PAYLOAD,
            "name": "Updated Name",
            "time": "19:00-20:00",
        }

        resp = await self.client.put(
            "/api/public/reservations/reservation-key-1",
            json=payload,
        )
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("Updated Name", resp.json()["name"])
        self.assertEqual("19:00-20:00", resp.json()["time"])
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once_with(reservation)

    async def test_delete_public_reservation_by_key_success(self):
        reservation = mock_reservations[0]

        mock_result = MagicMock()
        mock_result.scalars.return_value.first.return_value = reservation

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_result

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.delete("/api/public/reservations/reservation-key-1")
        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual({"message": "Reservation deleted successfully"}, resp.json())
        mock_db.delete.assert_awaited_once_with(reservation)
        mock_db.commit.assert_awaited_once()

    async def test_add_reservation_success(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 0

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]
        mock_db.add = MagicMock()
        mock_db.refresh.side_effect = lambda obj: setattr(
            obj, "id", "3fe6fd7c-1c87-11f1-941d-325096b39f47"
        )

        app.dependency_overrides[get_db] = lambda: mock_db

        with (
            patch(
                "src.api.reservation_api.send_confirmation_email_task.delay"
            ) as mock_confirm,
            patch(
                "src.api.reservation_api.send_admin_notification_task.delay"
            ) as mock_admin,
        ):
            resp = await self.client.post(
                "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
            )

        self.assertEqual(hs.OK, resp.status_code)
        self.assertEqual("John Cena", resp.json()["name"])
        self.assertEqual("2026-03-20", resp.json()["day"])
        self.assertEqual("mock-user", resp.json()["owner_slug"])

        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()
        mock_db.refresh.assert_awaited_once()
        mock_confirm.assert_called_once()
        mock_admin.assert_called_once()
        self.assertEqual(
            "owner@example.com",
            mock_admin.call_args.kwargs["owner_email"],
        )
        self.assertTrue(mock_confirm.call_args.kwargs["reservation_key"])
        self.assertEqual(
            mock_confirm.call_args.kwargs["reservation_key"],
            mock_admin.call_args.kwargs["reservation_key"],
        )

    async def test_add_reservation_conflict(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 5

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
            mock_slot_reservations,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual("This time slot is fully booked", resp.json()["detail"])

        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_email_conflict(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00"]),
        )

        mock_existing_email = MagicMock()
        mock_existing_email.scalars.return_value.first.return_value = Reservation(
            id="existing-email-conflict",
            owner_slug="mock-user",
            **RESERVATION_PAYLOAD,
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing_email,
        ]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.CONFLICT, resp.status_code)
        self.assertEqual(
            "This user already has a reservation for this time slot",
            resp.json()["detail"],
        )

        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_awaited()

    async def test_add_reservation_db_error(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00"]),
        )

        mock_existing = MagicMock()
        mock_existing.scalars.return_value.first.return_value = None

        mock_lock_result = MagicMock()

        mock_slot_reservations = MagicMock()
        mock_slot_reservations.scalar_one.return_value = 0

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_db.execute.side_effect = [
            mock_user_result,
            mock_lock_result,
            mock_existing,
            mock_slot_reservations,
        ]
        mock_db.commit.side_effect = Exception("DB failure")

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.INTERNAL_SERVER_ERROR, resp.status_code)
        self.assertEqual(
            "An unexpected error occurred while saving the reservation.",
            resp.json()["detail"],
        )
        mock_db.rollback.assert_awaited_once()

    async def test_add_reservation_invalid_payload(self):
        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json={"name": "John"}
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)

    async def test_add_reservation_invalid_day_format(self):
        payload = {**RESERVATION_PAYLOAD, "day": "2026-02-30"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )

        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn(
            "Day must be a valid date in YYYY-MM-DD format", resp.json()["detail"]
        )

    async def test_add_reservation_invalid_time_range(self):
        payload = {**RESERVATION_PAYLOAD, "time": "25:00-26:00"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )

        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn("Time must use valid 24-hour values", resp.json()["detail"])

    async def test_add_reservation_rejects_time_that_does_not_end_after_it_starts(self):
        payload = {**RESERVATION_PAYLOAD, "time": "11:00-11:00"}

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=payload
        )

        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertIn("Time must end after it starts", resp.json()["detail"])

    async def test_add_reservation_rejects_unconfigured_time_slot(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["09:00-10:00"]),
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_lock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertEqual(
            "This time slot is not available for this calendar",
            resp.json()["detail"],
        )

    async def test_add_reservation_rejects_unconfigured_day(self):
        mock_user_result = MagicMock()
        mock_user_result.scalars.return_value.first.return_value = AppUser(
            username="mock-user",
            email="owner@example.com",
            password_hash="hash",
            calendar_slug="mock-user",
            time_slots=json.dumps(["17:00-18:00"]),
            bookable_days=json.dumps(["Monday", "Tuesday"]),
        )

        mock_lock_result = MagicMock()

        mock_db = AsyncMock()
        mock_db.execute.side_effect = [mock_user_result, mock_lock_result]

        app.dependency_overrides[get_db] = lambda: mock_db

        resp = await self.client.post(
            "/api/calendars/mock-user/reservations/add", json=RESERVATION_PAYLOAD
        )
        self.assertEqual(hs.BAD_REQUEST, resp.status_code)
        self.assertEqual(
            "This day is not available for this calendar",
            resp.json()["detail"],
        )
