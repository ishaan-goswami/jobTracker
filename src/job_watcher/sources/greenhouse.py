import httpx
from .base import JobSource, clean_html
from ..models import CompanyConfig, RawJob, SourceResult

PARSER_VERSION = "greenhouse.v1"


class GreenhouseSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        if not company.source_identifier:
            raise ValueError("Greenhouse source requires source_identifier")
        url = f"https://boards-api.greenhouse.io/v1/boards/{company.source_identifier}/jobs?content=true"
        response = httpx.get(url, timeout=20, headers={"User-Agent": "NewGradJobWatcher/0.1"})
        response.raise_for_status()
        payload = response.json()
        records = payload.get("jobs")
        if not isinstance(records, list):
            raise ValueError("Greenhouse response missing jobs list")
        jobs, errors = [], []
        for index, item in enumerate(records):
            try:
                jobs.append(
                    RawJob(
                        source_id=str(item["id"]),
                        title=item["title"],
                        official_url=item["absolute_url"],
                        location=item.get("location", {}).get("name"),
                        description=clean_html(item.get("content")),
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                errors.append(f"record {index}: {exc}")
        return SourceResult(
            jobs=jobs,
            source_url=url,
            http_status=response.status_code,
            content_type=response.headers.get("content-type"),
            records_received=len(records),
            records_parsed=len(jobs),
            parser_version=PARSER_VERSION,
            warning="Some Greenhouse records could not be parsed" if errors else None,
            partial_errors=errors,
        )
