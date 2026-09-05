from pathlib import Path
from job_watcher.forecast import calculate_countdown, generate_forecasts

def test_calculate_countdown_active():
    res = calculate_countdown("2026-09-08", "2026-09-10", is_active=True)
    assert res["days_until_start"] == 0
    assert res["status_label"] == "🟢 OPEN NOW"


def test_calculate_countdown_future():
    res = calculate_countdown("2026-09-15", "2026-09-25", is_active=False)
    assert res["days_until_start"] is not None
    assert "Opens in" in res["status_label"] or "Window" in res["status_label"]


def test_generate_forecasts(tmp_path: Path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    docs_dir = tmp_path / "docs" / "data"
    docs_dir.mkdir(parents=True)
    
    # write sample jobs.json
    (data_dir / "jobs.json").write_text('[{"company_id": "google", "is_open": true}]', encoding="utf-8")

    forecasts = generate_forecasts(data_dir)
    assert len(forecasts) == 17
    
    google_item = next(f for f in forecasts if f["company_id"] == "google")
    assert google_item["status_label"] == "🟢 OPEN NOW"
