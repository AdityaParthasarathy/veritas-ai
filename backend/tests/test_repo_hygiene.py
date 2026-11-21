"""Guard against .gitignore rules silently excluding source code from the repository.

A previous overly broad `models/` rule hid backend/app/models/*.py from Git; a clean clone then failed to import.
"""

import shutil
import subprocess

import pytest

from app.ml.paths import REPO_ROOT

pytestmark = pytest.mark.skipif(shutil.which("git") is None or not (REPO_ROOT / ".git").exists(), reason="not a git checkout")

NUL = chr(0)


def _ignored(paths: list[str]) -> list[str]:
    """Paths that Git would ignore. NUL-separated bytes avoid newline translation on Windows."""
    result = subprocess.run(
        ["git", "check-ignore", "--no-index", "-z", "--stdin"], input=NUL.join(paths).encode(), capture_output=True, cwd=REPO_ROOT, check=False
    )
    return [item.decode() for item in result.stdout.split(NUL.encode()) if item]


def _relative(pattern: str) -> list[str]:
    return [p.relative_to(REPO_ROOT).as_posix() for p in REPO_ROOT.glob(pattern)]


def test_no_source_files_are_git_ignored():
    sources = _relative("backend/app/**/*.py") + _relative("backend/tests/*.py") + _relative("frontend/src/**/*.js*")
    assert len(sources) > 50
    assert _ignored(sources) == []


def test_the_classifier_files_are_committed_and_local_secrets_stay_ignored():
    # The serverless function ships the three classifier files, so they must not be git-ignored.
    shipped = [f"backend/ml_artifacts/source_masked_{part}.joblib" for part in ("tfidf_vectorizer", "logreg_model", "domain_profile")]
    assert _ignored(shipped) == []
    expected = ["data/raw/WELFake_Dataset.csv", ".env", "frontend/.env", "backend/.vercel/project.json"]
    # Also proves the helper really detects ignored paths, so the source-file test above cannot pass vacuously.
    assert sorted(_ignored(expected)) == sorted(expected)
