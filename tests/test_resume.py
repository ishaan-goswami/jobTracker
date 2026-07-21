from job_watcher.resume import analyze, tailor


def test_tailoring_preserves_source_and_marks_unsupported(tmp_path):
    source = tmp_path / "resume.tex"
    source.write_text("\\textbf{Python developer}", encoding="utf-8")
    destination = tailor(source, "example-role", "Need Python and Kubernetes", tmp_path / "generated")
    assert (destination / "tailored_resume.tex").read_text(encoding="utf-8") == source.read_text(encoding="utf-8")
    assert "Kubernetes" in analyze(source.read_text(), "Need Python and Kubernetes")["unsupported_or_missing"]
