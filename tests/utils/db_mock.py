from unittest.mock import AsyncMock
from src.common.db import get_db


async def override_get_db_async():
    """Yields a mocked asynchronous SQLAlchemy session."""
    # Create an AsyncMock to simulate the AsyncSession
    mock_async_session = AsyncMock()

    # Optional: You can configure the mock here if needed.
    # For example, mocking the execute method:
    # mock_async_session.execute.return_value = some_mock_result

    try:
        yield mock_async_session
    finally:
        # Simulate closing the session
        await mock_async_session.close()


def mock_get_db(app):
    """Applies the asynchronous dependency override to the FastAPI app."""
    app.dependency_overrides[get_db] = override_get_db_async
