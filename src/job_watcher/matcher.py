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


def score_job(job: RawJob, rules: dict) -> tuple[float, list[str]]:
    us_only = rules.get("candidate", {}).get("us_only", True)
    if us_only and not is_us_location(job.location):
        return 0.0, ["Non-US location excluded"]

    title, description = job.title.lower(), (job.description or "").lower()
    all_text = f"{title}\n{description}"
    keywords, weights = rules["positive_keywords"], rules["weights"]
    score, reasons = 0.0, []

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
    elif re.search(r"\b3\+?\s+years?", description):
        score += weights["three_years"]
        reasons.append("Three years experience")
    if _contains(
        title, ["senior", "staff", "principal", "lead", "manager", "director", "architect"]
    ):
        score += weights["senior_title"]
        reasons.append("Senior indicator in title")
    if _contains(title, ["intern", "internship"]):
        score += weights["internship_title"]
        reasons.append("Internship title")
    if re.search(r"\b(?:4|5|6|7|8|9|[1-9][0-9])\+?\s+years?", description):
        score += weights["four_plus_years"]
        reasons.append("Four or more years required")
    return max(0, min(100, score)), reasons
