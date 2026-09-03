import httpx
from bs4 import BeautifulSoup

from ..models import CompanyConfig, RawJob, SourceResult
from .base import JobSource

PARSER_VERSION = "google.v1"


class GoogleSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        queries = [
            "Software Engineer Campus",
            "Software Engineer Early Career",
            "Software Engineer University Graduate",
            "New Grad Software Engineer",
            "Software Engineer",
        ]
        raw_jobs_map = {}
        total_fetched = 0
        errors = []

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }

        location_markers = [
            "USA", "United States", "Canada", "Mexico", "UK", "United Kingdom", "Germany", "India",
            "CA", "WA", "NY", "TX", "MA", "GA", "ON", "QC", "Waterloo", "Montreal", "Mountain View",
            "Cambridge", "Sunnyvale", "Seattle", "Atlanta", "Austin", "New York"
        ]

        for query in queries:
            url = f"https://www.google.com/about/careers/applications/jobs/results/?q={httpx.QueryParams({'q': query})}"
            try:
                res = httpx.get(url, headers=headers, follow_redirects=True, timeout=15)
                res.raise_for_status()
                soup = BeautifulSoup(res.text, "html.parser")
                
                cards = soup.find_all("li")
                total_fetched += len(cards)
                
                for idx, card in enumerate(cards):
                    h3 = card.find("h3")
                    if not h3:
                        continue
                    title = h3.get_text(strip=True)
                    if not title or len(title) < 3:
                        continue

                    link_tag = card.find("a", href=True)
                    if not link_tag:
                        continue
                    href = link_tag["href"]
                    if href.startswith("/"):
                        href = "https://www.google.com/about/careers/applications" + href
                    elif not href.startswith("http"):
                        href = "https://www.google.com/about/careers/applications/" + href.lstrip("/")

                    href = href.split("?")[0]
                    if "jobs/results/" not in href:
                        continue
                        
                    job_id = href.split("jobs/results/")[-1].strip("/") or title.lower().replace(" ", "-")

                    text_content = card.get_text(separator=" ", strip=True)

                    locations = []
                    for span in card.find_all("span"):
                        s_text = span.get_text(strip=True).replace("place", "").lstrip("; ").strip()
                        if any(marker in s_text for marker in location_markers):
                            if s_text and s_text not in locations and len(s_text) < 100:
                                locations.append(s_text)

                    location = "; ".join(locations) or "Unspecified"

                    if job_id not in raw_jobs_map:
                        raw_jobs_map[job_id] = RawJob(
                            source_id=f"google-{job_id}",
                            title=title,
                            official_url=href,
                            location=location,
                            description=text_content,
                            team="Software Engineering",
                            employment_type="full-time",
                        )
            except Exception as exc:
                errors.append(f"query '{query}': {exc}")

        jobs = list(raw_jobs_map.values())
        return SourceResult(
            jobs=jobs,
            source_url="https://www.google.com/about/careers/applications/jobs/results/",
            http_status=200,
            records_received=total_fetched,
            records_parsed=len(jobs),
            parser_version=PARSER_VERSION,
            warning="Some Google queries encountered partial errors" if errors else None,
            partial_errors=errors,
        )
