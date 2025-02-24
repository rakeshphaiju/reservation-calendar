import os
import uvicorn
from http import HTTPStatus as hs
from dotenv import load_dotenv

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.common.logger import logger
from src.api.reservation_api import router as reservation_api
from src.common.db import engine, Base

# Load environment variables from .env file
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown (if needed)
    await engine.dispose()


app = FastAPI(
    title="Reservation App",
    version=os.environ.get("VERSION", "local"),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservation_api)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_log_info = {"errors": exc.errors(), "body": exc.body}
    logger.error(
        'RequestValidationError on "{} {}": {}',
        request.method,
        request.url.path,
        error_log_info,
    )
    return JSONResponse(status_code=hs.BAD_REQUEST, content={"detail": str(exc)})


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == hs.INTERNAL_SERVER_ERROR:
        logger.opt(exception=exc.__cause__).critical(
            'Internal server error on "{} {}": {}',
            request.method,
            request.url.path,
            exc.detail,
        )
    else:
        logger.error(
            'Error on "{} {}": {} ({})',
            request.method,
            request.url.path,
            exc.status_code,
            exc.detail,
        )

    return await http_exception_handler(request, exc)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
