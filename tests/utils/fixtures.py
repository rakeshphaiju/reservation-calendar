import json
from src.models.reservation import Reservation
from src.models.user import AppUser


def make_mock_reservations():
    return [
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


def make_mock_user(**kwargs):
    defaults = dict(
        username="mock-user",
        email="owner@example.com",
        fullname="Mock User",
        password_hash="hash",
        calendar_slug="mock-user",
        calendar_created=True,
        calendar_description=None,
        calendar_location=None,
    )
    return AppUser(**{**defaults, **kwargs})
