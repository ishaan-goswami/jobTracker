import argparse
from pathlib import Path

import yaml

from .monitor import run
from .notifier import send_discord
from .referrals import draft
from .resume import tailor


def main() -> None:
    parser = argparse.ArgumentParser(description="New Grad Job Watcher")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("monitor")
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
