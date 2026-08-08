import argparse
from pathlib import Path

import httpx
import yaml

from .config import add_company, companies, toggle_company
from .forecast import generate_forecasts
from .monitor import run
from .notifier import send_discord
from .referrals import draft
from .resume import tailor
from .sources import SOURCES


def _diagnose(company_id: str | None) -> None:
    selected = [company for company in companies() if company.enabled]
    if company_id:
        selected = [company for company in selected if company.id == company_id]
    if not selected:
        raise SystemExit(f"No enabled company found for {company_id}")
    for company in selected:
        print(f"{company.id} ({company.name})")
        print(f"  configured source: {company.source_type}:{company.source_identifier or '-'}")
        print(f"  configured URL: {company.careers_url}")
        if company.source_type == "unsupported" or company.source_type not in SOURCES:
            print("  status: unsupported")
            print("  warning: No reliable official public source adapter is configured")
            continue
        try:
            result = SOURCES[company.source_type]().fetch_jobs(company)
            titles = [job.title for job in result.jobs[:5]]
            print(f"  HTTP status: {result.http_status}")
            print(f"  content type: {result.content_type}")
            print(f"  source URL: {result.source_url}")
            print(f"  records received: {result.records_received}")
            print(f"  records parsed: {result.records_parsed}")
            print(f"  parser version: {result.parser_version}")
            print(f"  sample job titles: {', '.join(titles) if titles else '-'}")
            print(f"  warning: {result.warning or '-'}")
            print(f"  errors: {'; '.join(result.partial_errors) if result.partial_errors else '-'}")
        except httpx.HTTPStatusError as exc:
            print(f"  HTTP status: {exc.response.status_code}")
            print(f"  content type: {exc.response.headers.get('content-type')}")
            print("  records received: 0")
            print("  records parsed: 0")
            print("  warning: Access blocked by the official source; not bypassed")
            print(f"  errors: {exc}")
        except Exception as exc:
            print("  HTTP status: -")
            print("  content type: -")
            print("  records received: 0")
            print("  records parsed: 0")
            print(f"  errors: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(description="New Grad Job Watcher")
    sub = parser.add_subparsers(dest="command", required=True)
    
    sub.add_parser("monitor")
    
    diagnose = sub.add_parser("diagnose")
    diagnose.add_argument("--company")
    
    add_comp = sub.add_parser("add-company")
    add_comp.add_argument("--id", required=True)
    add_comp.add_argument("--name", required=True)
    add_comp.add_argument("--careers-url", required=True)
    add_comp.add_argument("--source-type", default="unsupported")
    add_comp.add_argument("--source-identifier", default="")

    togg_comp = sub.add_parser("toggle-company")
    togg_comp.add_argument("--id", required=True)
    togg_comp.add_argument("--disable", action="store_true")

    sub.add_parser("generate-forecasts")

    resume = sub.add_parser("tailor-resume")
    resume.add_argument("--tex", type=Path, required=True)
    resume.add_argument("--job-slug", required=True)
    resume.add_argument("--job-description-file", type=Path, required=True)
    
    referral = sub.add_parser("draft-referral-message")
    referral.add_argument("--kind", default="connection")
    referral.add_argument("--candidate-profile", type=Path, default=Path("config/candidate_profile.example.yaml"))
    referral.add_argument("--recipient-name", required=True)
    referral.add_argument("--facts", default="")
    
    args = parser.parse_args()
    
    if args.command == "monitor":
        new_jobs = run()
        send_discord(new_jobs)
        print(f"Found {len(new_jobs)} new matching job(s).")
    elif args.command == "diagnose":
        _diagnose(args.company)
    elif args.command == "add-company":
        comp = add_company(
            company_id=args.id,
            name=args.name,
            careers_url=args.careers_url,
            source_type=args.source_type,
            source_identifier=args.source_identifier,
        )
        print(f"Added/updated company: {comp.name} ({comp.id})")
    elif args.command == "toggle-company":
        enabled = not args.disable
        ok = toggle_company(args.id, enabled)
        if ok:
            print(f"Set {args.id} enabled={enabled}")
        else:
            print(f"Company {args.id} not found.")
    elif args.command == "generate-forecasts":
        data_dir = Path("data")
        results = generate_forecasts(data_dir)
        print(f"Generated {len(results)} forecast record(s).")
    elif args.command == "tailor-resume":
        destination = tailor(
            args.tex, args.job_slug, args.job_description_file.read_text(encoding="utf-8")
        )
        print(f"Wrote local-only artifacts to {destination}")
    else:
        candidate = yaml.safe_load(args.candidate_profile.read_text(encoding="utf-8")) or {}
        print(draft(args.kind, candidate, args.recipient_name, args.facts))


if __name__ == "__main__":
    main()
