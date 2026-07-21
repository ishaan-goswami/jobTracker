"""Fail a Pages build if private artifacts are copied into docs/."""
from pathlib import Path
import sys

PRIVATE_PARTS = {"private", "resumes", "referrals", "generated"}
PRIVATE_SUFFIXES = {".tex", ".diff", ".env", ".pem", ".key"}
for path in Path("docs").rglob("*"):
    if not path.is_file():
        continue
    if PRIVATE_PARTS.intersection(path.parts) or path.suffix.lower() in PRIVATE_SUFFIXES:
        print(f"Private data is not permitted in GitHub Pages: {path}", file=sys.stderr)
        raise SystemExit(1)
print("Pages privacy validation passed.")
