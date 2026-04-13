import os
import uvicorn
from http import HTTPStatus as hs
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import JSONResponse, FileResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.common.logger import logger
from src.api.reservations import (
    admin_reservations_api,
    calendars_api,
    dashboard_api,
    reservations_api,
)
from src.api.auth_api import router as auth_api
from src.common.db import engine, Base, get_db


load_dotenv()


AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true"


async def ensure_schema_columns():
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY,
                    username VARCHAR NOT NULL UNIQUE,
                    service_name VARCHAR,
                    email VARCHAR UNIQUE,
                    password_hash VARCHAR NOT NULL,
                    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_calendars (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    calendar_slug VARCHAR NOT NULL UNIQUE,
                    calendar_description TEXT,
                    calendar_location VARCHAR,
                    slot_capacity INTEGER NOT NULL DEFAULT 5,
                    max_weeks INTEGER NOT NULL DEFAULT 4,
                    time_slots TEXT NOT NULL DEFAULT '[]',
                    day_time_slots TEXT NOT NULL DEFAULT '{}',
                    bookable_days TEXT NOT NULL DEFAULT '[]',
                    calendar_created BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        await conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS reservations (
                    id UUID PRIMARY KEY,
                    owner_slug VARCHAR NOT NULL,
                    name VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    phone VARCHAR,
                    day VARCHAR NOT NULL,
                    time VARCHAR NOT NULL,
                    reservation_key VARCHAR NOT NULL UNIQUE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )

        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_reservations_owner_day_time
                ON reservations (owner_slug, day, time)
                """
            )
        )
        await conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_reservations_owner_day_time_email
                ON reservations (owner_slug, day, time, email)
                """
            )
        )

        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS service_name VARCHAR
                """
            )
        )
        await conn.execute(
            text(
                """
                UPDATE users
                SET service_name = fullname
                WHERE service_name IS NULL
                AND fullname IS NOT NULL
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                DROP COLUMN IF EXISTS fullname
                """
            )
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Avoid hard-failing app startup if DB is unavailable unless explicitly enabled.
    FastAPI lifespan uses an asynccontextmanager + yield pattern. [web:275]
    """
    if AUTO_CREATE_TABLES:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            logger.exception("DB init failed during startup: %s", e)

    try:
        await ensure_schema_columns()
    except Exception as e:
        logger.exception("Failed to ensure database schema columns: %s", e)

    yield

    try:
        await engine.dispose()
    except Exception:
        pass


app = FastAPI(
    title="Reservation App",
    version=os.environ.get("VERSION", "local"),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_api)
app.include_router(calendars_api.router)
app.include_router(reservations_api.router)
app.include_router(admin_reservations_api.router)
app.include_router(dashboard_api.router)


@app.get("/api/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    checks = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.error("Health check DB failure: %s", e)
        checks["database"] = "unavailable"

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"

    return {
        "status": overall,
        "checks": checks,
    }


@app.head("/")
def read_root_head():
    return Response()


this_path = os.path.dirname(os.path.abspath(__file__))

root_dir = os.path.abspath(os.path.join(this_path, ".."))
frontend_dir = os.path.join(root_dir, "frontend", "dist")
index_path = os.path.join(frontend_dir, "index.html")

# Serve static assets (JS, CSS, images, etc.)
if os.path.exists(frontend_dir):
    app.mount(
        "/",
        StaticFiles(directory=frontend_dir, html=True, check_dir=False),
        name="frontend",
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_log_info = {"errors": exc.errors(), "body": exc.body}
    logger.error(
        f'RequestValidationError on "%s %s": %s',
        request.method,
        request.url.path,
        error_log_info,
    )
    return JSONResponse(status_code=hs.BAD_REQUEST, content={"detail": str(exc)})


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    # SPA fallback: for 404 on GET to non-API paths, serve index.html so client-side routing works
    if (
        exc.status_code == 404
        and request.method == "GET"
        and not request.url.path.startswith("/api")
        and os.path.exists(index_path)
    ):
        return FileResponse(index_path, media_type="text/html")
    logger.error(
        'Error on "%s %s": %s (%s)',
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return await http_exception_handler(request, exc)


if os.path.exists(index_path):
    # Serve React App
    @app.get("/{catchall:path}")
    def read_index():
        # otherwise return index files
        return FileResponse(index_path)

else:
    logger.info(
        "React build not found, not serving React app. This should only happen for a backend build."
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
