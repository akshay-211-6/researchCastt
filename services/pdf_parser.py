"""
services/pdf_parser.py
─────────────────────
Deep PDF extraction using two complementary libraries:

  • PyMuPDF (fitz)   — fast text extraction, block-level layout, metadata
  • pdfplumber       — superior table detection and structured data recovery
  • heuristics       — equation detection via Unicode math symbols + patterns

Pipeline:
  1. Extract metadata (title, authors, doi)
  2. Segment document into logical sections (headings → next heading)
  3. Detect and extract tables per page via pdfplumber
  4. Flag pages with mathematical equations
  5. Return a clean ParsedDocument ready for the script generator
"""
from __future__ import annotations

import re
import uuid
import logging
from pathlib import Path
from typing import Optional

import fitz           # PyMuPDF
import pdfplumber

from models.schemas import ParsedDocument, ParsedSection

logger = logging.getLogger(__name__)

# ── Regex helpers ─────────────────────────────────────────────────────────────

# Common academic section headings
HEADING_RE = re.compile(
    r"^(\d+\.?\s+)?("
    r"abstract|introduction|background|related work|literature review|"
    r"methodology|methods?|experimental setup|experiments?|results?|"
    r"evaluation|discussion|conclusion|future work|references|appendix|"
    r"acknowledgements?"
    r")(\s*\d*\.?\d*)?$",
    re.IGNORECASE,
)

# Bold/large text that likely represents a section title
CUSTOM_HEADING_RE = re.compile(r"^[A-Z][A-Za-z\s\-:]{3,60}$")

# Math equation indicators
EQUATION_CHARS = set("∑∫∂∇≈≠≤≥αβγδεζηθλμνξπρστφψωΩΓΔΘΛΞΠΣΦΨ∈∉⊂⊃∀∃")
EQUATION_RE    = re.compile(r"[=\+\-\*/\^]{1}.*[=\+\-\*/\^]|\\[a-z]+\{")  # LaTeX or inline math


# ── Public API ────────────────────────────────────────────────────────────────

def parse_pdf(file_path: Path, job_id: Optional[str] = None) -> ParsedDocument:
    """
    Main entry point. Performs a single-pass scan of the PDF for maximum speed.
    """
    job_id = job_id or str(uuid.uuid4())
    logger.info(f"[{job_id}] Starting optimized PDF parse: {file_path.name}")

    doc = fitz.open(str(file_path))
    
    # Initialize collectors
    blocks      = []
    table_pages = set()
    eq_pages    = set()
    doi         = None
    
    # Metadata extraction
    meta  = doc.metadata or {}
    title = meta.get("title") or _guess_title_from_filename(file_path.name)
    year  = _extract_year(meta.get("creationDate", ""))

    try:
        for pg_idx, page in enumerate(doc):
            p_num = pg_idx + 1
            
            # 1. Text extraction ("dict" for formatting info)
            page_dict = page.get_text("dict")
            full_text = page.get_text() # for DOI and equations
            
            # 2. Block extraction
            for block in page_dict.get("blocks", []):
                if block.get("type") != 0: continue
                lines_text = []
                max_size   = 0.0
                is_bold    = False
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        txt = span.get("text", "").strip()
                        if txt:
                            lines_text.append(txt)
                            sz = span.get("size", 10)
                            if sz > max_size: max_size = sz
                            if span.get("flags", 0) & 2**4: is_bold = True
                
                text = " ".join(lines_text).strip()
                if text:
                    blocks.append({
                        "page": p_num, "text": text, 
                        "font_size": max_size, "is_bold": is_bold
                    })

            # 3. Table detection
            try:
                if page.find_tables().tables:
                    table_pages.add(p_num)
            except: pass

            # 4. Equation detection
            math_chars = sum(1 for c in full_text if c in EQUATION_CHARS)
            if math_chars >= 3 or EQUATION_RE.search(full_text):
                eq_pages.add(p_num)

            # 5. DOI lookup (first 2 pages only)
            if pg_idx < 2 and doi is None:
                m = re.search(r"10\.\d{4,}/\S+", full_text)
                if m: doi = m.group()

        # Post-process: Heading detection threshold
        if blocks:
            sizes = sorted(set(b["font_size"] for b in blocks), reverse=True)
            threshold = sizes[max(0, int(len(sizes) * 0.15) - 1)]
        else: threshold = 14.0

        for b in blocks:
            text_clean = b["text"].strip()
            b["is_heading"] = (
                b["font_size"] >= threshold
                or HEADING_RE.match(text_clean)
                or (b["is_bold"] and CUSTOM_HEADING_RE.match(text_clean) and len(text_clean) < 80)
            )

        # Build final segments
        sections = _segment_sections(blocks, table_pages, eq_pages)
        raw_text = "\n\n".join(s.body for s in sections)
        word_count = len(raw_text.split())

        parsed_meta = {
            "title": title, "authors": meta.get("author", "Unknown"),
            "year": year, "doi": doi, "subject": meta.get("subject", ""),
            "keywords": meta.get("keywords", "")
        }

        logger.info(f"[{job_id}] Parsed {doc.page_count} pages in single pass.")

        return ParsedDocument(
            job_id=job_id, filename=file_path.name, total_pages=doc.page_count,
            word_count=word_count, sections=sections, raw_text=raw_text,
            metadata=parsed_meta
        )
    finally:
        doc.close()

# Remove old helper functions that are now inline/redundant
def _extract_metadata_STUB(): pass
def _extract_blocks_STUB(): pass
def _detect_tables_STUB(): pass
def _detect_equation_pages_STUB(): pass


def _segment_sections(
    blocks: list[dict],
    table_pages: set[int],
    eq_pages: set[int],
) -> list[ParsedSection]:
    """
    Group consecutive non-heading blocks under the nearest preceding heading,
    producing a list of ParsedSection objects.
    """
    sections: list[ParsedSection] = []
    current_title  = "Preamble"
    current_body   = []
    current_start  = blocks[0]["page"] if blocks else 1
    current_pages  = set()

    def flush():
        nonlocal current_title, current_body, current_start, current_pages
        body = " ".join(current_body).strip()
        if not body:
            return
        pages_used = sorted(current_pages)
        pg_end = pages_used[-1] if pages_used else current_start
        sections.append(ParsedSection(
            title          = current_title,
            body           = body,
            page_start     = current_start,
            page_end       = pg_end,
            has_tables     = bool(current_pages & table_pages),
            has_equations  = bool(current_pages & eq_pages),
        ))
        current_body  = []
        current_pages = set()

    for block in blocks:
        current_pages.add(block["page"])
        if block["is_heading"]:
            flush()
            current_title = _clean_heading(block["text"])
            current_start = block["page"]
        else:
            current_body.append(block["text"])

    flush()   # flush the last section
    return sections


def _clean_heading(text: str) -> str:
    """Normalise heading text: strip leading numbers, trim whitespace."""
    text = re.sub(r"^\d+\.?\s*", "", text).strip()
    return text[:120]   # cap length


# ── Table-to-text helper (used by script generator for context) ───────────────

def extract_table_markdown(file_path: Path, page_number: int) -> str:
    """
    Extract all tables from a given page and return them as Markdown strings.
    Useful for injecting structured table data into the LLM prompt.
    """
    results = []
    with pdfplumber.open(str(file_path)) as pdf:
        if page_number > len(pdf.pages):
            return ""
        page   = pdf.pages[page_number - 1]
        tables = page.extract_tables()
        for table in tables:
            if not table:
                continue
            header = table[0]
            rows   = table[1:]
            md     = "| " + " | ".join(str(c or "") for c in header) + " |\n"
            md    += "| " + " | ".join("---" for _ in header) + " |\n"
            for row in rows:
                md += "| " + " | ".join(str(c or "") for c in row) + " |\n"
            results.append(md)
    return "\n\n".join(results)


def _guess_title_from_filename(filename: str) -> str:
    """Fallback title generator."""
    name = Path(filename).stem
    # Replace underscores/hyphens with spaces and title case
    return re.sub(r"[\-_]", " ", name).title()


def _extract_year(date_str: str) -> Optional[int]:
    """Extract year from PDF date metadata (often 'D:YYYYMMDD...')"""
    if not date_str: return None
    m = re.search(r"(\d{4})", date_str)
    return int(m.group(1)) if m else None
