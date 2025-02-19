import os
import uvicorn

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware 
from dotenv import load_dotenv

from src.api.reservation_api import router as wolt_dopc_service_api
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
    title="Reservation App", version=os.environ.get("VERSION", "local"), lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wolt_dopc_service_api)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
  

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)