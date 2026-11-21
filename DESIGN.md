# VERITAS AI design system (v3)

Source of truth for values: `frontend/src/design/tokens.js`. Direction: the user's generated concept image (midnight indigo, violet, cyan, glass).
This replaces the v1 "galley-proof desk" world (obsidian, cyan, serif).

## World
A night-time intelligence console. Layered glass panels on a midnight indigo ground; violet marks action, cyan marks analysis, amber marks caution. The idea that survives from v1: three separate instruments (style, evidence, trust) that are never merged into one verdict.

## Colour
- Ground: `ink-0..3` #080B18, #0D1224, #141B35, #1A2342. Lines `line` #242C52, `line-strong` #38417A. A static noise tile and two radial lights sit under the page.
- Text: `paper` #F4F5FF, `steel` #A3AEC9, `dim` #8793AF (lifted from the brief's #77839F, which measures 4.06:1 on the highest surface; enforced by `contrast.test.js`).
- Action: `brand` #8060FF as the accent; the primary button uses a darker gradient (#6847F0 to #7A58F7) so white text holds 4.5:1. `violet` #A78BFA for highlights.
- Analysis: `signal` cyan #48D9ED (data, links, focus ring).
- State: `caution` #F5B84B, `support` #37D3A8, `contra` #EE6F7C. Green and red describe state or the descriptive style reading. They never mean "true" or "false".
- Gradients are used for: the primary button, the analysis bars (cyan to violet), the single accent word in the hero, and two static radial lights on the page.

## Type
- Inter for headings and the interface (headings at weight 600 with tight tracking).
- JetBrains Mono for ids, timestamps and measurements (tabular numerals).
- Instrument Serif for exactly two display moments: the hero line (`.t-hero`) and the replacement words in the landing story (`.t-accent`).
- Classes: `t-hero`, `t-display`, `t-h1..3`, `t-lead`, `t-body`, `t-caption`, `t-meta`, `t-data`, `t-galley`, `t-eyebrow`.

## Surfaces
- `.glass`: translucent panel with blur, for hero and floating layers only.
- `.panel`: flat gradient panel with a hairline border, the default container. `.panel-hover` adds border illumination and a 2px lift.
- Radius: 6/10/14/20/28px. Buttons 10px, panels 14px, hero 20px. No pill shapes except search, chips and the avatar.

## Motion
Tokens `--dur-*`, `--ease-out`. Strike-through story (CSS transitions triggered once on scroll, Replay button), floating document sheets, slow orbit, sliding nav and tab indicators, magnetic primary buttons (fine pointers only). Reduced motion: final states shown at once, durations near zero, no transforms.

## Shell
One sticky top bar on every page: logo, Investigate / Casebook / Library / Method with a sliding indicator, readiness indicator, command palette, sign-in or account menu, and the primary CTA. It is transparent over the hero and gains a surface and border on scroll. Below 1024px the navigation moves into a sheet. Pages after the landing page are lazy-loaded; the charting library only loads with the Method page.

## Report (the key screen)
Header (title, metadata, every action) and a section rail, then: what the classifier observed (with the probability explained as not a probability of being fake), what was retrieved, how far to trust it; "What should I take away from this?" (assembled from the response by `buildTakeaway`); the three readings; related reference material; the article; method and limitations. The notice that VERITAS does not verify claims is part of the first screen.
- Evidence cards say "Support or contradiction: not assessed". An empty evidence result is explained as coverage, not failure.
- Save investigation: investigations are saved by the server when analysed while signed in. For a signed-in user the button shows where it was saved; for an anonymous user it goes to sign-in and the input is re-run and saved afterwards.

## Casebook and Library
The Casebook holds six invented cases with real recorded outputs (`data/recorded-results.json`, produced by the live pipeline on 2026-11-21) and a Run this case button. Saved investigations live at `/history`. The Library has topic and publisher filters and a passage detail dialog, and says the collection is limited.

## Honesty rules
1. Classification, model confidence and trust in the analysis stay separate.
2. Evidence is relevance only. Absence of evidence is never evidence of anything.
3. No fabricated statistics. Dashboard figures are computed from the user's own saved investigations and the model-performance endpoint.
4. Demo inputs are labelled invented; the recorded sample is labelled with its date.
5. Dataset-label agreement is never presented as factual accuracy.
