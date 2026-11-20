# VERITAS design system

Written from the built interface (unattended pass; see PRODUCT.md). Source of truth for values: `frontend/src/design/tokens.js`.

## World
A galley-proof desk: an investigator's workspace at night. Investigative intelligence × digital forensics × editorial luxury. The core idea is **signal vs noise**: the submitted text is the specimen, the interface is the instrument.

## Colour
- Ground: obsidian `ink-0..3` (#07080A, #0C0E11, #121519, #191D22); hairlines `line` #262C34 / `line-strong` #3A424D.
- Text: warm paper #EBE7DD; secondary steel #A3ACB7; tertiary dim #8691A0 (all pass AA on the grounds; enforced by `contrast.test.js`).
- Accent: forensic cyan `signal` #57D8E6 (focus, active measurement, primary action).
- Semantic only: caution amber #E5A93E (uncertainty), `support` green #6FBD92 (system health, never "true"), `contra` red #E4695F (errors, very high caution, never "false").
- Classification is never coloured good/bad; meaning is always also carried by text.

## Type
- Display: Bodoni Moda (editorial voice, headings, the submitted text set as galley).
- Sans: Hanken Grotesk (interface and body).
- Mono: Azeret Mono (ids, timestamps, measurements; tabular numerals).
- Classes: `t-display`, `t-h1`, `t-h2`, `t-h3`, `t-lead`, `t-body`, `t-caption`, `t-meta`, `t-data`, `t-galley`.

## Motion
Durations and easing are tokens (`--dur-*`, `--ease-out`). Canvas signal field pauses offscreen/hidden; scroll reveals via IntersectionObserver; magnetic buttons on fine pointers only; press feedback 1px. Reduced motion: static canvas, near-zero durations, no transforms.

## Components
`components/ui`: Button, Field, Badge, Kbd, Tooltip, Modal, Menu, Tabs, Toast, Skeleton, Reveal, EmptyState, Logo.
`components/layout`: Topbar, MobileNav, CommandPalette (Ctrl/Cmd+K), ReadoutPip (live system readout).
`components/report`: Report, StyleScale, TrustLadder, EvidenceItem, DocumentProof, SignalsTable.
`components/signal`: SignalField, Diagrams. `components/analysis`: AnalysisScan.

## Honesty rules (design constraints)
1. Classification, model confidence, and trust in the analysis are three separate readings, never merged.
2. Evidence is "reference passages", never labelled supporting or contradicting.
3. The backend reports no per-step progress, so the scan lists real pipeline steps without implying completion.
4. Uncertainty meaning, confidence note, and domain check are always shown; out-of-domain overrides apparent confidence.
5. Demo texts are labelled as invented; no fabricated results anywhere.
