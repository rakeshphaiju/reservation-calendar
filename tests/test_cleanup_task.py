import unittest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from tests.utils.base import BaseApiTest
from src.tasks.scripts.cleanup_past_reservations import cleanup_past_reservations


def make_reservation(id, day, time):
    r = MagicMock()
    r.id = id
    r.day = day
    r.time = time
    return r


def make_session(reservations: list):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = reservations

    mock_delete_result = MagicMock()
    mock_delete_result.rowcount = len(reservations)

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[mock_result, mock_delete_result])
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    return mock_session


class TestCleanupPastReservations(BaseApiTest):
    @patch("src.tasks.scripts.cleanup_past_reservations.datetime")
    @patch("src.tasks.scripts.cleanup_past_reservations.AsyncSessionLocal")
    async def test_deletes_past_reservations(self, mock_db, mock_dt):
        mock_dt.now.return_value = datetime(2026, 4, 1, 12, 0)
        mock_dt.strptime.side_effect = datetime.strptime
        mock_db.return_value = make_session(
            [
                make_reservation(1, "2026-02-01", "10:00-11:00"),
                make_reservation(2, "2026-02-15", "14:00-15:00"),
            ]
        )

        await cleanup_past_reservations()

        mock_db.return_value.execute.assert_awaited()
        mock_db.return_value.commit.assert_awaited_once()

    @patch("src.tasks.scripts.cleanup_past_reservations.datetime")
    @patch("src.tasks.scripts.cleanup_past_reservations.AsyncSessionLocal")
    async def test_skips_when_no_past_reservations(self, mock_db, mock_dt):
        mock_dt.now.return_value = datetime(2026, 4, 1, 12, 0)
        mock_dt.strptime.side_effect = datetime.strptime

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            make_reservation(1, "2026-03-25", "10:00-11:00"),
        ]
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=mock_result)
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_db.return_value = mock_session

        await cleanup_past_reservations()

        mock_session.commit.assert_not_awaited()

    @patch("src.tasks.scripts.cleanup_past_reservations.datetime")
    @patch("src.tasks.scripts.cleanup_past_reservations.AsyncSessionLocal")
    async def test_handles_empty_reservations_table(self, mock_db, mock_dt):
        mock_dt.now.return_value = datetime(2026, 4, 1, 12, 0)
        mock_dt.strptime.side_effect = datetime.strptime
        mock_db.return_value = make_session([])

        await cleanup_past_reservations()

        mock_db.return_value.commit.assert_not_awaited()

    @patch("src.tasks.scripts.cleanup_past_reservations.datetime")
    @patch("src.tasks.scripts.cleanup_past_reservations.AsyncSessionLocal")
    async def test_invalid_date_format_is_deleted(self, mock_db, mock_dt):
        mock_dt.now.return_value = datetime(2026, 4, 1, 12, 0)
        mock_dt.strptime.side_effect = datetime.strptime
        mock_db.return_value = make_session(
            [
                make_reservation(99, "not-a-date", "??:??"),
            ]
        )

        await cleanup_past_reservations()

        mock_db.return_value.commit.assert_awaited_once()

    @patch("src.tasks.scripts.cleanup_past_reservations.datetime")
    @patch("src.tasks.scripts.cleanup_past_reservations.AsyncSessionLocal")
    async def test_mixed_reservations(self, mock_db, mock_dt):
        mock_dt.now.return_value = datetime(2026, 4, 1, 12, 0)
        mock_dt.strptime.side_effect = datetime.strptime
        mock_db.return_value = make_session(
            [
                make_reservation(1, "2026-02-01", "10:00-11:00"),
                make_reservation(2, "2026-03-25", "10:00-11:00"),
                make_reservation(3, "bad-date", "??:??"),
            ]
        )

        await cleanup_past_reservations()

        mock_db.return_value.commit.assert_awaited_once()
