from datetime import datetime, timezone
from job_watcher import monitor
from job_watcher.models import CompanyConfig, RawJob, SourceResult


class MockSource:
    def __init__(self, raw_jobs):
        self.raw_jobs = raw_jobs

    def fetch_jobs(self, company):
        return SourceResult(
            jobs=self.raw_jobs,
            source_url="https://example.com/jobs",
            http_status=200,
            content_type="application/json",
            records_received=len(self.raw_jobs),
            records_parsed=len(self.raw_jobs),
            parser_version="mock.v1",
        )


def test_monitor_deduplicates_previously_seen_jobs(tmp_path, monkeypatch):
    company = CompanyConfig(
        id="stripe",
        name="Stripe",
        enabled=True,
        careers_url="https://stripe.com/jobs",
        source_type="greenhouse",
        source_identifier="stripe",
    )
    monkeypatch.setattr(monitor, "companies", lambda: [company])

    job1 = RawJob(
        source_id="job-101",
        title="Software Engineer, New Grad 2027",
        official_url="https://stripe.com/jobs/101",
        location="San Francisco, CA",
        description="New grad SWE position starting early 2027",
    )
    job2 = RawJob(
        source_id="job-102",
        title="Backend Software Engineer, University Graduate",
        official_url="https://stripe.com/jobs/102",
        location="New York, NY",
        description="University graduate 2026/2027 role",
    )

    # --- RUN 1 ---
    monkeypatch.setattr(
        "job_watcher.sources.GreenhouseSource.fetch_jobs",
        lambda self, c: MockSource([job1]).fetch_jobs(c),
    )
    new_jobs_run1 = monitor.run(data_dir=tmp_path)
    assert len(new_jobs_run1) == 1
    assert new_jobs_run1[0].id == "job-101"

    # --- RUN 2 (Same job again) ---
    new_jobs_run2 = monitor.run(data_dir=tmp_path)
    assert len(new_jobs_run2) == 0, "Second run should not report previously seen job as new"

    # --- RUN 3 (Job 1 + New Job 2) ---
    monkeypatch.setattr(
        "job_watcher.sources.GreenhouseSource.fetch_jobs",
        lambda self, c: MockSource([job1, job2]).fetch_jobs(c),
    )
    new_jobs_run3 = monitor.run(data_dir=tmp_path)
    assert len(new_jobs_run3) == 1
    assert new_jobs_run3[0].id == "job-102"
