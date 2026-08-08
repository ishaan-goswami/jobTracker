from job_watcher.hackerrank_evaluator import evaluate_hackerrank_rules, extract_github_username


def test_extract_github_username_from_text():
    text = "Candidate resume: https://github.com/ishaangoswami and email@example.com"
    username = extract_github_username(text)
    assert username == "ishaangoswami"


def test_evaluate_hackerrank_rules_scores_categories():
    resume_text = """
    Ishaan Goswami | Atlanta, GA | https://github.com/ishaangoswami | https://linkedin.com/in/ishaan
    Software Engineer Intern at Tech Corp. Built full-stack API using Python, FastAPI, React, PostgreSQL, Docker, AWS.
    Projects: Smart Job Watcher (Python, GitHub Actions)
    """
    eval_result = evaluate_hackerrank_rules(resume_text)
    
    assert eval_result["max_possible"] == 120
    assert eval_result["categories"]["open_source"]["score"] >= 5
    assert eval_result["categories"]["self_projects"]["score"] >= 20
    assert eval_result["categories"]["production"]["score"] >= 15
    assert eval_result["categories"]["technical_skills"]["score"] >= 7
    assert eval_result["bonus_points"]["total"] >= 3
    assert eval_result["score_total"] >= 50
