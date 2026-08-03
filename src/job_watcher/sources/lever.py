import httpx
from .base import JobSource
from ..models import CompanyConfig, RawJob


class LeverSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> list[RawJob]:
        if not company.source_identifier:
            raise ValueError("Lever source requires source_identifier")
        url = f"https://api.lever.co/v0/postings/{company.source_identifier}?mode=json"
        response = httpx.get(url, timeout=20, headers={"User-Agent": "NewGradJobWatcher/0.1"})
        response.raise_for_status()
        return [
            RawJob(
                source_id=item["id"],
                title=item["text"],
                official_url=item["hostedUrl"],
                location=item.get("categories", {}).get("location"),
                description=item.get("descriptionPlain"),
                team=item.get("categories", {}).get("team"),
                employment_type=item.get("categories", {}).get("commitment"),
            )
            for item in response.json()
        ]
