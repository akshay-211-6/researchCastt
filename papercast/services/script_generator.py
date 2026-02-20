"""
services/script_generator.py - Minimal version using Claude via OpenRouter
"""
from __future__ import annotations

import json
import logging
from typing import Any

import httpx
from google import genai
from google.genai import types

from config import get_settings
from models.schemas import (
    Chapter, DialogueLine, ParsedDocument,
    PodcastScript, QuizQuestion,
)

logger   = logging.getLogger(__name__)
settings = get_settings()

if not settings.google_api_key:
    logger.warning("No GOOGLE_API_KEY configured.")
    
# Initialize Gemini client
client = genai.Client(api_key=settings.google_api_key) if settings.google_api_key else None
MODEL = "gemini-2.5-flash"


def _call_llm(prompt: str) -> str:
    """Dispatch to Gemini LLM provider.
    
    Raises a `RuntimeError` if the key is not configured or if the request
    returns an error.
    """
    if not settings.google_api_key or not client:
        raise RuntimeError("No LLM API key configured; set GOOGLE_API_KEY.")
        
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.7,
                response_mime_type="application/json",
            ),
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise RuntimeError(f"Gemini generation failed: {str(e)}")


async def generate_script(doc: ParsedDocument) -> PodcastScript:
    """Generate a podcast script from a parsed document."""
    # fail fast if configuration is incorrect; require *some* LLM key
    if not settings.google_api_key:
        raise RuntimeError("No LLM API key configured; set GOOGLE_API_KEY.")

    logger.info(f"[{doc.job_id}] Starting script generation with LLM")
    
    # We deliberately avoid catching and hiding exceptions inside the helper
    # methods below.  If any call to the LLM fails (API key invalid, quota
    # exhausted, network error, etc.) we want the entire generation to error so
    # that the job is marked as failed instead of producing a 30‑second dump of
    # fallback lines.  The outer try/except logs the error and re-raises so the
    # pipeline can catch it.
    #
    # This makes debugging easier: you’ll now see a stack trace and the real
    # HTTP error code (e.g. 402 Payment Required) instead of a misleading "audio
    # is short" symptom.
    logger.info(f"[{doc.job_id}] Step 1: Generating structure...")
    chapters = _generate_chapters(doc)

    logger.info(f"[{doc.job_id}] Step 2: Generating dialogue...")
    all_lines = _generate_dialogue(doc, chapters)

    logger.info(f"[{doc.job_id}] Step 3: Generating study guide...")
    guide, quiz = _generate_study_materials(doc)

    total_words = sum(len(l.text.split()) for l in all_lines)
    total_secs = int(total_words / 2.5)

    result = PodcastScript(
        job_id=doc.job_id,
        paper_title=doc.metadata.get("title", doc.filename),
        paper_authors=doc.metadata.get("authors", "Unknown"),
        total_estimated_duration_sec=total_secs,
        chapters=[
            Chapter(
                id=i+1,
                title=f"Chapter {i+1}",
                estimated_duration_sec=300,
                line_start=i*5,
                line_end=(i+1)*5,
            )
            for i in range(min(3, len(chapters)))
        ],
        dialogue=all_lines,
        study_guide=guide,
        quiz_questions=quiz,
    )

    logger.info(f"[{doc.job_id}] ✓ Script generation complete")
    return result


def _generate_chapters(doc: ParsedDocument) -> list[dict]:
    """Generate chapter structure."""
    sections = "\n".join(f"- {s.title}" for s in doc.sections[:10])
    
    prompt = f"""Create 3-4 podcast chapters for this paper.

Title: {doc.metadata.get('title', 'Unknown')}
Sections: {sections}

For each chapter, provide:
- Title (short, catchy)
- Hook (opening line)
- Key concepts

Return JSON:
{{"chapters": [{{"title": "...", "hook": "...", "concepts": ["..."]}}]}}"""
    
    # We don't catch generic exceptions here anymore; if the LLM call fails
    # the error will bubble up to generate_script and ultimately mark the job as
    # errored.  This avoids producing misleading placeholder dialogue later on.
    response = _call_llm(prompt)
    data = json.loads(response)
    return data.get("chapters", [])


def _generate_dialogue(doc: ParsedDocument, chapters: list) -> list[DialogueLine]:
    """Generate podcast dialogue."""
    all_lines = []
    
    for i, chapter in enumerate(chapters[:3]):
        prompt = f"""Write 8-10 lines of podcast dialogue between Host A (curious) and Host B (expert).

Topic: {chapter.get('title', 'Topic')}
Hook: {chapter.get('hook', 'Start the discussion')}
Concepts: {', '.join(chapter.get('concepts', []))}

Return JSON array:
[{{"host": "A", "text": "..."}}, {{"host": "B", "text": "..."}}]"""
        
        response = _call_llm(prompt)
        lines = json.loads(response)

        for line in lines:
            all_lines.append(DialogueLine(
                host=line.get("host", "A").upper(),
                text=line.get("text", ""),
                chapter_id=i+1,
            ))
    
    return all_lines


def _generate_study_materials(doc: ParsedDocument) -> tuple[str, list[QuizQuestion]]:
    """Generate study guide and quiz."""
    text_sample = doc.raw_text[:3000]
    
    prompt = f"""Create a study guide and 3 quiz questions about this research.

Paper: {doc.metadata.get('title', 'Unknown')}
Text: {text_sample}

Return JSON:
{{
  "study_guide": "## Key Points\\n...",
  "quiz": [
    {{"question": "...", "options": ["A.", "B.", "C.", "D."], "correct_index": 0, "explanation": "..."}}
  ]
}}"""
    
    response = _call_llm(prompt)
    data = json.loads(response)

    guide = data.get("study_guide", "Key points from the paper.")
    questions = []

    for q in data.get("quiz", []):
        questions.append(QuizQuestion(
            question=q.get("question", "Question?"),
            options=q.get("options", ["A", "B", "C", "D"]),
            correct_index=q.get("correct_index", 0),
            explanation=q.get("explanation", ""),
        ))

    return guide, questions
