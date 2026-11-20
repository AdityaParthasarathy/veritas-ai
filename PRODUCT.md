# Product

<!-- impeccable:product-schema 1 -->

> Written unattended on 2026-11-21 from the existing codebase, README and technical report, and the user's UI brief. The interview round was substituted because the user asked not to be asked questions while asleep. Facts marked *(inferred)* were not confirmed by the user.

## Platform

web

## Users
*(inferred)* Students, journalists, researchers and fact-checkers who open a piece of content (an article, a headline, a public URL) and want a transparent, evidence-oriented read on it before they trust or share it. They are working at a desk, often reading long text, often late, and they distrust tools that sound certain. A second audience is the people evaluating this project (assessors, portfolio reviewers) who run the sample cases.

## Product Purpose
VERITAS analyses submitted text or a public article URL and returns four separate things: a machine-learning classification of the writing style (it resembles content from sources labelled unreliable or reliable in the training data), descriptive linguistic measurements, reference passages retrieved by semantic similarity from a small curated collection, and an uncertainty assessment of the analysis itself. It never claims a text is true or false. Success is that a user understands what was found, why, what supports it, and what remains uncertain.

## Positioning
Most "fake news detectors" output a verdict. VERITAS keeps the classifier, the evidence and the uncertainty visibly separate, repeats that model confidence is not factual certainty, and flags when text is outside the classifier's training domain. A competitor that shows a verdict score cannot truthfully copy this.

## Operating Context
Single-page React app talking to a FastAPI backend (`/api/v1`). Analysis is one request/response; the backend reports no stage-by-stage progress. First analysis after server start can wait for models to finish loading. Accounts are optional: anonymous analyses are not saved; signed-in users get a private history ("casebook"). Evidence is a collection of 70 paraphrased passages from institutional sources, each with a verified source link.

## Capabilities and Constraints
- Routes (must be preserved): `/` overview, `/analyze`, `/history`, `/history/:id`, `/evidence`, `/performance`, `/login`, `/register`, `/settings`.
- API contracts are fixed; the UI must not fabricate analysis results. Pipeline stages may only be shown as what the server does, not as live per-stage progress.
- The system does not assess whether a retrieved passage supports or contradicts the text, so the UI must not label evidence as "supporting" or "contradicting".
- Classification label values: `resembles_unreliable_sources`, `resembles_reliable_sources`. Uncertainty levels: `moderate`, `high`, `very_high` (never "low"). `uncertainty.meaning`, `classification.confidence_note` and the domain check are returned by the API and must be shown.
- Frontend stack: React 19, Vite, Tailwind 3, React Router 7, Axios, Recharts, lucide-react. No new animation dependency unless justified.
- Test suites (Vitest + axe) and a WCAG AA contrast test guard the UI; they must be updated, not deleted.

## Brand Commitments
Name: VERITAS. The user's brief binds the direction: investigative intelligence × digital forensics × editorial luxury; central metaphor *signal versus noise*; deep obsidian ground; electric-cyan forensic accent, restrained amber, controlled green and red used semantically (never green = true, red = false); an editorial serif for selected display text, a legible sans for the interface, a technical mono for evidence IDs, timestamps and metadata.

## Evidence on Hand
Real: API responses; the six demo inputs in `docs/samples/` with recorded outputs; model metrics in `backend/ml_artifacts/metrics.json`; the evidence collection. Absent and must not be invented: testimonials, customer logos, user counts, benchmark claims, pricing.

## Product Principles
1. Information is questioned, not trusted: the interface never speaks with more certainty than the model can establish.
2. Evidence outranks presentation; every conclusion shows its basis and its limits.
3. Confidence is not truth: classification, evidence and uncertainty stay conceptually and visually separate.
4. Uncertainty is shown honestly and early, not buried.
5. The tool is an instrument for investigators, not a verdict machine.

## Accessibility & Inclusion
WCAG AA contrast, full keyboard operation, semantic HTML, `prefers-reduced-motion` respected, usable at 375 px width.
