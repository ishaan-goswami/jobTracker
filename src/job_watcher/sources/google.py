import httpx
from bs4 import BeautifulSoup

from ..models import CompanyConfig, RawJob, SourceResult
from .base import JobSource

PARSER_VERSION = "google.v1"


class GoogleSource(JobSource):
    def fetch_jobs(self, company: CompanyConfig) -> SourceResult:
        queries = ["Software Engineer", "Early Career", "University Graduate"]
        raw_jobs_map = {}
        total_fetched = 0
        errors = []

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }

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
                    href = link_tag["href"] if link_tag else "https://www.google.com/about/careers/applications/jobs/results/"
                    if href.startswith("/"):
                        href = "https://www.google.com/about/careers/applications" + href
                    elif not href.startswith("http"):
                        href = "https://www.google.com/about/careers/applications/" + href.lstrip("/")

                    href = href.split("?")[0]
                    job_id = href.split("jobs/results/")[-1].strip("/") or title.lower().replace(" ", "-")

                    text_content = card.get_text(separator=" ", strip=True)

                    locations = []
                    for span in card.find_all("span"):
                        s_text = span.get_text(strip=True)
                        if any(marker in s_text for marker in ["CA", "WA", "NY", "TX", "MA", "GA", "USA", "United States", "Mountain View", "Sunnyvale", "Seattle", "Cambridge", "Atlanta"]):
                            locations.append(s_text)

                    location = ", ".join(dict.fromkeys(locations)) or "United States"

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
