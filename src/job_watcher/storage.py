import json
from pathlib import Path
from typing import Any


def read_json(path: Path, default: Any) -> Any:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, default=str) + "\n", encoding="utf-8")


def upsert_jobs(path: Path, jobs: list[dict]) -> list[dict]:
    existing = {job["fingerprint"]: job for job in read_json(path, [])}
    newly_seen = []
    for job in jobs:
        if job["fingerprint"] not in existing:
            newly_seen.append(job)
        existing[job["fingerprint"]] = job
    write_json(path, sorted(existing.values(), key=lambda item: item["last_seen_at"], reverse=True))
    return newly_seen
