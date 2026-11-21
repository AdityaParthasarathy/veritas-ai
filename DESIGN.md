# VERITAS AI design system (v2)

Source of truth for values: `frontend/src/design/tokens.js`. Direction: the user's generated concept image (midnight indigo, violet, cyan, glass).
This replaces the v1 "galley-proof desk" world (obsidian, cyan, serif).

## World
A night-time intelligence console. Layered glass panels on a midnight indigo ground; violet marks action, cyan marks analysis, amber marks caution. The idea that survives from v1: three separate instruments (style, evidence, trust) that are never merged into one verdict.

## Colour
- Ground: `ink-0..3` #080A18, #0D1124, #141A32, #1C2344. Lines `line` #262E57, `line-strong` #3B4580.
- Text: `paper` #F5F4FF, `steel` #A8B0CB, `dim` #8791B3 (lifted from the brief's #737E9D so it holds WCAG AA on raised surfaces; enforced by `contrast.test.js`).
- Action: `brand` #7654F6 (gradient #6847F0 to #7A58F7, white text, both ends >= 4.5:1), `violet` #A78BFA for highlights and eyebrows.
- Analysis: `signal` cyan #45D9E8 (data, links, focus ring).
- State: `caution` #F5B84B, `support` #35D6A0, `contra` #F06A79. Green and red describe state or the descriptive style reading. They never mean "true" or "false".
- Gradients are used for: the primary button, the analysis bars (cyan to violet), the single accent word in the hero, and two static radial lights on the page.

## Type
- Display: Sora (landing headlines, page titles, report headings).
- Interface: Inter.
- Technical: JetBrains Mono (ids, timestamps, measurements; tabular numerals).
- Accent: Instrument Serif italic, used only for the replacement words in the landing story (`.t-accent`).
- Classes: `t-display`, `t-h1..3`, `t-lead`, `t-body`, `t-caption`, `t-meta`, `t-data`, `t-galley`, `t-eyebrow`.

## Surfaces
- `.glass`: translucent panel with blur, for hero and floating layers only.
- `.panel`: flat gradient panel with a hairline border, the default container. `.panel-hover` adds border illumination and a 2px lift.
- Radius: 6/10/14/20/28px. Buttons 10px, panels 14px, hero 20px. No pill shapes except search, chips and the avatar.

## Motion
Tokens `--dur-*`, `--ease-out`. Strike-through story (CSS transitions triggered once on scroll, Replay button), floating document sheets, slow orbit, sliding nav and tab indicators, magnetic primary buttons (fine pointers only). Reduced motion: final states shown at once, durations near zero, no transforms.

## Application shell
- Marketing shell (`/`, `/login`, `/register`): top bar, footer.
- App shell (everything else): fixed sidebar (large screens), top bar with search and account menu, mobile navigation sheet.
- Pages after the landing page are lazy-loaded; the charting library only loads with the Method page.

## Report (the key screen)
Order: overall assessment, three instruments, claim breakdown, evidence explorer, article details, technical details.
- Assessment states are descriptive, never verdicts: out of domain, inconclusive, unreliable-like style, insufficient evidence, reliable-like style (see `buildAssessment` in `reportModel.js`).
- Claim breakdown states that claim extraction and per-claim verdicts are not performed, and shows only matched sentences. It accepts a `claims` array if a backend capability appears.
- Evidence cards state "Support or contradiction: not assessed".

## Honesty rules
1. Classification, model confidence and trust in the analysis stay separate.
2. Evidence is relevance only. Absence of evidence is never evidence of anything.
3. No fabricated statistics. Dashboard figures are computed from the user's own saved investigations and the model-performance endpoint.
4. Demo inputs are labelled invented; the recorded sample is labelled with its date.
5. Dataset-label agreement is never presented as factual accuracy.
