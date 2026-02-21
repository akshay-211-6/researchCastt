"""
main.py — FastAPI application entrypoint for Paper to Podcast.
"""
from __future__ import annotations

import logging
import sys
import os
from contextlib import asynccontextmanager

if sys.platform == "win32":
    # Force UTF-8 encoding for standard streams on Windows to prevent 'charmap' errors
    import io
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import generate, ingest, podcast
from services.auth_service import get_current_user
from fastapi import Depends
import firebase_admin
from firebase_admin import credentials

# ── Logging Setup ──────────────────────────────────────────────────────────
logging.basicConfig(
    level  = logging.INFO,
    format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    stream = sys.stdout,
)
logger = logging.getLogger(__name__)

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
    logger.info("🎬 static-ffmpeg paths added to environment")
except Exception as e:
    logger.warning(f"⚠️ Failed to add static-ffmpeg paths: {e}")

# ── Lifespan Management ─────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    
    # Initialize Firebase Admin
    try:
        firebase_admin.initialize_app()
        logger.info("🔥 Firebase Admin initialized")
    except Exception as e:
        logger.warning(f"⚠️ Firebase Admin initialization failed: {e}")

    # Auto-create necessary folders for the Gemini processing pipeline
    for directory in [settings.upload_dir, settings.output_dir, settings.audio_assets_dir]:
        os.makedirs(directory, exist_ok=True)
        
    logger.info("🚀 Paper to Podcast API starting up (Gemini Mode)")
    yield
    logger.info("👋 Paper to Podcast API shutting down")

# ── App Initialization ──────────────────────────────────────────────────────
app = FastAPI(
    title       = "Paper to Podcast API",
    version     = "1.0.0",
    lifespan    = lifespan,
)

# ── CORS Configuration (Crucial for Port 5173) ─────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.cors_origins_list,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────
# main.py adds /api globally. Router files should only have /ingest, /generate, etc.
app.include_router(ingest.router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(generate.router, prefix="/api", dependencies=[Depends(get_current_user)])
app.include_router(podcast.router, prefix="/api", dependencies=[Depends(get_current_user)])

@app.get("/health")
async def health():
    return {"status": "ok", "engine": "gemini-2.0-flash"}

@app.get("/")
async def root():
    return {"message": "API is running", "docs": "/docs"}