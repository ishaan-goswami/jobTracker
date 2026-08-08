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


def save_companies(company_list: list[CompanyConfig], path: Path | None = None) -> None:
    target = path or ROOT / "config" / "companies.yaml"
    data = {"companies": [c.model_dump() for c in company_list]}
    with target.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(data, handle, sort_keys=False)


def add_company(
    company_id: str,
    name: str,
    careers_url: str,
    source_type: str = "unsupported",
    source_identifier: str = "",
    enabled: bool = True,
    path: Path | None = None,
) -> CompanyConfig:
    current = companies(path)
    for c in current:
        if c.id == company_id:
            c.name = name
            c.careers_url = careers_url
            c.source_type = source_type
            c.source_identifier = source_identifier
            c.enabled = enabled
            save_companies(current, path)
            return c

    new_comp = CompanyConfig(
        id=company_id,
        name=name,
        careers_url=careers_url,
        source_type=source_type,
        source_identifier=source_identifier,
        enabled=enabled,
    )
    current.append(new_comp)
    save_companies(current, path)
    return new_comp


def toggle_company(company_id: str, enabled: bool, path: Path | None = None) -> bool:
    current = companies(path)
    found = False
    for c in current:
        if c.id == company_id:
            c.enabled = enabled
            found = True
            break
    if found:
        save_companies(current, path)
    return found


def filters(path: Path | None = None) -> dict:
    return load_yaml(path or ROOT / "config" / "filters.yaml")
