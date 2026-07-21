from pathlib import Path


def test_private_paths_are_ignored():
    ignored = Path(".gitignore").read_text(encoding="utf-8")
    assert "generated/resumes/" in ignored
    assert "private/" in ignored
    assert "docs/resumes/" in ignored
