import os
import httpx

from .models import Job


def send_discord(jobs: list[Job], webhook_url: str | None = None) -> None:
    """Send one compact notification. The webhook URL must come from an environment secret."""
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")
    if not jobs or not url:
        return
    lines = [f"• [{job.company_name} — {job.title}]({job.official_url})" for job in jobs[:10]]
    payload = {"content": "**New matching 2027 new-grad roles**\n" + "\n".join(lines), "allowed_mentions": {"parse": []}}
    response = httpx.post(url, json=payload, timeout=20)
    response.raise_for_status()
