import re

from .models import RawJob

NON_US_COUNTRY_TOKENS = {
    "australia", "aus", "canada", "can", "india", "ind", "uk", "united kingdom", "japan", "jpn",
    "singapore", "sgp", "germany", "deu", "france", "fra", "ireland", "irl",
    "netherlands", "nld", "spain", "esp", "israel", "isr", "brazil", "bra",
    "mexico", "mex", "china", "chn", "hong kong", "hkg", "poland", "pol",
    "switzerland", "che", "sweden", "swe", "nzl", "new zealand", "philippines", "phl",
    "italy", "ita", "portugal", "prt", "romania", "rou", "czechia", "cze", "austria", "aut",
    "emea", "apac", "latam", "europe", "asia", "ukraine", "ukr", "taiwan", "twn"
}

NON_US_CITY_TERMS = [
    "sydney", "melbourne", "brisbane", "perth", "adelaide",
    "toronto", "vancouver", "montreal", "calgary", "ottawa",
    "bengaluru", "bangalore", "hyderabad", "pune", "gurgaon", "noida", "mumbai", "delhi", "chennai", "kolkata",
    "london", "manchester", "edinburgh", "dublin", "cork",
    "tokyo", "osaka", "berlin", "munich", "frankfurt", "hamburg",
    "amsterdam", "rotterdam", "zurich", "geneva", "paris", "lyon",
    "tel aviv", "beijing", "shanghai", "shenzhen", "hangzhou",
    "sao paulo", "rio de janeiro", "mexico city", "guadalajara",
    "warsaw", "krakow", "wroclaw", "stockholm", "gothenburg", "copenhagen", "helsinki", "oslo",
    "manila", "buenos aires", "santiago", "bogota", "singapore",
    "bucharest", "barcelona", "madrid"
]

US_STATE_CODES = {
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky",
    "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd",
    "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
}


def is_us_location(location: str | None) -> bool:
    if not location:
        return True
    loc_lower = location.lower().strip()
    
    tokens = [t.strip(",.() ") for t in loc_lower.split()]
    for token in tokens:
        if token in NON_US_COUNTRY_TOKENS:
            return False
            
    for city in NON_US_CITY_TERMS:
        if city in loc_lower:
            return False

    if any(us_marker in loc_lower for us_marker in ["united states", "usa", "us", "u.s.", "remote - us", "remote, us"]):
        return True

    for token in tokens:
        if token in US_STATE_CODES:
            return True

    return True


def _contains(text: str, terms: list[str]) -> bool:
    for term in terms:
        t = term.lower().strip()
        if not t:
            continue
        pattern = r"\b" + re.escape(t) + r"\b"
        if re.search(pattern, text):
            return True
    return False


EXCLUDED_TITLE_TOKENS = [
    "senior", "sr.", "sr ", "staff software engineer", "staff engineer", "senior staff", "principal staff",
    "principal", "lead", "manager", "director", "architect",
    "software engineer ii", "software engineer 2", "software engineer iii", "software engineer 3",
    "software engineer iv", "software engineer 4", "sde ii", "sde 2", "sde iii", "sde 3",
    "swe ii", "swe 2", "swe iii", "swe 3", "engineer ii", "engineer 2", "engineer iii", "engineer 3"
]

INTERN_TITLE_TOKENS = ["intern", "internship", "co-op", "coop"]

EXPLICIT_EARLY_CAREER_TITLE_KEYWORDS = [
    "new grad", "new graduate", "university graduate", "university grad", "recent graduate",
    "2027 graduate", "class of 2027", "2026 graduate", "class of 2026",
    "early career", "early-career", "early talent", "entry level", "entry-level",
    "software engineer i", "software engineer 1", "sde i", "sde 1", "swe i", "swe 1",
    "associate software engineer", "associate engineer", "graduate software engineer",
    "campus", "emerging talent", "member of technical staff", "mts"
]


def score_job(job: RawJob, rules: dict) -> tuple[float, list[str]]:
    # 1. Strict US Location Check
    us_only = rules.get("candidate", {}).get("us_only", True)
    if us_only and not is_us_location(job.location):
        return 0.0, ["Non-US location excluded"]

    title = job.title.lower().strip()
    description = (job.description or "").lower().strip()
    all_text = f"{title}\n{description}"

    # 2. Strict Title Level Check (Reject Sr, Engineer II/3/4)
    for token in EXCLUDED_TITLE_TOKENS:
        if token in title:
            return 0.0, [f"Excluded non-entry level in title: '{token}'"]

    # 3. Internship Title Check
    for token in INTERN_TITLE_TOKENS:
        if token in title:
            return 0.0, [f"Internship title excluded: '{token}'"]

    # 4. Strict Experience Rejection in Description
    if re.search(r"\b([2-9]|[1-9][0-9])\s*(?:-|–|\+)\s*(?:[0-9]+)?\+?\s*years?(?:\s+of)?(?:\s+industry|\s+non-internship|\s+professional|\s+relevant|\s+work)?\s+experience\b", description):
        return 0.0, ["Requires experience beyond New Grad - excluded"]

    if re.search(r"\bminimum\s+(?:of\s+)?([2-9]|[1-9][0-9])\s+years\b", description):
        return 0.0, ["Requires minimum years experience - excluded for New Grad"]

    # 5. MUST have explicit New Grad, Early Career, SDE 1, or Member of Technical Staff (MTS) in TITLE
    if not _contains(title, EXPLICIT_EARLY_CAREER_TITLE_KEYWORDS):
        return 0.0, ["Title lacks explicit New Grad / Early Career / SDE 1 / MTS designation"]

    keywords = rules["positive_keywords"]
    weights = rules["weights"]
    score = 0.0
    reasons = []

    if us_only and job.location:
        reasons.append("United States location")

    if _contains(title, keywords["engineering"]):
        score += weights["engineering_title"]
        reasons.append("Relevant software-engineering title")

    if _contains(title, keywords["new_grad"]):
        score += weights["new_grad_title"]
        reasons.append("Explicit new-graduate title")
    elif _contains(title, keywords["early_career"]):
        score += weights["early_career_title"]
        reasons.append("Early-career / MTS title")

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
