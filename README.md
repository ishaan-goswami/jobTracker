# New Grad Job Watcher

Privacy-safe monitoring for full-time software-engineering roles suitable for a December 2026 graduate beginning in early 2027. It explicitly does **not** target Class of 2028 roles.

## What is public vs. private

Public GitHub Pages data is limited to public company/job details, check status, verified history, and aggregate forecasts. Résumés, tailored output, referral contacts, outreach notes, and notification credentials are excluded by `.gitignore` and the Pages privacy gate.

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e '.[dev]'
job-watcher monitor
pytest && ruff check .
```

Configure companies in `config/companies.yaml` and matching/candidate timing in `config/filters.yaml`. The scheduled GitHub Actions workflow checks enabled companies every six hours.

Source status rules:

- `success`: a supported source schema was parsed. Zero jobs is valid only when the structured source reports zero records.
- `partial`: the URL loaded but access was blocked, no reliable job structure was found, or some records failed parsing.
- `failed`: DNS failure, timeout, invalid config, malformed response, or total source failure.
- `unsupported`: no reliable official public adapter is configured.

Operational sources currently verified:

- Ramp: Ashby public job board API, board `ramp`.
- HubSpot: Greenhouse public job board API, board `hubspotjobs`.
- Stripe: Greenhouse public job board API, board `stripe`.

OpenAI, DoorDash, Uber, Millennium Management, and other unverified companies are marked `unsupported` until a legitimate official structured source is verified. The monitor does not bypass 403/406 responses, CAPTCHAs, authentication, or platform restrictions.

Diagnostics:

```bash
job-watcher diagnose
job-watcher diagnose --company ramp
JOB_WATCHER_LIVE_SOURCE_TESTS=1 pytest tests/test_sources.py
```

## Discord notifications

Create a private Discord channel webhook and add its full URL as repository secret `DISCORD_WEBHOOK_URL`. Never place it in YAML, `.env.example`, public job JSON, or `docs/`. The monitor sends only newly discovered matching job fingerprints.

## Résumé tailoring — local only

The public dashboard includes a browser-only analysis panel. Pasted LaTeX is processed in memory by your browser and is not stored in `docs/data`, uploaded to GitHub, or committed.

Do not commit a résumé. Put it anywhere outside this repository (or in ignored `private/`) and run:

```bash
job-watcher tailor-resume --tex ~/resume.tex --job-slug linkedin-new-grad-swe --job-description-file job.txt
```

Output is written under ignored `generated/resumes/<job-slug>/`: `tailored_resume.tex`, `changes.diff`, and `analysis.json`. The MVP is intentionally conservative: it does not call an AI service, does not alter claims, and flags requirements with no résumé evidence. It never overwrites your original source. Local TeX dependencies remain local; compile with your normal TeX tooling if needed.

## Referrals — local only

Store referral tracking in ignored `private/referrals.json` or another private system. `config/referrals.example.json` documents the public-safe schema without real contacts. Use the documented statuses in the dashboard. The project provides local draft templates only; it does not scrape LinkedIn, send messages, or make connection requests.

```bash
job-watcher draft-referral-message \
  --kind referral \
  --recipient-name Alex \
  --facts "I saw the early-career software engineer role on your careers page."
```

## Forecasts

Forecasts will be emitted only after verified full-time new-grad observations exist. They must show source links, observation count, method, confidence, company-specific versus industry-seasonality basis, and separate opening/interview/closing/start windows. Internships are never blended into full-time signals.

## Deployment

Push to `main`, then enable GitHub Pages with **GitHub Actions** as its source in repository settings. `deploy-pages.yml` publishes `docs/` only after the privacy validation passes. The monitor workflow may commit changed public data; use `git revert <commit>` to roll back a public-data or workflow regression.
