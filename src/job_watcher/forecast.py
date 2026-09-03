from datetime import datetime, timezone
from pathlib import Path

from .storage import read_json, write_json

HISTORICAL_OBSERVATIONS = [
    {
        "company_id": "doordash",
        "company_name": "DoorDash",
        "expected_opening_date": "Sept 8 – Sept 10, 2026",
        "expected_opening_window": "Next Week (Early Sept)",
        "historical_cycle": "DoorDash SWE New Grad roles open early September.",
        "confidence": "Confirmed / Very High",
    },
    {
        "company_id": "figma",
        "company_name": "Figma",
        "expected_opening_date": "Sept 14, 2026",
        "expected_opening_window": "Mid September",
        "historical_cycle": "Figma University / New Grad roles open mid-September.",
        "confidence": "Confirmed / Very High",
    },
    {
        "company_id": "stripe",
        "company_name": "Stripe",
        "expected_opening_date": "Mid-Late September",
        "expected_opening_window": "September 2026",
        "historical_cycle": "Stripe new-grad and early career positions.",
        "confidence": "High",
    },
    {
        "company_id": "openai",
        "company_name": "OpenAI",
        "expected_opening_date": "September – October",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "OpenAI early career positions.",
        "confidence": "Medium",
    },
    {
        "company_id": "anthropic",
        "company_name": "Anthropic",
        "expected_opening_date": "September – October",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "Anthropic early career positions.",
        "confidence": "Medium",
    },
    {
        "company_id": "google",
        "company_name": "Google",
        "expected_opening_date": "Sept 8 – Sept 20, 2026",
        "expected_opening_window": "September 2026",
        "historical_cycle": "Dec 2026 Grad / 2027 Early Career SWE postings.",
        "confidence": "High",
    },
    {
        "company_id": "meta",
        "company_name": "Meta",
        "expected_opening_date": "Sept 8 – Oct 1, 2026",
        "expected_opening_window": "September – October",
        "historical_cycle": "University Graduate roles open early September.",
        "confidence": "High",
    },
    {
        "company_id": "amazon",
        "company_name": "Amazon",
        "expected_opening_date": "Active / Rolling",
        "expected_opening_window": "Currently Open",
        "historical_cycle": "SDE I & University Graduate positions posted continuously.",
        "confidence": "Active",
    },
    {
        "company_id": "databricks",
        "company_name": "Databricks",
        "expected_opening_date": "September – October",
        "expected_opening_window": "Q3/Q4 2026",
        "historical_cycle": "University recruiting opens early autumn.",
        "confidence": "Medium",
    },
]


def generate_forecasts(data_dir: Path) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    jobs = read_json(data_dir / "jobs.json", [])
    open_companies = {j.get("company_id") for j in jobs if j.get("is_open", True)}

    results = []
    for item in HISTORICAL_OBSERVATIONS:
        cid = item["company_id"]
        is_active = cid in open_companies
        
        results.append({
            "company_id": cid,
            "company_name": item["company_name"],
            "expected_opening_date": "🟢 Currently Open / Active" if is_active else item["expected_opening_date"],
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
