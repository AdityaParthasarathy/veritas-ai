"""Regression tests for the hub-page false positive (investigation of 2026-11-21).

A site's hub page (a mission page: news feed, interface labels, widget instructions, a few descriptive blocks) was
extracted as if it were one article and scored 98.5% "resembles unreliable sources". The three layers are tested
separately, because each has a different cause and a different remedy:

1. extraction   - what the fetch/parse stage hands on (no model involved);
2. text checks  - the structural article/hub check and source masking (no model involved);
3. prediction   - the classifier and the final response (needs the trained artifacts, skips cleanly without them).

``tests/fixtures/nasa_webb_hub_extracted.txt`` is the text the production extractor produced for the page on 2026-11-21.
It is used as a recorded input. The classifier tests are *characterisation* tests: they pin what the unchanged model
does today. Nothing here claims the classifier is fixed; if the model is retrained, update the expected values and the
technical report together.
"""

import re
from pathlib import Path
from unittest.mock import patch

import pytest

from app.ml.data import mask_source_cues
from app.ml.uncertainty import assess
from app.services import url_ingest
from app.services.extraction_quality import MIN_LINES_TO_JUDGE, assess_extraction
from tests.ml_support import needs_models
from tests.test_url_ingest import ARTICLE, fake_resolver, html_response, transport

RECORDED = (Path(__file__).parent / "fixtures" / "nasa_webb_hub_extracted.txt").read_text(encoding="utf-8")
RECORDED_TITLE = "James Webb Space Telescope - NASA Science"

TEASERS = [
    "A new album from a space agency's X-ray observatory collects snapshots of baby stars across the galaxy and beyond and transforms…",
    "An observatory now in development will detect gravitational waves, the tiny ripples in space-time caused…",
    "First discovered long ago, fast radio bursts are enigmatic, millisecond-long flashes of radio emission from the distant universe. Their origin…",
    "In the early history of the solar system, scientists theorize that a Mars-sized object smashed into the infant…",
]
BLOCKS = [
    "The mission is the largest and most complex observatory ever sent to space, serving thousands of astronomers worldwide. It studies every phase in the history of the Universe.",
    "The telescope is a giant leap forward in our quest to understand the Universe and our origins, examining every phase of cosmic history from the first glows to the formation of galaxies.",
]
HUB_HTML = (
    "<html><head><title>Mission hub</title></head><body><main>"
    "<h2>Featured Image</h2><h2>Latest News</h2>"
    "<p>The feed below is a mix of releases and blogs. To filter, select the check box. Updated recently.</p>"
    + "".join(f"<p>{t}</p>" for t in TEASERS)
    + "<h2>The Mission</h2>"
    + f"<p>{BLOCKS[0]}</p><p>Learn More</p>"
    + "<h2>Science Goals</h2>"
    + f"<p>{BLOCKS[1]}</p><p>Learn More</p>"
    + "<h2>The Spacecraft</h2><p>Learn More</p><h2>The Team</h2><p>Learn More</p>"
    + "</main></body></html>"
)


# ---- 1. extraction (no model) -----------------------------------------------------------------------
def extract(html: str):
    handler = lambda request: html_response(html)  # noqa: E731
    return url_ingest.ingest_url("http://hub.example.test/page", resolver=fake_resolver, transport=transport(handler))


def test_extraction_passes_hub_page_furniture_through_unchanged():
    """Recorded current behaviour: the extractor does not remove interface labels or feed teasers from a hub page.

    This is a limitation of extraction, documented rather than hidden. A hub page has no single article body to find.
    """
    text = extract(HUB_HTML).text
    assert "Featured Image" in text
    assert text.count("Learn More") >= 3
    assert sum(1 for line in text.splitlines() if line.strip().endswith("…")) >= 3


def test_extraction_of_a_real_article_still_drops_navigation_and_footer():
    text = extract(ARTICLE).text
    assert "voted on Tuesday" in text and "Home | News" not in text and "Copyright" not in text


# ---- 2. text checks (no model) ----------------------------------------------------------------------
def test_recorded_hub_text_is_flagged_for_structural_reasons():
    quality = assess_extraction(RECORDED)
    assert not quality.looks_like_article
    assert quality.warning and "menu, feed or index page" in quality.warning
    assert quality.metrics["truncated_teasers"] >= 3
    assert any("Learn More" in reason for reason in quality.reasons)


def test_extracted_hub_html_is_flagged_end_to_end_through_the_extractor():
    assert not assess_extraction(extract(HUB_HTML).text).looks_like_article


def test_structural_check_does_not_depend_on_publisher_or_topic():
    """Swapping every topical and publisher word must not change the verdict: the check reads structure only."""
    disguised = re.sub(r"NASA|Webb|Hubble|Chandra|Galaxy Zoo|Telescopes?", "Acme", RECORDED)
    assert disguised != RECORDED
    assert not assess_extraction(disguised).looks_like_article


def test_real_article_text_is_not_flagged():
    assert assess_extraction(extract(ARTICLE).text).looks_like_article
    prose = "\n".join(f"Paragraph {i}: The city council voted on Tuesday to approve funding for the new central library after years of planning." for i in range(10))
    assert assess_extraction(prose).looks_like_article


def test_text_with_too_little_structure_is_never_judged():
    few = "\n".join(["Featured Image", "Learn More", "Learn More", "Learn More"])
    assert len(few.splitlines()) < MIN_LINES_TO_JUDGE
    assert assess_extraction(few).looks_like_article and assess_extraction("").looks_like_article


def test_source_masking_leaves_interface_labels_in_place():
    """Masking removes publisher names only; it does not (and should not) hide the labels the classifier reacts to."""
    masked = mask_source_cues(RECORDED)
    for label in ("Featured Image", "Latest News", "Learn More"):
        assert label in masked


def test_extraction_warning_raises_uncertainty_without_touching_the_probability_input():
    base = assess(615, 0.985, 0.78, 0.0869, 0.0589)
    warned = assess(615, 0.985, 0.78, 0.0869, 0.0589, extraction_warning="looks like a feed")
    assert (base.level, warned.level) == ("moderate", "high")
    assert "looks like a feed" in warned.reasons
    # Confidence never lowers the level, and a related reference passage never overrides the warning.
    assert assess(615, 0.999, 0.99, 0.0869, 0.0589, extraction_warning="x").level == "high"
    assert assess(615, 0.001, 0.99, 0.0869, 0.0589, extraction_warning="x").level == "high"
    assert assess(615, 0.50, 0.78, 0.0869, 0.0589, extraction_warning="x").level == "very_high"  # undecided model adds to it


# ---- 3. prediction (needs the trained artifacts) ----------------------------------------------------
@pytest.fixture(scope="module")
def classifier():
    from app.ml.classifier import StyleClassifier

    return StyleClassifier()


@needs_models
def test_unchanged_classifier_still_rates_the_recorded_hub_text_unreliable(classifier):
    """Characterisation of the known failure (not a goal): the model's output on this text is NOT fixed."""
    result = classifier.predict(RECORDED_TITLE, RECORDED)
    assert result.probability_unreliable > 0.9
    assert result.domain_similarity > result.domain_threshold  # the text passes the domain check, as originally observed


@needs_models
def test_the_reading_is_driven_by_interface_words_not_by_the_science(classifier):
    """Diagnostic: removing only the words 'image', 'images' and 'featured' moves the reading across the 0.5 boundary."""
    stripped = re.sub(r"\b(image|images|featured)\b", " ", RECORDED, flags=re.I)
    before = classifier.predict(RECORDED_TITLE, RECORDED).probability_unreliable
    after = classifier.predict(RECORDED_TITLE, stripped).probability_unreliable
    assert before - after > 0.4 and after < 0.6


@needs_models
def test_most_influential_unreliable_features_are_web_page_labels(classifier):
    import numpy as np

    x = classifier._vectorizer.transform([mask_source_cues(f"{RECORDED_TITLE}. {RECORDED}")])
    names = classifier._vectorizer.get_feature_names_out()
    contributions = x.multiply(classifier._model.coef_[0]).tocsr()
    top = [names[i] for i in np.argsort(-np.asarray(contributions.todense()).ravel())[:4]]
    assert {"image", "featured image", "featured"} <= set(top)


@needs_models
def test_the_warning_changes_only_the_uncertainty_never_the_classifier_reading():
    from app.schemas.analysis import AnalysisRequest
    from app.services.analysis_service import get_analysis_service

    service = get_analysis_service()
    request = AnalysisRequest(title=RECORDED_TITLE, text=RECORDED)
    plain = service.analyze(request)
    warned = service.analyze(request, extraction_warning=assess_extraction(RECORDED).warning)
    assert plain.classification.probability_unreliable_style == warned.classification.probability_unreliable_style
    assert plain.classification.label == warned.classification.label
    assert plain.uncertainty.domain_check == warned.uncertainty.domain_check
    assert [h.score for h in plain.evidence.hits] == [h.score for h in warned.evidence.hits]
    assert plain.uncertainty.level == "moderate" and warned.uncertainty.level == "high"
    assert warned.uncertainty.reasons[0].startswith("The extracted text looks like a menu, feed or index page")


@needs_models
def test_api_reports_the_extraction_warning_for_a_hub_page_and_none_for_an_article(client):
    real_ingest = url_ingest.ingest_url

    def serving(html):
        def stub(url, **kwargs):
            return real_ingest(url, resolver=fake_resolver, transport=transport(lambda request: html_response(html)))

        return stub

    with patch("app.api.v1.endpoints.analysis.url_ingest.ingest_url", side_effect=serving(HUB_HTML)):
        hub = client.post("/api/v1/analysis/url", json={"url": "http://hub.example.test/page"})
    assert hub.status_code == 200
    body = hub.json()
    assert "menu, feed or index page" in body["source"]["extraction_warning"]
    assert body["uncertainty"]["level"] in ("high", "very_high")
    assert body["uncertainty"]["reasons"][0] == body["source"]["extraction_warning"]

    with patch("app.api.v1.endpoints.analysis.url_ingest.ingest_url", side_effect=serving(ARTICLE)):
        article = client.post("/api/v1/analysis/url", json={"url": "http://news.example.test/story"})
    assert article.status_code == 200 and article.json()["source"]["extraction_warning"] is None
