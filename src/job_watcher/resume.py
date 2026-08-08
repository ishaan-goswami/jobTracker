"""Local-only, conservative LaTeX tailoring utilities and HackerRank ATS evaluation."""
from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

from .hackerrank_evaluator import evaluate_hackerrank_rules


def _keyword_match_rate(tex: str, keywords: list[str]) -> float:
    if not keywords:
        return 0.0
    found = sum(1 for word in keywords if word.lower() in tex.lower())
    return round(found / len(keywords), 3)


def analyze(tex: str, job_description: str) -> dict:
    stop_words = {
        "and",
        "are",
        "for",
        "from",
        "have",
        "need",
        "that",
        "the",
        "this",
        "with",
        "you",
        "your",
    }

    original_words = re.findall(
        r"[A-Za-z][A-Za-z0-9+#.-]{2,}",
        job_description,
    )

    keywords: list[str] = []
    seen: set[str] = set()

    for word in original_words:
        normalized = word.lower()

        if normalized in stop_words or normalized in seen:
            continue

        seen.add(normalized)
        keywords.append(word)

    existing = tex.lower()

    present = [
        word
        for word in keywords
        if word.lower() in existing
    ]
    missing = [
        word
        for word in keywords
        if word.lower() not in existing
    ]

    match_rate = _keyword_match_rate(tex, keywords[:80])
    hackerrank_eval = evaluate_hackerrank_rules(tex, job_description)

    return {
        "match_analysis": {
            "summary": (
                "Conservative local keyword & HackerRank ATS analysis. The generated LaTeX is "
                "unchanged unless a future rule can trace every edit to the "
                "original resume."
            ),
            "before_keyword_match": match_rate,
            "after_keyword_match": match_rate,
        },
        "important_keywords": keywords[:80],
        "resume_evidence": present,
        "unsupported_or_missing": missing,
        "hackerrank_evaluation": hackerrank_eval,
        "recommended_bullet_order": [],
        "proposed_bullet_edits": [],
        "traceability": {
            "resume_source": "Uploaded/passed local LaTeX only",
            "job_source": "Selected public job description or local job-description file",
        },
        "warning": (
            "Every unsupported keyword is only a prompt for user evidence. "
            "Do not add it unless it is already true and supportable."
        ),
        "method": (
            "Local lexical evidence analysis & HackerRank 120-pt ATS rules; "
            "no unverified claims are generated."
        ),
    }


def tailor(tex_path: Path, job_slug: str, job_description: str, output_root: Path = Path("generated/resumes")) -> Path:
    original = tex_path.read_text(encoding="utf-8")
    revised = original
    target = output_root / job_slug
    target.mkdir(parents=True, exist_ok=True)
    (target / "tailored_resume.tex").write_text(revised, encoding="utf-8")
    (target / "changes.diff").write_text("".join(difflib.unified_diff(original.splitlines(True), revised.splitlines(True), fromfile=str(tex_path), tofile="tailored_resume.tex")), encoding="utf-8")
    (target / "analysis.json").write_text(json.dumps(analyze(original, job_description), indent=2) + "\n", encoding="utf-8")
    return target
