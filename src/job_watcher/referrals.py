STATUSES = ["Not started", "Potential contact identified", "Connection request sent", "Message sent", "Follow-up needed", "Responded", "Referral offered", "Referral submitted", "Declined", "No response", "Applied without referral"]


def draft(kind: str, candidate: dict, recipient_name: str, facts: str) -> str:
    role = candidate.get("target_role", "new-grad software engineering roles")
    school = candidate.get("school", "")
    graduation = candidate.get("graduation_date", "")
    context = f" I'm a {school} student graduating {graduation}, interested in {role}.".strip()
    templates = {
        "connection": f"Hi {recipient_name}, I came across your work at the company.{context} {facts} Would you be open to connecting?",
        "referral": f"Hi {recipient_name},{context} {facts} If you think my background could be a fit, would you be comfortable referring me for the role? No pressure either way.",
        "follow_up": f"Hi {recipient_name}, just following up on my earlier note.{context} {facts} Thanks for considering it.",
        "thanks": f"Hi {recipient_name}, thank you for your help with my application. I really appreciate your time and support.",
    }
    return templates.get(kind, templates["connection"])
