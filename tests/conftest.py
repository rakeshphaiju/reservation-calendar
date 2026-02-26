import os
import pytest
from unittest.mock import MagicMock
import fastapi_mail


# Set the environment variable before any application code is imported
os.environ["DATABASE_URL"] = "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy_db"

# You can also add your db mocking fixtures here if you want them globally available

fastapi_mail.ConnectionConfig = MagicMock(return_value=MagicMock())
fastapi_mail.FastMail = MagicMock(return_value=MagicMock())
