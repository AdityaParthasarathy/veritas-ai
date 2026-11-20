# Demo sample inputs

Six hand-written inputs for demonstrating VERITAS AI. They are **fabricated for demonstration**: the people, organisations, figures and claims in them are invented, and the false claims (samples 2 and 3) are deliberately false. Paste a file's text into **Analyze Content**.

| File | Case | What it shows |
| --- | --- | --- |
| `01-normal-news.txt` | Normal, in-domain news with matching evidence | Sober report on a measles outbreak. Related reference passages exist (measles, immunization). |
| `02-misleading-sensational.txt` | Misleading, loud style | A false claim that antibiotics cure the flu, written with all-caps and urgency. Style signals are strong; related passages explain what antibiotics do. |
| `03-misleading-sober.txt` | Misleading, calm style | A false claim written like a normal news item. **The classifier is fooled**, which is the point: style-based classification cannot see falsehood. Evidence is related material only. |
| `04-out-of-domain.txt` | Out of domain | A sourdough guide. Nothing like the training news; the domain check flags it and uncertainty rises. |
| `05-insufficient-evidence.txt` | In-domain style, no evidence | Local council news. No passage in the collection is related, and the analysis says so. |
| `06-short-headline.txt` | Very short input | One headline. Far outside the training length; uncertainty is very high. |

## Actual results (recorded 2026-11-20 with the shipped models; threshold 0.40)

Produced by running each file through the real analysis pipeline. Exact numbers can differ slightly if the classifier is retrained.

| Sample | Words | Classifier label (probability "unreliable") | Domain check | Uncertainty | Top reference passage (score) |
| --- | --- | --- | --- | --- | --- |
| 01 | 196 | reliable-style (0.006) | in domain (0.084 vs cut-off 0.059) | moderate | `health-measles` (0.82), `health-immunization` (0.62) |
| 02 | 110 | unreliable-style (1.000) | in domain (0.071) | moderate (text shorter than most training articles) | `health-antibiotics` (0.62), `health-influenza` (0.53), `health-amr` (0.43) |
| 03 | 183 | **reliable-style (0.213)** | in domain (0.078) | moderate | `health-immunization` (0.54), `health-influenza` (0.50), `health-covid` (0.41) |
| 04 | 190 | reliable-style (0.390), not meaningful here | **out of domain** (0.044) | **very high** | none related (best: `health-breastfeeding` 0.31) |
| 05 | 179 | reliable-style (0.064) | in domain (0.078) | moderate (+ "no passage clearly related") | none related (best: `biology-genome` 0.26) |
| 06 | 8 | unreliable-style (0.866), not meaningful here | out of domain (0.008) | **very high** | none related (best: `health-cancer` 0.39) |

Things to say when presenting these:
- Sample 3 is labelled "reliable-style" even though its claim is false. The system never says the claim is true: the confidence note and the "does not verify" disclaimers are shown, and the evidence is described as related material only. The passages found for sample 3 do **not** address the lemon-and-honey claim; they are about influenza and vaccination in general.
- The classifier output for samples 4 and 6 is shown but the uncertainty section says not to rely on it.
- Sample 5's top passage scored 0.26, below the 0.40 relevance threshold, so none is presented as related.
- A confident probability (sample 2 at 1.000, sample 1 at 0.006) never lowers uncertainty.

These samples are also used by `backend/tests/test_quality.py`.
