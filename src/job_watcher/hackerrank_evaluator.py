from __future__ import annotations

import re
import httpx
from typing import Any


def extract_github_username(text: str) -> str | None:
    if not text:
        return None
    patterns = [
        r"https?://github\.com/([a-zA-Z0-9_-]+)",
        r"github\.com/([a-zA-Z0-9_-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            username = match.group(1).strip()
            if username.lower() not in {"settings", "features", "pulls", "issues", "notifications"}:
                return username
    return None


def fetch_github_summary(username: str) -> dict[str, Any]:
    if not username:
        return {"has_github": False, "public_repos": 0, "open_source_count": 0, "self_projects_count": 0, "total_stars": 0}
    try:
        url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=30"
        response = httpx.get(url, headers={"User-Agent": "NewGradJobWatcher/0.1"}, timeout=10)
        if response.status_code != 200:
            return {"has_github": True, "username": username, "public_repos": 0, "open_source_count": 0, "self_projects_count": 0, "total_stars": 0}
        
        repos = response.json()
        if not isinstance(repos, list):
            return {"has_github": True, "username": username, "public_repos": 0, "open_source_count": 0, "self_projects_count": 0, "total_stars": 0}
        
        open_source = 0
        self_projects = 0
        total_stars = 0
        
        for repo in repos:
            stars = repo.get("stargazers_count", 0)
            is_fork = repo.get("fork", False)
            total_stars += stars
            if is_fork or stars >= 10:
                open_source += 1
            else:
                self_projects += 1
                
        return {
            "has_github": True,
            "username": username,
            "public_repos": len(repos),
            "open_source_count": open_source,
            "self_projects_count": self_projects,
            "total_stars": total_stars,
        }
    except Exception:
        return {"has_github": True, "username": username, "public_repos": 0, "open_source_count": 0, "self_projects_count": 0, "total_stars": 0}


def evaluate_hackerrank_rules(resume_text: str, job_description: str = "") -> dict[str, Any]:
    text_lower = resume_text.lower()
    github_user = extract_github_username(resume_text)
    gh_data = fetch_github_summary(github_user) if github_user else {"has_github": False}

    # 1. Open Source Category (0-35 max)
    os_score = 0
    os_evidence = []
    if gh_data.get("has_github"):
        os_score += 5
        os_evidence.append(f"GitHub profile linked (github.com/{github_user})")
        if gh_data.get("open_source_count", 0) > 0:
            os_score += 15
            os_evidence.append(f"{gh_data['open_source_count']} open source / multi-contributor repos detected")
        else:
            os_score += 3
            os_evidence.append("Personal repositories present")
    else:
        os_evidence.append("No GitHub link detected in resume text")

    if "google summer of code" in text_lower or "gsoc" in text_lower:
        os_score += 15
        os_evidence.append("Google Summer of Code (GSoC) participation")
    elif "girlscript" in text_lower or "summer of code" in text_lower:
        os_score += 8
        os_evidence.append("Summer of Code open source program participation")

    os_score = min(35, os_score)

    # 2. Self Projects Category (0-30 max)
    proj_score = 0
    proj_evidence = []
    has_links = bool(re.search(r"https?://|github\.com|demo|app\.", text_lower))
    
    # Detect complex tech keywords
    tech_stack = ["api", "database", "sql", "postgres", "mongodb", "react", "node", "python", "fastapi", "docker", "aws", "gcp", "full stack", "full-stack", "machine learning", "distributed"]
    detected_tech = [t for t in tech_stack if t in text_lower]

    if detected_tech:
        proj_score += 20
        proj_evidence.append(f"Projects contain complex multi-stack engineering ({', '.join(detected_tech[:5])})")
    else:
        proj_score += 10
        proj_evidence.append("Basic software projects detected")

    if has_links:
        proj_score += 5
        proj_evidence.append("Project links or GitHub URLs included (no link penalty)")
    else:
        proj_evidence.append("Warning: Projects missing direct links (apply 30-50% score deduction in strict ATS)")

    proj_score = min(30, proj_score)

    # 3. Production Experience Category (0-25 max)
    prod_score = 0
    prod_evidence = []
    if any(k in text_lower for k in ["intern", "internship", "co-op", "coop"]):
        prod_score += 15
        prod_evidence.append("Internship / Co-op experience detected")
    if any(k in text_lower for k in ["software engineer", "developer", "full-time", "contractor"]):
        prod_score += 10
        prod_evidence.append("Software engineering / developer experience")
    if any(k in text_lower for k in ["founder", "co-founder", "early employee", "startup"]):
        prod_score += 5
        prod_evidence.append("Founder / early-stage startup experience")

    prod_score = min(25, prod_score)

    # 4. Technical Skills Category (0-10 max)
    skills_score = 0
    skills_evidence = []
    core_langs = ["python", "java", "c++", "javascript", "typescript", "go", "rust", "c#", "sql"]
    matched_langs = [l for l in core_langs if l in text_lower]
    if len(matched_langs) >= 3:
        skills_score = 10
        skills_evidence.append(f"Strong language breadth ({', '.join(matched_langs[:5])})")
    elif len(matched_langs) >= 1:
        skills_score = 7
        skills_evidence.append(f"Core language proficiency ({', '.join(matched_langs)})")
    else:
        skills_score = 4
        skills_evidence.append("General technical skills listed")

    # 5. Bonus Points (0-20 max)
    bonus_score = 0
    bonus_reasons = []
    if gh_data.get("has_github"):
        bonus_score += 2
        bonus_reasons.append("+2 pts: GitHub URL in resume header")
    if "linkedin.com" in text_lower:
        bonus_score += 1
        bonus_reasons.append("+1 pt: LinkedIn profile linked")
    if "gsoc" in text_lower or "google summer of code" in text_lower:
        bonus_score += 5
        bonus_reasons.append("+5 pts: GSoC participation")
    if any(k in text_lower for k in ["founder", "co-founder"]):
        bonus_score += 3
        bonus_reasons.append("+3 pts: Founder / Co-founder experience")

    bonus_score = min(20, bonus_score)

    # 6. Deductions
    deductions_total = 0
    deduction_reasons = []
    if not has_links:
        deductions_total += 5
        deduction_reasons.append("-5 pts: Projects missing active URLs / GitHub links")
    if any(k in text_lower for k in ["todo list", "calculator app", "weather app"]):
        deductions_total += 3
        deduction_reasons.append("-3 pts: Simple tutorial-based project titles detected")

    total_score = max(0, min(120, os_score + proj_score + prod_score + skills_score + bonus_score - deductions_total))

    return {
        "score_total": total_score,
        "max_possible": 120,
        "hacker_rank_grade": "Pass / Strong Candidate" if total_score >= 70 else ("Review Candidate" if total_score >= 50 else "Needs Enhancement"),
        "github_profile": gh_data,
        "categories": {
            "open_source": {"score": os_score, "max": 35, "evidence": "; ".join(os_evidence)},
            "self_projects": {"score": proj_score, "max": 30, "evidence": "; ".join(proj_evidence)},
            "production": {"score": prod_score, "max": 25, "evidence": "; ".join(prod_evidence)},
            "technical_skills": {"score": skills_score, "max": 10, "evidence": "; ".join(skills_evidence)},
        },
        "bonus_points": {"total": bonus_score, "breakdown": "; ".join(bonus_reasons) or "None"},
        "deductions": {"total": deductions_total, "reasons": "; ".join(deduction_reasons) or "None"},
    }
