from datetime import datetime, timezone
from pathlib import Path

from .storage import read_json, write_json

HISTORICAL_OBSERVATIONS = [
    {
        "company_id": "doordash",
        "company_name": "DoorDash",
        "expected_opening_date": "Sept 8 – Sept 10, 2026",
        "target_start_date": "2026-09-08",
        "target_end_date": "2026-09-10",
        "expected_opening_window": "Next Week (Early Sept)",
        "historical_cycle": "DoorDash SWE New Grad roles open early September.",
        "confidence": "Confirmed / Very High",
    },
    {
        "company_id": "figma",
        "company_name": "Figma",
        "expected_opening_date": "Sept 14, 2026",
        "target_start_date": "2026-09-14",
        "target_end_date": "2026-09-14",
        "expected_opening_window": "Mid September",
        "historical_cycle": "Figma University / New Grad roles open mid-September.",
        "confidence": "Confirmed / Very High",
    },
    {
        "company_id": "google",
        "company_name": "Google",
        "expected_opening_date": "Sept 8 – Sept 20, 2026",
        "target_start_date": "2026-09-08",
        "target_end_date": "2026-09-20",
        "expected_opening_window": "September 2026",
        "historical_cycle": "Dec 2026 Grad / 2027 Early Career SWE postings.",
        "confidence": "High",
    },
    {
        "company_id": "meta",
        "company_name": "Meta",
        "expected_opening_date": "Sept 8 – Oct 1, 2026",
        "target_start_date": "2026-09-08",
        "target_end_date": "2026-10-01",
        "expected_opening_window": "September – October",
        "historical_cycle": "University Graduate roles open early September.",
        "confidence": "High",
    },
    {
        "company_id": "stripe",
        "company_name": "Stripe",
        "expected_opening_date": "Sept 15 – Sept 25, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-09-25",
        "expected_opening_window": "September 2026",
        "historical_cycle": "Stripe new-grad and early career positions.",
        "confidence": "High",
    },
    {
        "company_id": "openai",
        "company_name": "OpenAI",
        "expected_opening_date": "Sept 15 – Oct 15, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-10-15",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "OpenAI early career positions.",
        "confidence": "Medium",
    },
    {
        "company_id": "anthropic",
        "company_name": "Anthropic",
        "expected_opening_date": "Sept 15 – Oct 15, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-10-15",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "Anthropic early career positions.",
        "confidence": "Medium",
    },
    {
        "company_id": "amazon",
        "company_name": "Amazon",
        "expected_opening_date": "Active / Rolling",
        "target_start_date": "2026-09-01",
        "target_end_date": "2026-12-31",
        "expected_opening_window": "Currently Open",
        "historical_cycle": "SDE I & University Graduate positions posted continuously.",
        "confidence": "Active",
    },
    {
        "company_id": "databricks",
        "company_name": "Databricks",
        "expected_opening_date": "Sept 15 – Oct 15, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-10-15",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "University recruiting opens early autumn.",
        "confidence": "Medium",
    },
    {
        "company_id": "uber",
        "company_name": "Uber",
        "expected_opening_date": "Sept 10 – Sept 25, 2026",
        "target_start_date": "2026-09-10",
        "target_end_date": "2026-09-25",
        "expected_opening_window": "Early Autumn",
        "historical_cycle": "Uber University / Early Career roles.",
        "confidence": "High",
    },
    {
        "company_id": "linkedin",
        "company_name": "LinkedIn",
        "expected_opening_date": "Sept 15 – Oct 10, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-10-10",
        "expected_opening_window": "Early Autumn",
        "historical_cycle": "LinkedIn Entry-level / New Grad SWE roles.",
        "confidence": "High",
    },
    {
        "company_id": "hubspot",
        "company_name": "HubSpot",
        "expected_opening_date": "Sept 10 – Sept 25, 2026",
        "target_start_date": "2026-09-10",
        "target_end_date": "2026-09-25",
        "expected_opening_window": "Early Autumn",
        "historical_cycle": "HubSpot Graduate Software Engineering roles.",
        "confidence": "High",
    },
    {
        "company_id": "ramp",
        "company_name": "Ramp",
        "expected_opening_date": "Sept 15 – Oct 15, 2026",
        "target_start_date": "2026-09-15",
        "target_end_date": "2026-10-15",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "Ramp New Grad / Early Career engineering roles.",
        "confidence": "Medium",
    },
    {
        "company_id": "tiktok",
        "company_name": "TikTok",
        "expected_opening_date": "Sept 12 – Oct 5, 2026",
        "target_start_date": "2026-09-12",
        "target_end_date": "2026-10-05",
        "expected_opening_window": "Early Autumn",
        "historical_cycle": "TikTok Early Career / Campus recruitment.",
        "confidence": "High",
    },
    {
        "company_id": "netflix",
        "company_name": "Netflix",
        "expected_opening_date": "Sept 20 – Nov 1, 2026",
        "target_start_date": "2026-09-20",
        "target_end_date": "2026-11-01",
        "expected_opening_window": "Autumn Window",
        "historical_cycle": "Netflix New Grad & Early Career roles.",
        "confidence": "Medium",
    },
    {
        "company_id": "millennium-management",
        "company_name": "Millennium Management",
        "expected_opening_date": "Sept 10 – Oct 15, 2026",
        "target_start_date": "2026-09-10",
        "target_end_date": "2026-10-15",
        "expected_opening_window": "Early Autumn",
        "historical_cycle": "Millennium Quantitative & SWE Campus hiring.",
        "confidence": "Medium",
    },
    {
        "company_id": "bloomberg",
        "company_name": "Bloomberg",
        "expected_opening_date": "Sept 8 – Sept 15, 2026",
        "target_start_date": "2026-09-08",
        "target_end_date": "2026-09-15",
        "expected_opening_window": "Early September",
        "historical_cycle": "Bloomberg Software Engineer (New Grad) roles open early September.",
        "confidence": "Confirmed / Very High",
    },
]


def calculate_countdown(target_start_str: str | None, target_end_str: str | None, is_active: bool) -> dict:
    if is_active:
        return {
            "days_until_start": 0,
            "days_until_end": 0,
            "status_label": "🟢 OPEN NOW",
            "countdown_text": "Currently Open & Active",
        }
    if not target_start_str:
        return {
            "days_until_start": None,
            "days_until_end": None,
            "status_label": "Date TBD",
            "countdown_text": "Date TBD",
        }
    
    today = datetime.now(timezone.utc).date()
    try:
        start_date = datetime.strptime(target_start_str, "%Y-%m-%d").date()
        end_date = datetime.strptime(target_end_str or target_start_str, "%Y-%m-%d").date()
    except ValueError:
        return {
            "days_until_start": None,
            "days_until_end": None,
            "status_label": "Date TBD",
            "countdown_text": "Date TBD",
        }

    diff_start = (start_date - today).days
    diff_end = (end_date - today).days

    if diff_start <= 0 and diff_end >= 0:
        label = "⚡ Window Active Now"
        text = f"Expected any day (within {diff_end} day{'s' if diff_end != 1 else ''})"
    elif diff_start > 0:
        if diff_start == diff_end:
            label = f"⏳ Opens in ~{diff_start} days"
            text = f"Estimated opening in {diff_start} day{'s' if diff_start != 1 else ''}"
        else:
            label = f"⏳ Opens in ~{diff_start}–{diff_end} days"
            text = f"Estimated opening in {diff_start}–{diff_end} days"
    else:
        label = "⚠️ Overdue / Imminent"
        text = "Expected to open any day"
        
    return {
        "days_until_start": diff_start,
        "days_until_end": diff_end,
        "status_label": label,
        "countdown_text": text,
    }


def generate_forecasts(data_dir: Path) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    jobs = read_json(data_dir / "jobs.json", [])
    open_companies = {j.get("company_id") for j in jobs if j.get("is_open", True)}

    results = []
    for item in HISTORICAL_OBSERVATIONS:
        cid = item["company_id"]
        is_active = cid in open_companies
        
        countdown_info = calculate_countdown(
            item.get("target_start_date"),
            item.get("target_end_date"),
            is_active,
        )

        results.append({
            "company_id": cid,
            "company_name": item["company_name"],
            "expected_opening_date": "🟢 Currently Open / Active" if is_active else item["expected_opening_date"],
            "target_start_date": item.get("target_start_date"),
            "target_end_date": item.get("target_end_date"),
            "days_until_start": countdown_info["days_until_start"],
            "days_until_end": countdown_info["days_until_end"],
            "status_label": countdown_info["status_label"],
            "countdown_text": countdown_info["countdown_text"],
            "expected_opening_window": "Open Now" if is_active else item["expected_opening_window"],
            "historical_cycle": item["historical_cycle"],
            "confidence": "Active / Discovered" if is_active else item["confidence"],
            "last_updated": now,
        })
    write_json(data_dir / "forecasts.json", results)
    docs_forecasts = data_dir.parent / "docs" / "data" / "forecasts.json"
    if docs_forecasts.parent.exists():
        write_json(docs_forecasts, results)
    return results

