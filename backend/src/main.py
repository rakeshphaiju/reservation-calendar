import os
import uvicorn

from fastapi import FastAPI, Depends
from dotenv import load_dotenv

from src.api.reservation_api import router as wolt_dopc_service_api
from src.common.db import create_tables

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="Wolt Delivery Order Price", version=os.environ.get("VERSION", "local")
)

app.include_router(wolt_dopc_service_api)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
  

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)