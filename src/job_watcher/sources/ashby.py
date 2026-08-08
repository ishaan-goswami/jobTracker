import httpx

from ..models import CompanyConfig, RawJob, SourceResult
from .base import JobSource

PARSER_VERSION = "ashby.v1"


class AshbySource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        if not company.source_identifier:
            raise ValueError("Ashby source requires source_identifier")
        url = f"https://api.ashbyhq.com/posting-api/job-board/{company.source_identifier}"
        response = httpx.get(url, timeout=20, headers={"User-Agent": "NewGradJobWatcher/0.1"})
        response.raise_for_status()
        payload = response.json()
        records = payload.get("jobs")
        if not isinstance(records, list):
            raise ValueError("Ashby response missing jobs list")
        jobs, errors = [], []
        for index, item in enumerate(records):
            try:
                job_url = item.get("jobUrl") or f"https://jobs.ashbyhq.com/{company.source_identifier}/{item['id']}"
                jobs.append(
                    RawJob(
                        source_id=item["id"],
                        title=item["title"],
                        official_url=job_url,
                        location=item.get("location"),
                        description=item.get("descriptionHtml") or item.get("descriptionPlain"),
                        team=item.get("team"),
                        employment_type=item.get("employmentType"),
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
            warning="Some Ashby records could not be parsed" if errors else None,
            partial_errors=errors,
        )
