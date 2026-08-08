import json
import os
from pathlib import Path

import httpx
import pytest

from job_watcher.models import CompanyConfig
from job_watcher.sources.amazon import AmazonSource
from job_watcher.sources.ashby import AshbySource
from job_watcher.sources.greenhouse import GreenhouseSource

FIXTURES = Path(__file__).parent / "fixtures" / "sources"


class FakeResponse:
    status_code = 200
    headers = {"content-type": "application/json"}

    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def load_fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_ashby_parser_reports_plausible_records(monkeypatch):
    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: FakeResponse(load_fixture("ramp_ashby.json")))
    company = CompanyConfig(id="ramp", name="Ramp", careers_url="https://ramp.com/careers", source_type="ashby", source_identifier="ramp")

    result = AshbySource().fetch_jobs(company)

    assert result.records_received == 2
    assert result.records_parsed == 2
    assert result.parser_version == "ashby.v1"
    assert result.jobs[0].source_id == "34413f8d-26bf-4bbc-8ade-eb309a0e2245"
    assert result.jobs[0].official_url.startswith("https://jobs.ashbyhq.com/ramp/")


@pytest.mark.parametrize(
    ("identifier", "fixture"),
    [
        ("hubspotjobs", "hubspot_greenhouse.json"),
        ("stripe", "stripe_greenhouse.json"),
    ],
)
def test_greenhouse_parser_reports_plausible_records(monkeypatch, identifier, fixture):
    monkeypatch.setattr(httpx, "get", lambda *args, **kwargs: FakeResponse(load_fixture(fixture)))
    company = CompanyConfig(id=identifier, name=identifier, careers_url="https://example.com", source_type="greenhouse", source_identifier=identifier)

    result = GreenhouseSource().fetch_jobs(company)

    assert result.records_received == 2
    assert result.records_parsed == 2
    assert result.parser_version == "greenhouse.v1"
    assert all(job.title for job in result.jobs)
    assert all(job.official_url.startswith("https://") for job in result.jobs)


@pytest.mark.skipif(os.getenv("JOB_WATCHER_LIVE_SOURCE_TESTS") != "1", reason="manual integration test")
@pytest.mark.parametrize(
    "company",
    [
        CompanyConfig(id="ramp", name="Ramp", careers_url="https://ramp.com/careers", source_type="ashby", source_identifier="ramp"),
        CompanyConfig(id="openai", name="OpenAI", careers_url="https://openai.com/careers/search/", source_type="ashby", source_identifier="openai"),
        CompanyConfig(id="hubspot", name="HubSpot", careers_url="https://www.hubspot.com/careers/jobs", source_type="greenhouse", source_identifier="hubspotjobs"),
        CompanyConfig(id="stripe", name="Stripe", careers_url="https://stripe.com/jobs/search", source_type="greenhouse", source_identifier="stripe"),
        CompanyConfig(id="databricks", name="Databricks", careers_url="https://www.databricks.com/company/careers/open-positions", source_type="greenhouse", source_identifier="databricks"),
        CompanyConfig(id="linkedin", name="LinkedIn", careers_url="https://careers.linkedin.com/", source_type="greenhouse", source_identifier="linkedin"),
        CompanyConfig(id="amazon", name="Amazon", careers_url="https://www.amazon.jobs/", source_type="amazon", source_identifier="amazon"),
    ],
)
def test_live_sources_return_plausible_record_counts(company):
    if company.source_type == "ashby":
        source = AshbySource()
    elif company.source_type == "amazon":
        source = AmazonSource()
    else:
        source = GreenhouseSource()
    result = source.fetch_jobs(company)

    assert result.records_received >= result.records_parsed >= 0
    assert result.records_received < 5000
    assert result.records_parsed > 0
