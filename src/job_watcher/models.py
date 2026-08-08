from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field


class CompanyConfig(BaseModel):
    id: str
    name: str
    enabled: bool = True
    careers_url: str
    source_type: str = "generic_html"
    source_identifier: str = ""
    locations: list[str] = Field(default_factory=lambda: ["United States"])
    include_keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)


class RawJob(BaseModel):
    source_id: str
    title: str
    official_url: str
    location: str | None = None
    description: str | None = None
    team: str | None = None
    employment_type: str | None = None
    posted_at: datetime | None = None


class SourceResult(BaseModel):
    jobs: list[RawJob] = Field(default_factory=list)
    source_url: str
    http_status: int | None = None
    content_type: str | None = None
    records_received: int = 0
    records_parsed: int = 0
    parser_version: str
    warning: str | None = None
    partial_errors: list[str] = Field(default_factory=list)


class Job(BaseModel):
    id: str
    company_id: str
    company_name: str
    title: str
    location: str | None = None
    description: str | None = None
    team: str | None = None
    employment_type: str | None = None
    official_url: str
    source_url: str
    source_type: str
    posted_at: datetime | None = None
    discovered_at: datetime
    last_seen_at: datetime
    is_open: bool = True
    match_score: float = 0
    match_reasons: list[str] = Field(default_factory=list)
    fingerprint: str


class CheckStatus(BaseModel):
    company_id: str
    checked_at: datetime
    status: str
    source_type: str
    source_url: str
    jobs_found: int = 0
    records_received: int = 0
    records_parsed: int = 0
    matching_jobs: int = 0
    parser_version: str | None = None
    warning: str | None = None
    error: str | None = None
