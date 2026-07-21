from pathlib import Path
import yaml

from .models import CompanyConfig


ROOT = Path(__file__).resolve().parents[2]


def load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def companies(path: Path | None = None) -> list[CompanyConfig]:
    content = load_yaml(path or ROOT / "config" / "companies.yaml")
    return [CompanyConfig.model_validate(item) for item in content.get("companies", [])]


def filters(path: Path | None = None) -> dict:
    return load_yaml(path or ROOT / "config" / "filters.yaml")
