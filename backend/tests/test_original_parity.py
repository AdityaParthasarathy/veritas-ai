"""The Vercel edition must reproduce the original pipeline exactly.

``fixtures/original_pipeline_golden.json`` holds outputs recorded from the ORIGINAL implementation (git main) for fixed
inputs: the samples in docs/samples and twelve WELFake test-split articles. The classifier files are checked by SHA-256.
"""

import ast
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import pytest

from app.ml.paths import ARTIFACT_DIR, BACKEND_DIR
from tests.ml_support import needs_models

GOLDEN = json.loads((Path(__file__).parent / "fixtures" / "original_pipeline_golden.json").read_text(encoding="utf-8"))
CASES = GOLDEN["cases"]
SIGNAL_KEYS = [
    "word_count", "avg_sentence_length", "exclamation_marks", "question_marks", "all_caps_ratio", "sensational_terms",
    "hedging_terms", "attribution_markers", "quotation_marks", "named_entities", "numeric_mentions", "first_second_person",
]


def _manifest() -> dict[str, str]:
    lines = (ARTIFACT_DIR / "MANIFEST.sha256").read_text(encoding="utf-8").splitlines()
    return {line.split("  ", 1)[1]: line.split("  ", 1)[0] for line in lines if line and not line.startswith("#")}


CRLF, LF = bytes([13, 10]), bytes([10])


def _sha256(relative: str) -> str:
    """SHA-256 as recorded in the manifest: binary files exactly, text files after normalising CRLF to LF."""
    data = (BACKEND_DIR / relative).read_bytes()
    if not relative.endswith(".joblib"):
        data = data.replace(CRLF, LF)  # Windows checkouts convert line endings; the repository stores LF
    return hashlib.sha256(data).hexdigest()


def test_artefacts_match_the_recorded_sha256_manifest():
    manifest = _manifest()
    assert set(manifest) >= {
        "ml_artifacts/source_masked_tfidf_vectorizer.joblib", "ml_artifacts/source_masked_logreg_model.joblib",
        "ml_artifacts/source_masked_domain_profile.joblib", "data/evidence/reference_passages.json",
    }
    for relative, expected in manifest.items():
        assert _sha256(relative) == expected, f"{relative} changed: the original artefacts must not be modified"


def test_manifest_equals_the_hashes_recorded_from_the_original_main_branch():
    recorded = GOLDEN["artefact_sha256"]
    manifest = _manifest()
    assert recorded["source_masked_tfidf_vectorizer.joblib"] == manifest["ml_artifacts/source_masked_tfidf_vectorizer.joblib"]
    assert recorded["source_masked_logreg_model.joblib"] == manifest["ml_artifacts/source_masked_logreg_model.joblib"]
    assert recorded["source_masked_domain_profile.joblib"] == manifest["ml_artifacts/source_masked_domain_profile.joblib"]
    assert recorded["reference_passages.json"] == manifest["data/evidence/reference_passages.json"]


@needs_models
@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_classifier_and_domain_check_match_the_original_exactly(case):
    from app.ml.classifier import StyleClassifier

    result = StyleClassifier().predict(case["title"], case["text"])
    assert result.label == case["label"]
    assert result.probability_unreliable == pytest.approx(case["probability_unreliable"], abs=1e-12)
    assert result.domain_similarity == pytest.approx(case["domain_similarity"], abs=1e-12)
    assert result.domain_threshold == pytest.approx(case["domain_threshold"], abs=1e-12)


@needs_models
def test_all_twelve_indicators_match_the_original_for_every_golden_input():
    import spacy

    from app.ml.signals import compute_signals

    nlp = spacy.load("en_core_web_sm")
    for case in CASES:
        signals = {s.key: s.value for s in compute_signals(case["title"], case["text"], nlp)}
        assert list(signals) == SIGNAL_KEYS, "all 12 indicators, in the original order"
        for key in SIGNAL_KEYS:
            assert signals[key] == pytest.approx(case["signals"][key], abs=1e-9), (case["id"], key)


def test_inference_imports_none_of_the_removed_heavy_packages():
    # scikit-learn soft-imports pandas when it happens to be installed, so pandas is checked statically below.
    code = "\n".join(
        [
            "import sys, importlib.util",
            "import app.ml.classifier, app.ml.evidence, app.services.analysis_service, app.main",
            "banned = ['faiss', 'sentence_transformers', 'sqlalchemy', 'psycopg', 'alembic', 'jwt', 'bcrypt', 'passlib']",
            "if importlib.util.find_spec('torch') is None: banned.append('torch')",
            "print(sorted(m for m in banned if m in sys.modules))",
        ]
    )
    out = subprocess.run([sys.executable, "-c", code], cwd=BACKEND_DIR, capture_output=True, text=True, check=True).stdout.strip()
    assert out == "[]", f"unexpected imports: {out}"


def test_only_the_training_scripts_import_pandas():
    training_only = {"data.py", "train.py", "domain_profile.py"}
    offenders = []
    for path in (BACKEND_DIR / "app").rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        names = {a.name.split(".")[0] for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names}
        names |= {n.module.split(".")[0] for n in ast.walk(tree) if isinstance(n, ast.ImportFrom) and n.module}
        if "pandas" in names and path.name not in training_only:
            offenders.append(str(path.relative_to(BACKEND_DIR)))
    assert offenders == []
