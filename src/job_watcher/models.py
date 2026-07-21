from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


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
    jobs_found: int = 0
    matching_jobs: int = 0
    error: str | None = None
