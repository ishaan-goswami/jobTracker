import os
import httpx
import pytest
from job_watcher.models import Job
from job_watcher.notifier import send_discord


from datetime import datetime, timezone

def test_send_discord_formats_payload_and_posts(monkeypatch):
    posted = []

    def mock_post(url, json, timeout):
        posted.append((url, json))
        req = httpx.Request("POST", url)
        return httpx.Response(204, request=req)

    monkeypatch.setattr(httpx, "post", mock_post)

    now = datetime.now(timezone.utc)
    job = Job(
        id="123",
        company_id="google",
        company_name="Google",
        title="Software Engineer, University Graduate",
        location="Mountain View, CA",
        official_url="https://google.com/jobs/123",
        source_url="https://google.com/jobs",
        source_type="test",
        discovered_at=now,
        last_seen_at=now,
        match_score=85,
        match_reasons=["Software Engineer", "University Graduate"],
        fingerprint="fp123",
    )

    send_discord([job], webhook_url="https://discord.com/api/webhooks/fake")

    assert len(posted) == 1
    url, payload = posted[0]
    assert url == "https://discord.com/api/webhooks/fake"
    assert "Google — Software Engineer, University Graduate" in payload["content"]
    assert "https://google.com/jobs/123" in payload["content"]


@pytest.mark.skipif(not os.getenv("DISCORD_WEBHOOK_URL"), reason="DISCORD_WEBHOOK_URL not set")
def test_send_discord_live():
    now = datetime.now(timezone.utc)
    job = Job(
        id="test-001",
        company_id="test",
        company_name="Test Company",
        title="Test 2027 SWE Role",
        location="Remote",
        official_url="https://example.com/job/test-001",
        source_url="https://example.com/careers",
        source_type="test",
        discovered_at=now,
        last_seen_at=now,
        match_score=90,
        match_reasons=["Test job"],
        fingerprint="test-fp-live",
    )
    send_discord([job])
