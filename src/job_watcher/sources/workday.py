import httpx
from .base import JobSource, clean_html
from ..models import CompanyConfig, RawJob, SourceResult

PARSER_VERSION = "workday.v1"


class WorkdaySource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        if not company.source_identifier:
            raise ValueError("Workday source requires source_identifier (format: tenant/client)")

        parts = company.source_identifier.split("/")
        tenant = parts[0]
        client = parts[1] if len(parts) > 1 else "jobs"

        url = f"https://{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{client}/jobs"

        jobs, errors = [], []
        records_received = 0

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        offset = 0
        limit = 20
        total = 20

        while offset < total and offset < 200:
            payload = {"appliedFacets": {}, "limit": limit, "offset": offset, "searchText": ""}
            response = httpx.post(url, json=payload, headers=headers, timeout=20)
            response.raise_for_status()
            data = response.json()

            postings = data.get("jobPostings", [])
            total = data.get("total", len(postings))
            records_received += len(postings)

            for index, item in enumerate(postings):
                try:
                    title = item.get("title", "")
                    ext_path = item.get("externalPath", "")
                    job_id = ext_path.split("_")[-1] if ext_path else f"{offset}_{index}"
                    location = item.get("locationsText")
                    if not location and item.get("bulletFields"):
                        location = item["bulletFields"][0]

                    official_url = f"https://{tenant}.wd1.myworkdayjobs.com/jobs{ext_path}" if ext_path else company.careers_url

                    jobs.append(
                        RawJob(
                            source_id=job_id,
                            title=title,
                            official_url=official_url,
                            location=location,
                            description=f"{title} at {company.name} in {location or 'US'}",
                        )
                    )
                except (KeyError, TypeError, ValueError) as exc:
                    errors.append(f"offset {offset} record {index}: {exc}")

            offset += limit

        return SourceResult(
            jobs=jobs,
            source_url=url,
            http_status=200,
            content_type="application/json",
            records_received=records_received,
            records_parsed=len(jobs),
            parser_version=PARSER_VERSION,
            warning="Some Workday records could not be parsed" if errors else None,
            partial_errors=errors,
        )
