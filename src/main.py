import os
import uvicorn
from http import HTTPStatus as hs
from dotenv import load_dotenv

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

from src.api.chatbot_api import router as chatbot_api
from src.common.db import engine, Base

# Load environment variables from .env file
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize chatbot service (optional)
    # You can add chatbot initialization logic here if needed
    logger.info("Chatbot service initialized")
    
    yield
    
    # Cleanup on shutdown (if needed)
    await engine.dispose()


app = FastAPI(
    title="Restaurant Reservation System with AI Chatbot",
    description="A restaurant reservation system with AI-powered chatbot assistant",
    version=os.environ.get("VERSION", "1.0.0"),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your existing reservation API router
app.include_router(reservation_api)
# Include the new chatbot API router
app.include_router(chatbot_api)

this_path = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(this_path, ".."))
frontend_dir = os.path.join(root_dir, "frontend", "dist")
index_path = os.path.join(frontend_dir, "index.html")

# Serve static assets (JS, CSS, images, etc.)
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True, check_dir=False), name="frontend")


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
    logger.error(
        'Error on "%s %s": %s (%s)',
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return await http_exception_handler(request, exc)


@app.head("/")
def read_root_head():
    return Response()


@app.get("/")
async def root():
    return {
        "message": "Restaurant Reservation System with AI Chatbot",
        "version": app.version,
        "endpoints": {
            "reservations": "/api/reserve",
            "chatbot": "/api/chatbot/chat",
            "availability": "/api/chatbot/availability",
            "health": "/api/health",
            "docs": "/docs"
        }
    }


# Add this endpoint after your existing routes
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    import asyncio
    
    # Check database connection
    db_status = "healthy"
    try:
        async with engine.begin() as conn:
            await conn.execute("SELECT 1")
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Check Perplexity API key (if configured)
    perplexity_status = "not_configured"
    if os.getenv("PERPLEXITY_API_KEY"):
        if os.getenv("PERPLEXITY_API_KEY").startswith("pplx-"):
            perplexity_status = "configured"
        else:
            perplexity_status = "invalid_format"
    
    return {
        "status": "ok",
        "timestamp": asyncio.get_event_loop().time(),
        "services": {
            "database": db_status,
            "perplexity_api": perplexity_status,
            "chatbot": "active" if perplexity_status == "configured" else "inactive"
        }
    }

if os.path.exists(index_path):
    # Serve React App
    @app.get("/{catchall:path}")
    def read_index():
        # otherwise return index files
        return FileResponse(index_path)
else:
    logger.info("React build not found, not serving React app. This should only happen for a backend build.")


if __name__ == "__main__":
    logger.info("Starting Restaurant Reservation System with AI Chatbot")
    logger.info(f"Version: {app.version}")
    
    # Check for required environment variables
    required_env_vars = ["DATABASE_URL"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")
        logger.warning("Some features may not work correctly")
    
    # Check if Perplexity API key is configured
    if not os.getenv("PERPLEXITY_API_KEY"):
        logger.warning("PERPLEXITY_API_KEY not configured. Chatbot features will be limited.")
    else:
        logger.info("Perplexity API key configured. Chatbot is active.")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)