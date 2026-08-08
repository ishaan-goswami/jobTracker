"""Conservative generic adapter: never reports success without parsed job cards."""

import httpx
from bs4 import BeautifulSoup

from .base import JobSource
from ..models import CompanyConfig, RawJob, SourceResult

PARSER_VERSION = "generic_html.v1"


class GenericHTMLSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        response = httpx.get(
            company.careers_url,
            timeout=20,
            headers={"User-Agent": "NewGradJobWatcher/0.1"},
            follow_redirects=True,
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        jobs = []
        for anchor in soup.select("a[href]"):
            text = " ".join(anchor.get_text(" ", strip=True).split())
            href = anchor.get("href", "")
            if not text or len(text) > 120:
                continue
            if not any(term in href.lower() for term in ("job", "career", "position", "opening")):
                continue
            if href.startswith("/"):
                href = str(response.url.copy_with(path=href, query=None))
            if not href.startswith("http"):
                continue
            jobs.append(RawJob(source_id=href, title=text, official_url=href))
        warning = None
        if len(jobs) < 3:
            warning = "No reliable repeated job listing structure detected"
            jobs = []
        return SourceResult(
            jobs=jobs,
            source_url=str(response.url),
            http_status=response.status_code,
            content_type=response.headers.get("content-type"),
            records_received=len(jobs),
            records_parsed=len(jobs),
            parser_version=PARSER_VERSION,
            warning=warning,
        )
