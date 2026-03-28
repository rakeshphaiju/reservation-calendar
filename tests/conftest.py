import os

# Set the environment variable before any application code is imported
os.environ["DATABASE_URL"] = "postgresql+asyncpg://dummy:dummy@localhost:5432/dummy_db"

# You can also add your db mocking fixtures here if you want them globally available
