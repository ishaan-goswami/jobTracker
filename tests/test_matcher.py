from job_watcher.matcher import score_job
from job_watcher.models import RawJob


RULES = {
    "candidate": {
        "us_only": True,
        "minimum_match_score": 55,
    },
    "positive_keywords": {
        "engineering": ["software engineer"],
        "new_grad": ["new grad", "2026 graduate"],
        "early_career": ["entry level"],
        "start_date": ["early 2027"],
    },
    "weights": {
        "engineering_title": 30,
        "new_grad_title": 45,
        "early_career_title": 35,
        "new_grad_description": 25,
        "graduation_or_start_year": 20,
        "zero_to_two_years": 20,
        "three_years": 5,
        "senior_title": -80,
        "internship_title": -80,
        "four_plus_years": -60,
        "non_engineering": -50,
    },
}


def test_december_2026_candidate_matches_early_2027_role():
    job = RawJob(
        source_id="1",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="San Francisco, CA",
        description="For 2026 graduates who can start in early 2027. 0-2 years experience.",
    )
    score, reasons = score_job(job, RULES)
    assert score == 100
    assert "Matches December 2026 / 2027 start timing" in reasons


def test_internship_title_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer Intern",
        official_url="https://example.com",
        location="San Francisco, CA",
    )
    score, _ = score_job(job, RULES)
    assert score == 0


def test_non_us_location_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="Sydney, Australia",
        description="For 2026 graduates starting in 2027",
    )
    score, reasons = score_job(job, RULES)
    assert score == 0.0
    assert "Non-US location excluded" in reasons


def test_us_location_is_accepted():
    job = RawJob(
        source_id="1",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="Seattle, WA",
        description="Software engineer position starting early 2027",
    )
    score, reasons = score_job(job, RULES)
    assert score >= 90
    assert "United States location" in reasons
