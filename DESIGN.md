# VERITAS AI design system (v4, restrained editorial)

Source of truth for values: `frontend/src/design/tokens.js`. Direction: the user's generated concept image (midnight indigo, violet, cyan, glass).
This replaces the v1 "galley-proof desk" world (obsidian, cyan, serif).

## World
An editorial research instrument. A flat midnight-ink ground, hairline rules, square-ish corners, and one serif display moment per page. Violet marks action, cyan marks analysis, amber marks caution. Three separate readings (style, evidence, trust) are never merged into a verdict. Restraint is the rule: no glows, no glass blur, no gradient fills, no floating decoration.

## Colour
- Ground: `ink-0..3` #080B18, #0D1224, #141B35, #1A2342. Lines `line` #242C52, `line-strong` #38417A. The page ground is flat (no texture, no radial lights).
- Text: `paper` #F4F5FF, `steel` #A3AEC9, `dim` #8793AF (lifted from the brief's #77839F, which measures 4.06:1 on the highest surface; enforced by `contrast.test.js`).
- Action: `brand` #8060FF as the accent; the primary button is flat #6847F0 so white text holds 4.5:1. `violet` #A78BFA for highlights.
- Analysis: `signal` cyan #48D9ED (data, links, focus ring).
- State: `caution` #F5B84B, `support` #37D3A8, `contra` #EE6F7C. Green and red describe state or the descriptive style reading. They never mean "true" or "false".
- Gradients are not used: `brand-gradient` and `signal-gradient` resolve to flat colours, and `.text-gradient` is a plain violet accent word.

## Type
- Inter for headings and the interface (headings at weight 600 with tight tracking).
- JetBrains Mono for ids, timestamps and measurements (tabular numerals).
- Instrument Serif for exactly two display moments: the hero line (`.t-hero`) and the replacement words in the landing story (`.t-accent`).
- Classes: `t-hero`, `t-display`, `t-h1..3`, `t-lead`, `t-body`, `t-caption`, `t-meta`, `t-data`, `t-galley`, `t-eyebrow`.

## Surfaces
- `.panel`: flat `ink-1` container with a hairline border and a 6px radius. `.panel-hover` changes border and background only (no lift, no glow).
- `.glass` is kept as a name for raised containers (solid `ink-1`, `line-strong` border, no blur).
- Radius: 2/4/6/8/10px (`rounded-sm` to `rounded-2xl`). Buttons 4px, panels 6px. Pills only for dots and progress bars.
- Landing sections are editorial rows: a narrow numbered label column and the content beside it, separated by hairlines.

## Motion
Tokens `--dur-*`, `--ease-out`. Strike-through story (CSS transitions triggered once on scroll, Replay button), scroll reveals, sliding nav and tab indicators, press feedback. Reduced motion: final states shown at once, durations near zero, no transforms.
