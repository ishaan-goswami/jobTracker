from datetime import datetime, timezone

import httpx

from job_watcher.models import CompanyConfig, RawJob, SourceResult
from job_watcher.monitor import _status_for_exception, _status_for_result, _unsupported_result


def test_unsupported_source_is_not_success():
    company = CompanyConfig(id="openai", name="OpenAI", careers_url="https://openai.com/careers/search/", source_type="unsupported")
    status = _unsupported_result(company, datetime.now(timezone.utc))

    assert status.status == "unsupported"
    assert status.jobs_found == 0
    assert status.warning == "No reliable official public source adapter is configured"


def test_blocked_http_response_is_partial_not_failed():
    company = CompanyConfig(id="doordash", name="DoorDash", careers_url="https://careersatdoordash.com/", source_type="generic_html")
    request = httpx.Request("GET", company.careers_url)
    response = httpx.Response(403, request=request)
    exc = httpx.HTTPStatusError("blocked", request=request, response=response)

    status = _status_for_exception(company, datetime.now(timezone.utc), exc)

    assert status.status == "partial"
    assert status.warning == "Access blocked by the official source; not bypassed"


def test_structured_source_with_zero_records_can_succeed():
    company = CompanyConfig(id="hubspot", name="HubSpot", careers_url="https://www.hubspot.com/careers/jobs", source_type="greenhouse")
    result = SourceResult(
        jobs=[],
        source_url="https://boards-api.greenhouse.io/v1/boards/hubspotjobs/jobs?content=true",
        records_received=0,
        records_parsed=0,
        parser_version="greenhouse.v1",
    )

    status = _status_for_result(company, datetime.now(timezone.utc), result, matches=0)

    assert status.status == "success"


def test_structured_source_with_parsed_records_succeeds():
    company = CompanyConfig(id="ramp", name="Ramp", careers_url="https://ramp.com/careers", source_type="ashby")
    result = SourceResult(
        jobs=[RawJob(source_id="1", title="Software Engineer", official_url="https://jobs.ashbyhq.com/ramp/1")],
        source_url="https://api.ashbyhq.com/posting-api/job-board/ramp",
        records_received=1,
        records_parsed=1,
        parser_version="ashby.v1",
    )

    status = _status_for_result(company, datetime.now(timezone.utc), result, matches=1)

    assert status.status == "success"
    assert status.records_received == 1
    assert status.records_parsed == 1
