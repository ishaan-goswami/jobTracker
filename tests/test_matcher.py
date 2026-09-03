from job_watcher.matcher import score_job
from job_watcher.models import RawJob


RULES = {
    "candidate": {
        "us_only": True,
        "minimum_match_score": 55,
    },
    "positive_keywords": {
        "engineering": ["software engineer", "member of technical staff"],
        "new_grad": ["new grad", "2026 graduate"],
        "early_career": ["entry level", "member of technical staff", "software engineer i"],
        "start_date": ["early 2027"],
    },
    "weights": {
        "engineering_title": 30,
        "new_grad_title": 45,
        "early_career_title": 35,
        "new_grad_description": 25,
        "graduation_or_start_year": 20,
        "zero_to_two_years": 20,
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


def test_software_engineer_ii_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer II",
        official_url="https://example.com",
        location="Austin, TX",
        description="Looking for mid-level engineer.",
    )
    score, reasons = score_job(job, RULES)
    assert score == 0
    assert "Excluded non-entry level in title" in reasons[0]


def test_three_plus_years_experience_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer",
        official_url="https://example.com",
        location="New York, NY",
        description="Requires 3+ years of non-internship experience in C++ and distributed systems.",
    )
    score, reasons = score_job(job, RULES)
    assert score == 0
    assert "Requires 1+ years professional experience beyond New Grad - excluded" in reasons[0] or "Title lacks explicit New Grad" in reasons[0]


def test_non_us_location_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="London, UK",
    )
    score, reasons = score_job(job, RULES)
    assert score == 0
    assert "Non-US location excluded" in reasons[0]


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


def test_bucharest_and_barcelona_locations_are_rejected():
    job_buchar = RawJob(
        source_id="1",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="Bucharest, Romania",
    )
    job_barca = RawJob(
        source_id="2",
        title="Software Engineer, New Grad",
        official_url="https://example.com",
        location="Barcelona, Spain",
    )
    score1, reasons1 = score_job(job_buchar, RULES)
    score2, reasons2 = score_job(job_barca, RULES)
    assert score1 == 0.0
    assert "Non-US location excluded" in reasons1
    assert score2 == 0.0
    assert "Non-US location excluded" in reasons2


def test_title_without_explicit_early_career_designation_is_rejected():
    job = RawJob(
        source_id="1",
        title="Software Engineer",
        official_url="https://example.com",
        location="San Francisco, CA",
        description="Standard role for entry level hires.",
    )
    score, reasons = score_job(job, RULES)
    assert score == 0.0
    assert "Title lacks explicit New Grad / Early Career / Entry Level / MTS designation" in reasons[0]


def test_member_of_technical_staff_is_accepted_and_generic_sde1_with_experience_is_rejected():
    job_mts = RawJob(
        source_id="1",
        title="Member of Technical Staff",
        official_url="https://example.com",
        location="San Francisco, CA",
        description="Software engineer position for early career hires.",
    )
    job_sde1 = RawJob(
        source_id="2",
        title="Software Engineer I",
        official_url="https://example.com",
        location="Seattle, WA",
        description="Requires 1+ years of non-internship professional experience.",
    )
    score1, _ = score_job(job_mts, RULES)
    score2, _ = score_job(job_sde1, RULES)
    assert score1 >= 55
    assert score2 == 0.0


def test_phd_titles_are_rejected():
    job_phd = RawJob(
        source_id="1",
        title="Software Engineer, PhD, Early Career",
        official_url="https://example.com",
        location="Mountain View, CA",
        description="PhD early career role",
    )
    score, reasons = score_job(job_phd, RULES)
    assert score == 0.0
    assert "Excluded non-entry level in title" in reasons[0]

