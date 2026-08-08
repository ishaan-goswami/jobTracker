import httpx

from ..models import CompanyConfig, RawJob, SourceResult
from .base import JobSource

PARSER_VERSION = "amazon.v1"


class AmazonSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        url = "https://www.amazon.jobs/en/search.json?base_query=software+engineer&result_limit=100"
        response = httpx.get(
            url,
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
        )
        response.raise_for_status()
        payload = response.json()
        records = payload.get("jobs", [])
        if not isinstance(records, list):
            raise ValueError("Amazon response missing jobs array")
        jobs, errors = [], []
        for index, item in enumerate(records):
            try:
                job_id = str(item.get("id_icims") or item["id"])
                path = item.get("job_path") or f"/en/jobs/{job_id}"
                jobs.append(
                    RawJob(
                        source_id=job_id,
                        title=item["title"],
                        official_url=f"https://www.amazon.jobs{path}",
                        location=item.get("normalized_location") or item.get("location"),
                        description=item.get("description"),
                        team=item.get("job_category"),
                        employment_type=item.get("job_schedule_type"),
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
            warning="Some Amazon records could not be parsed" if errors else None,
            partial_errors=errors,
        )
