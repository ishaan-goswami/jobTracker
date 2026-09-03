from datetime import datetime, timezone
from pathlib import Path

from .storage import write_json

HISTORICAL_OBSERVATIONS = [
    {
        "company_id": "doordash",
        "company_name": "DoorDash",
        "expected_opening_date": "Sept 8 – Sept 10, 2026",
        "expected_opening_window": "Next Week (Early Sept)",
        "historical_cycle": "DoorDash SWE New Grad roles open in early September.",
        "confidence": "Confirmed / Very High",
        "typical_opening_month": 9,
    },
    {
        "company_id": "figma",
        "company_name": "Figma",
        "expected_opening_date": "Sept 14, 2026",
        "expected_opening_window": "Mid September",
        "historical_cycle": "Figma University / New Grad roles open mid-September.",
        "confidence": "Confirmed / Very High",
        "typical_opening_month": 9,
    },
    {
        "company_id": "google",
        "company_name": "Google",
        "expected_opening_date": "Sept 8 – Sept 20, 2026",
        "expected_opening_window": "September 2026",
        "historical_cycle": "Dec 2026 Grad / 2027 Early Career SWE postings open early autumn.",
        "confidence": "High",
        "typical_opening_month": 9,
    },
    {
        "company_id": "meta",
        "company_name": "Meta",
        "expected_opening_date": "Sept 8 – Oct 1, 2026",
        "expected_opening_window": "September – October",
        "historical_cycle": "University Graduate roles open early September.",
        "confidence": "High",
        "typical_opening_month": 9,
    },
    {
        "company_id": "stripe",
        "company_name": "Stripe",
        "expected_opening_date": "Sept 15 – Sept 30, 2026",
        "expected_opening_window": "Mid-Late September",
        "historical_cycle": "New grad postings traditionally open mid-September.",
        "confidence": "High",
        "typical_opening_month": 9,
    },
    {
        "company_id": "openai",
        "company_name": "OpenAI",
        "expected_opening_date": "Sept 15 – Oct 15, 2026",
        "expected_opening_window": "September – October",
        "historical_cycle": "Early career positions open in Q3/Q4.",
        "confidence": "Medium",
        "typical_opening_month": 9,
    },
    {
        "company_id": "amazon",
        "company_name": "Amazon",
        "expected_opening_date": "Active / Rolling",
        "expected_opening_window": "Currently Open",
        "historical_cycle": "SDE I & University Graduate positions posted continuously.",
        "confidence": "Active",
        "typical_opening_month": 9,
    },
    {
        "company_id": "databricks",
        "company_name": "Databricks",
        "expected_opening_date": "Active / Rolling",
        "expected_opening_window": "Currently Open",
        "historical_cycle": "University recruiting opens early autumn.",
        "confidence": "Active",
        "typical_opening_month": 9,
    },
]


def generate_forecasts(data_dir: Path) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    results = []
    for item in HISTORICAL_OBSERVATIONS:
        results.append({
            "company_id": item["company_id"],
            "company_name": item["company_name"],
            "expected_opening_date": item["expected_opening_date"],
            "expected_opening_window": item["expected_opening_window"],
            "historical_cycle": item["historical_cycle"],
            "confidence": item["confidence"],
            "last_updated": now,
        })
    write_json(data_dir / "forecasts.json", results)
    return results
