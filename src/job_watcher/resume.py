"""Local-only, conservative LaTeX tailoring utilities. No network/API use."""
from __future__ import annotations

import difflib
import json
import re
from pathlib import Path


def analyze(tex: str, job_description: str) -> dict:
    words = sorted({word.lower() for word in re.findall(r"[A-Za-z][A-Za-z+#.-]{2,}", job_description)})
    existing = tex.lower()
    present = [word for word in words if word in existing]
    missing = [word for word in words if word not in existing]
    return {"important_keywords": words[:80], "resume_evidence": present, "unsupported_or_missing": missing, "warning": "Missing terms are not qualifications. Add only facts you can substantiate.", "method": "Local lexical evidence analysis; no claims are generated."}


def tailor(tex_path: Path, job_slug: str, job_description: str, output_root: Path = Path("generated/resumes")) -> Path:
    original = tex_path.read_text(encoding="utf-8")
    # Deliberately preserve source verbatim: an MVP must never invent or silently alter claims.
    revised = original
    target = output_root / job_slug
    target.mkdir(parents=True, exist_ok=True)
    (target / "tailored_resume.tex").write_text(revised, encoding="utf-8")
    (target / "changes.diff").write_text("".join(difflib.unified_diff(original.splitlines(True), revised.splitlines(True), fromfile=str(tex_path), tofile="tailored_resume.tex")), encoding="utf-8")
    (target / "analysis.json").write_text(json.dumps(analyze(original, job_description), indent=2) + "\n", encoding="utf-8")
    return target
