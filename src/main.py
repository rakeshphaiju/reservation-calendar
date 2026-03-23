import os
import uvicorn
from http import HTTPStatus as hs
from dotenv import load_dotenv
from sqlalchemy import text

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import JSONResponse, FileResponse, Response
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.common.logger import logger
from src.api.reservation_api import router as reservation_api
from src.api.auth_api import router as auth_api
from src.common.db import engine, Base


load_dotenv()


AUTO_CREATE_TABLES = os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true"


async def ensure_schema_columns():
    async with engine.begin() as conn:
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS email VARCHAR
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS slot_capacity INTEGER NOT NULL DEFAULT 5
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS time_slots TEXT NOT NULL DEFAULT '[]'
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS bookable_days TEXT NOT NULL DEFAULT '[]'
                """
            )
        )
        await conn.execute(
            text(
                """
                ALTER TABLE reservations
                ADD COLUMN IF NOT EXISTS reservation_key VARCHAR
                """
            )
        )
        await conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ix_reservations_reservation_key
                ON reservations (reservation_key)
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
            logger.info("DB tables ensured (AUTO_CREATE_TABLES=true).")
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
app.include_router(reservation_api)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


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
    logger.info("Start web app using uvicorn")
    uvicorn.run(app, host="0.0.0.0", port=8000)
