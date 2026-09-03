import re

from .models import RawJob

NON_US_COUNTRY_TOKENS = {
    "australia", "aus", "canada", "can", "india", "ind", "uk", "japan", "jpn",
    "singapore", "sgp", "germany", "deu", "france", "fra", "ireland", "irl",
    "netherlands", "nld", "spain", "esp", "israel", "isr", "brazil", "bra",
    "mexico", "mex", "china", "chn", "hong kong", "hkg", "poland", "pol",
    "switzerland", "che", "sweden", "swe", "nzl", "new zealand"
}

NON_US_CITY_TERMS = [
    "sydney", "melbourne", "brisbane", "toronto", "vancouver", "montreal",
    "bengaluru", "bangalore", "hyderabad", "pune", "gurgaon", "noida", "mumbai",
    "delhi", "chennai", "london", "dublin", "tokyo", "berlin", "munich",
    "amsterdam", "zurich", "paris", "tel aviv", "beijing", "shanghai", "shenzhen",
    "sao paulo", "mexico city", "warsaw", "krakow", "stockholm"
]


def is_us_location(location: str | None) -> bool:
    if not location:
        return True
    loc_lower = location.lower().strip()
    tokens = [t.strip(",. ") for t in loc_lower.split()]
    for token in tokens:
        if token in NON_US_COUNTRY_TOKENS:
            return False
    for city in NON_US_CITY_TERMS:
        if city in loc_lower:
            return False
    return True


def _contains(text: str, terms: list[str]) -> bool:
    return any(term.lower() in text for term in terms)


EXCLUDED_TITLE_TOKENS = [
    "senior", "sr.", "sr ", "staff software engineer", "staff engineer", "senior staff", "principal staff",
    "principal", "lead", "manager", "director", "architect",
    "software engineer ii", "software engineer 2", "software engineer iii", "software engineer 3",
    "software engineer iv", "software engineer 4", "sde ii", "sde 2", "sde iii", "sde 3",
    "swe ii", "swe 2", "swe iii", "swe 3", "engineer ii", "engineer 2", "engineer iii", "engineer 3"
]

INTERN_TITLE_TOKENS = ["intern", "internship", "co-op", "coop"]


def score_job(job: RawJob, rules: dict) -> tuple[float, list[str]]:
    # 1. Location Check
    us_only = rules.get("candidate", {}).get("us_only", True)
    if us_only and not is_us_location(job.location):
        return 0.0, ["Non-US location excluded"]

    title = job.title.lower().strip()
    description = (job.description or "").lower().strip()
    all_text = f"{title}\n{description}"

    # 2. Strict Title Level Check
    for token in EXCLUDED_TITLE_TOKENS:
        if token in title:
            return 0.0, [f"Excluded non-entry level in title: '{token}'"]

    # 3. Internship Title Check (User target is full-time 2027 start)
    for token in INTERN_TITLE_TOKENS:
        if token in title:
            return 0.0, [f"Internship title excluded: '{token}'"]

    # 4. Strict 3+ Years Experience Rejection in Description
    if re.search(r"\b([3-9]|[1-9][0-9])\+?\s*(?:-\s*\d+)?\s*years?(?:\s+of)?(?:\s+non-internship|\s+professional|\s+relevant|\s+work)?\s+experience\b", description):
        return 0.0, ["Requires 3+ years experience - excluded for New Grad"]

    if re.search(r"\bminimum\s+(?:of\s+)?([3-9]|[1-9][0-9])\s+years\b", description):
        return 0.0, ["Requires 3+ minimum years experience - excluded for New Grad"]

    keywords = rules["positive_keywords"]
    weights = rules["weights"]
    score = 0.0
    reasons = []

    if us_only and job.location:
        reasons.append("United States location")

    if _contains(title, keywords["engineering"]):
        score += weights["engineering_title"]
        reasons.append("Relevant software-engineering title")
    else:
        score += weights["non_engineering"]
        reasons.append("No relevant software-engineering title")

    if _contains(title, keywords["new_grad"]):
        score += weights["new_grad_title"]
        reasons.append("Explicit new-graduate title")
    elif _contains(title, keywords["early_career"]):
        score += weights["early_career_title"]
        reasons.append("Early-career title")

    if _contains(description, keywords["new_grad"] + keywords["early_career"]):
        score += weights["new_grad_description"]
        reasons.append("Early-career wording in description")

    if _contains(all_text, keywords["start_date"]) or re.search(
        r"\b(2026|2027)\s+(graduate|grad)\b", all_text
    ):
        score += weights["graduation_or_start_year"]
        reasons.append("Matches December 2026 / 2027 start timing")

    if re.search(r"(?:0|1|2)\s*(?:-|to)?\s*(?:2)?\s*years?(?: of experience)?", description):
        score += weights["zero_to_two_years"]
        reasons.append("0–2 years experience")

    return max(0, min(100, score)), reasons
