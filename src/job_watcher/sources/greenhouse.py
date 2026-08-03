import httpx
from .base import JobSource
from ..models import CompanyConfig, RawJob


class GreenhouseSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> list[RawJob]:
        if not company.source_identifier:
            raise ValueError("Greenhouse source requires source_identifier")
        url = f"https://boards-api.greenhouse.io/v1/boards/{company.source_identifier}/jobs?content=true"
        response = httpx.get(url, timeout=20, headers={"User-Agent": "NewGradJobWatcher/0.1"})
        response.raise_for_status()
        return [
            RawJob(
                source_id=str(item["id"]),
                title=item["title"],
                official_url=item["absolute_url"],
                location=item.get("location", {}).get("name"),
                description=item.get("content"),
            )
            for item in response.json()["jobs"]
        ]
