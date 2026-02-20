"""
routers/generate.py — Pipeline management for script and audio generation.
"""
from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from config import Settings, get_settings
from models.schemas import (
    JobStatus, JobStatusResponse, PodcastAudio,
    PodcastScript,
)
from services.audio_mixer import mix_podcast
from services.script_generator import generate_script
from services.tts_service import synthesise_script

logger = logging.getLogger(__name__)

# FIXED: Removed prefix="/api" to prevent /api/api/generate errors
router = APIRouter(tags=["generate"])

# In-memory job state
_JOB_STORE: dict[str, JobStatusResponse] = {}

@router.post("/generate/{job_id}", response_model=JobStatusResponse)
async def start_generation(
    job_id:     str,
    background: BackgroundTasks,
    settings:   Settings = Depends(get_settings),
) -> JobStatusResponse:
    # Verify the job exists
    pdf_path  = settings.upload_dir / f"{job_id}.pdf"
    meta_path = settings.upload_dir / f"{job_id}.meta.json"

    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Upload a PDF first.")

    if job_id in _JOB_STORE and _JOB_STORE[job_id].status not in (JobStatus.ERROR,):
        return _JOB_STORE[job_id]

    meta       = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    voice_pair = meta.get("voice_pair", "FM")

    job = JobStatusResponse(
        job_id       = job_id,
        status       = JobStatus.PENDING,
        progress_pct = 0,
        message      = "Generation queued...",
    )
    _JOB_STORE[job_id] = job

    background.add_task(_run_pipeline, job_id, pdf_path, voice_pair, settings)
    return job

@router.get("/generate/{job_id}/status", response_model=JobStatusResponse)
async def get_status(job_id: str) -> JobStatusResponse:
    if job_id not in _JOB_STORE:
        raise HTTPException(status_code=404, detail="Job not found.")
    return _JOB_STORE[job_id]

async def _run_pipeline(
    job_id:     str,
    pdf_path:   Path,
    voice_pair: str,
    settings:   Settings,
) -> None:
    def update(status: JobStatus, pct: int, msg: str):
        if job_id in _JOB_STORE:
            _JOB_STORE[job_id].status       = status
            _JOB_STORE[job_id].progress_pct = pct
            _JOB_STORE[job_id].message      = msg

    try:
        # 1. Load Parsed Document
        update(JobStatus.PARSING, 5, "Loading document...")
        from services.pdf_parser import parse_pdf
        doc = parse_pdf(pdf_path, job_id=job_id)
        # require some LLM key before generating the script
        if not settings.google_api_key:
            raise RuntimeError("No LLM API key configured; set GOOGLE_API_KEY.")



       # ── Stage 2: Script generation ────────────────────────────────────────
# ── Stage 2: Script generation ────────────────────────────────────────
        update(JobStatus.SCRIPTING, 20, "Generating script with Gemini...")
        # We pass the full doc object back in!
        script_model = await generate_script(doc)

        # 3. Convert to raw dialogue string (Handles both Object and String returns)
        if hasattr(script_model, "dialogue"):
            dialogue_lines = []
            for line in script_model.dialogue:
                host = getattr(line, "host", None) or (line.get("host") if isinstance(line, dict) else None)
                text = getattr(line, "text", None) or (line.get("text") if isinstance(line, dict) else None)
                if host and text:
                    dialogue_lines.append(f"Host {host}: {text}")
            script_text = "\n".join(dialogue_lines)
        else:
            # If Gemini returned a raw string, use it directly!
            script_text = str(script_model)
            
        update(JobStatus.SCRIPTING, 50, "Script generated.")
        # 3. TTS Synthesis (ElevenLabs)
        update(JobStatus.SYNTHESISING, 55, "Synthesising voices...")
        synthesised = await synthesise_script(script_text, voice_pair=voice_pair)
        update(JobStatus.SYNTHESISING, 80, "Synthesis complete.")

        # 4. Mixing
        update(JobStatus.MIXING, 82, "Mixing final audio...")
        audio_path, vtt_path, ts_chapters = mix_podcast(script_text, synthesised, job_id=job_id)
        
        # 5. Result
        duration_sec = sum(ch.end_sec - ch.start_sec for ch in ts_chapters)
        result = PodcastAudio(
            job_id       = job_id,
            audio_url    = f"/api/podcast/{job_id}/audio",
            vtt_url      = f"/api/podcast/{job_id}/captions",
            duration_sec = round(duration_sec, 2),
            chapters     = ts_chapters,
        )

        _JOB_STORE[job_id].result = result
        update(JobStatus.DONE, 100, "Podcast ready! 🎙️")

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)
        update(JobStatus.ERROR, 0, f"Error: {str(e)}")