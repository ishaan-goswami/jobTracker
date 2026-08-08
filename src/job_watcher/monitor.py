from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path

import httpx

from .config import ROOT, companies, filters
from .matcher import score_job
from .models import CheckStatus, CompanyConfig, Job, SourceResult
from .sources import SOURCES
from .storage import read_json, upsert_jobs, write_json


def _fingerprint(company_id: str, title: str, location: str | None, source: str) -> str:
    value = "|".join([company_id, title.lower().strip(), (location or "").lower().strip(), source])
    return sha256(value.encode()).hexdigest()


def _unsupported_result(company: CompanyConfig, now: datetime) -> CheckStatus:
    return CheckStatus(
        company_id=company.id,
        checked_at=now,
        status="unsupported",
        source_type=company.source_type,
        source_url=company.careers_url,
        parser_version=None,
        warning="No reliable official public source adapter is configured",
    )


def _status_for_result(company: CompanyConfig, now: datetime, result: SourceResult, matches: int) -> CheckStatus:
    status = "success"
    warning = result.warning
    if result.partial_errors or result.warning:
        status = "partial"
    if result.records_received > 0 and result.records_parsed == 0:
        status = "partial"
        warning = warning or "Records were received but none could be parsed"
    return CheckStatus(
        company_id=company.id,
        checked_at=now,
        status=status,
        source_type=company.source_type,
        source_url=result.source_url,
        jobs_found=len(result.jobs),
        records_received=result.records_received,
        records_parsed=result.records_parsed,
        matching_jobs=matches,
        parser_version=result.parser_version,
        warning=warning,
        error="; ".join(result.partial_errors) or None,
    )


def _status_for_exception(company: CompanyConfig, now: datetime, exc: Exception) -> CheckStatus:
    status = "failed"
    warning = None
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in {401, 403, 406, 429}:
        status = "partial"
        warning = "Access blocked by the official source; not bypassed"
    return CheckStatus(
        company_id=company.id,
        checked_at=now,
        status=status,
        source_type=company.source_type,
        source_url=company.careers_url,
        warning=warning,
        error=str(exc),
    )


def run(data_dir: Path = ROOT / "data") -> list[Job]:
    now = datetime.now(timezone.utc)
    rules, all_jobs, statuses = filters(), [], []
    for company in companies():
        if not company.enabled:
            continue
        try:
            if company.source_type == "unsupported" or company.source_type not in SOURCES:
                statuses.append(_unsupported_result(company, now).model_dump(mode="json"))
                continue
            source = SOURCES[company.source_type]()
            result = source.fetch_jobs(company)
            raw_jobs = result.jobs
            matches = 0
            for raw in raw_jobs:
                score, reasons = score_job(raw, rules)
                if score < rules["candidate"]["minimum_match_score"]:
                    continue
                matches += 1
                all_jobs.append(
                    Job(
                        id=raw.source_id,
                        company_id=company.id,
                        company_name=company.name,
                        title=raw.title,
                        location=raw.location,
                        description=raw.description,
                        team=raw.team,
                        employment_type=raw.employment_type,
                        official_url=raw.official_url,
                        source_url=company.careers_url,
                        source_type=company.source_type,
                        posted_at=raw.posted_at,
                        discovered_at=now,
                        last_seen_at=now,
                        match_score=score,
                        match_reasons=reasons,
                        fingerprint=_fingerprint(
                            company.id, raw.title, raw.location, raw.source_id
                        ),
                    )
                )
            statuses.append(_status_for_result(company, now, result, matches).model_dump(mode="json"))
        except Exception as exc:  # isolated failure is recorded, not hidden
            statuses.append(_status_for_exception(company, now, exc).model_dump(mode="json"))
    new = upsert_jobs(data_dir / "jobs.json", [job.model_dump(mode="json") for job in all_jobs])
    write_json(
        data_dir / "seen_jobs.json",
        [job["fingerprint"] for job in read_json(data_dir / "jobs.json", [])],
    )
    write_json(data_dir / "check_status.json", statuses)
    return [Job.model_validate(job) for job in new]
