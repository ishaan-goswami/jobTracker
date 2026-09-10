import os
import httpx

from .models import Job


def send_discord(jobs: list[Job], webhook_url: str | None = None) -> None:
    """Send high-priority instant notifications to Discord via webhook."""
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")
    if not jobs or not url:
        return

    # Highlight urgent high-impact target drops (DoorDash, Stripe, OpenAI, Anthropic, etc.)
    has_urgent = any(
        job.company_id in {"doordash", "stripe", "openai", "anthropic"} or "2027" in job.title
        for job in jobs
    )

    header = "🚨 **URGENT JOB DROP DETECTED** 🚨\n" if has_urgent else "**New matching 2027 new-grad roles**\n"
    lines = [f"• [{job.company_name} — {job.title}]({job.official_url})" for job in jobs[:10]]

    embeds = []
    for job in jobs[:5]:
        color = 0xFF3008 if job.company_id == "doordash" else 0x5865F2
        embeds.append({
            "title": f"🚀 {job.company_name} — {job.title}",
            "url": job.official_url,
            "color": color,
            "fields": [
                {"name": "📍 Location", "value": job.location or "Not specified", "inline": True},
                {"name": "🎯 Match Score", "value": f"{job.match_score}/100", "inline": True},
                {"name": "✨ Match Reasons", "value": ", ".join(job.match_reasons[:3]) if job.match_reasons else "Matching role criteria", "inline": False},
            ],
            "footer": {"text": f"Source: {job.source_type.upper()} | Instant Alert"},
        })

    payload = {
        "content": header + "\n".join(lines),
        "embeds": embeds,
        "allowed_mentions": {"parse": ["everyone"] if has_urgent else []},
    }

    response = httpx.post(url, json=payload, timeout=20)
    response.raise_for_status()

