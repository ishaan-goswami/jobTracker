from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path

from .config import ROOT, companies, filters
from .matcher import score_job
from .models import CheckStatus, Job
from .sources import SOURCES
from .storage import read_json, upsert_jobs, write_json


def _fingerprint(company_id: str, title: str, location: str | None, source: str) -> str:
    value = "|".join([company_id, title.lower().strip(), (location or "").lower().strip(), source])
    return sha256(value.encode()).hexdigest()


def run(data_dir: Path = ROOT / "data") -> list[Job]:
    now = datetime.now(timezone.utc)
    rules, all_jobs, statuses = filters(), [], []
    for company in companies():
        if not company.enabled:
            continue
        try:
            source = SOURCES[company.source_type]()
            raw_jobs = source.fetch_jobs(company)
            matches = 0
            for raw in raw_jobs:
                score, reasons = score_job(raw, rules)
                if score < rules["candidate"]["minimum_match_score"]:
                    continue
                matches += 1
                all_jobs.append(Job(id=raw.source_id, company_id=company.id, company_name=company.name, title=raw.title, location=raw.location, description=raw.description, team=raw.team, employment_type=raw.employment_type, official_url=raw.official_url, source_url=company.careers_url, source_type=company.source_type, posted_at=raw.posted_at, discovered_at=now, last_seen_at=now, match_score=score, match_reasons=reasons, fingerprint=_fingerprint(company.id, raw.title, raw.location, raw.source_id)))
            statuses.append(CheckStatus(company_id=company.id, checked_at=now, status="success", jobs_found=len(raw_jobs), matching_jobs=matches).model_dump(mode="json"))
        except Exception as exc:  # isolated failure is recorded, not hidden
            statuses.append(CheckStatus(company_id=company.id, checked_at=now, status="partial", error=str(exc)).model_dump(mode="json"))
    new = upsert_jobs(data_dir / "jobs.json", [job.model_dump(mode="json") for job in all_jobs])
    write_json(data_dir / "seen_jobs.json", [job["fingerprint"] for job in read_json(data_dir / "jobs.json", [])])
    write_json(data_dir / "check_status.json", statuses)
    return [Job.model_validate(job) for job in new]
