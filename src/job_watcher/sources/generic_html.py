"""Conservative generic adapter: discovery status only, no brittle job extraction."""

import httpx
from .base import JobSource
from ..models import CompanyConfig, RawJob


class GenericHTMLSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> list[RawJob]:
        response = httpx.get(
            company.careers_url,
            timeout=20,
            headers={"User-Agent": "NewGradJobWatcher/0.1"},
            follow_redirects=True,
        )
        response.raise_for_status()
        return []
