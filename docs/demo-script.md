# Demonstration script (about 9 minutes)

**Goal:** show a working system, and be honest about what it can and cannot do. The strongest message is the pairing of a working analysis pipeline with visible, repeated statements that it does not verify truth.

**Before you start (2 minutes, off camera)**
1. `docker compose up -d --build` (or the local dev servers) and wait until `docker compose ps` shows `healthy`.
2. Open http://localhost:5173 and check the Overview shows API Online and database Connected. Check `GET /api/v1/health/models` returns `ready` (models finish loading about 15 seconds after start).
3. Have the files in `docs/samples/` ready to paste. Open Swagger at http://localhost:8000/docs in a second tab.

## 1. Framing and system status (0:00 to 1:00)
- Say: "VERITAS AI analyses news text. It separates a machine-learning classification from independently retrieved reference passages, and it tells you how much to trust the analysis. It does not decide whether something is true."
- Show **Overview**: live API and database status (real health calls), the list of what is built and not built.

## 2. A normal article (1:00 to 2:30)
- **Analyze Content** > paste `01-normal-news.txt` > Analyze.
- Walk the result top to bottom: the global disclaimer; **Uncertainty** card (moderate, with the sentence that this level says nothing about truth; domain check says it resembles the training articles); **Model classification** ("resembles reliable sources", with the note that confidence is not the probability of truth, and the 96.4% figure explained as agreement with dataset labels, not real-world accuracy); **Linguistic signals** (descriptive, not a score); **Related reference passages** (measles, immunization, each with a source link, similarity score and the sentence it matched).
- Point out the evidence is shown apart from the classifier and is described as "related material only".

## 3. A misleading article, two ways (2:30 to 4:30)
- Paste `02-misleading-sensational.txt`. Show the loud style signals (exclamation marks, ALL-CAPS, sensational wording) and the "unreliable-style" label. Evidence shows what antibiotics are actually for.
- Paste `03-misleading-sober.txt`. **Say plainly:** "This is also false, but it is written calmly, and the classifier calls it reliable-style." Show that the confidence note and disclaimers are still there and that the passages are general flu and vaccination material, not a rebuttal of this specific claim. "That is the limitation of a style-based classifier, and why we never present it as a fact-check."

## 4. Out of domain and insufficient evidence (4:30 to 6:00)
- Paste `04-out-of-domain.txt` (sourdough guide): **Very high** uncertainty; the domain check says the text is unlike the training articles and the classification should not be relied on; no related passage.
- Paste `05-insufficient-evidence.txt` (council news): the analysis says no passage in the collection is related. "Absence of evidence in a small collection tells you nothing about accuracy."
- Optionally paste `06-short-headline.txt`: very short input, very high uncertainty.

## 5. URL analysis and safety (6:00 to 7:00)
- **Article URL** tab: paste a public news article URL. Show the **Source page** card (domain, extracted title, author and date, with the warning that metadata may be wrong).
- Then paste `http://169.254.169.254/latest/meta-data/` and show the blocked message. Explain briefly: the server only fetches public addresses on ports 80/443, checks every redirect, and pins the connection to the vetted address. (If a news site answers HTTP 403 the app reports that plainly; some sites, including Wikipedia, refuse automated requests.)

## 6. Accounts, history and the evidence tools (7:00 to 8:00)
- Register, run `01-normal-news.txt` again, open **Analysis History**, open the saved result, delete it.
- **Settings**: mention password change (revokes other sessions) and account deletion (removes saved analyses).
- **Evidence Explorer**: semantic search "why do we have seasons" returns the seasons passage even though the wording differs. State: 70 passages, every source link checked.

## 7. Model performance and honesty (8:00 to 9:00)
- **Model Performance**: accuracy and the confusion matrix for the source-masked model, the dataset limitations (labels come from source reliability, 2016-2017 US politics, a documented label-mapping discrepancy in the dataset).
- Close with the numbers that matter: out-of-domain detection flagged 18 of 18 hand-written non-news texts at a 5.5% false-flag rate on held-out news; evidence threshold tuned on labelled queries (details in `docs/quality-evaluation.md`).
- Say what is not done: no fine-tuned transformer, small evidence collection, results measured on author-written test sets, no TLS or load testing.

## Questions you may get
- *Is 96.4% accuracy good?* It measures agreement with the dataset's labels on held-out articles from the same dataset. It is not accuracy on real-world misinformation.
- *Why not use a bigger model?* Out of scope for this project; a stronger classifier would still only learn the dataset's labels.
- *How do I know the evidence is right?* Each passage links to its source; passages are paraphrases that were not reviewed line by line, so the source is the authority.
- *Can it be fooled?* Yes: sample 3 shows a false claim in a calm style is not caught.
