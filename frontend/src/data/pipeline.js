// The analysis pipeline as the server runs it. For each step: what happens, the technology used, what it produces,
// and what it cannot establish. Used by the landing page (short form) and the Method page (full form).
export const PIPELINE = [
  {
    title: 'Input processing',
    does: 'Cleans the text, or fetches and extracts a public article page, and checks its length.',
    tech: 'Server-side text cleaning; for URLs, a guarded fetch (public addresses only) and article extraction.',
    produces: 'The text to analyse, plus page metadata for URLs.',
    not: 'Verify that a page is what it claims to be.',
  },
  {
    title: 'Writing-style classification',
    does: 'A classifier trained on WELFake reports whether the style resembles sources labelled reliable or unreliable.',
    tech: 'TF-IDF features and logistic regression, trained on WELFake with publisher cues masked.',
    produces: 'A label and the model probability for the unreliable training label.',
    not: 'Decide whether any claim is true.',
  },
  {
    title: 'Linguistic analysis',
    does: 'Counts emphasis, ALL-CAPS, sensational and hedging wording, attribution and named entities.',
    tech: 'spaCy tokenisation and named-entity recognition with simple counting rules.',
    produces: 'About a dozen descriptive measurements.',
    not: 'Turn counts into a conclusion. The classifier does not use them.',
  },
  {
    title: 'Lexical evidence retrieval',
    does: 'Finds passages in a curated 70-passage collection that share vocabulary with the text, with source links and scores.',
    tech: 'TF-IDF vectors (character 3 to 5-grams, fitted on the 70 passages) and cosine similarity.',
    produces: 'Related reference passages with a similarity score against a fixed cut-off.',
    not: 'Judge whether a passage supports or contradicts the text, or find a passage that covers the same subject in different words.',
  },
  {
    title: 'Uncertainty assessment',
    does: 'Checks length, domain fit, model decisiveness and evidence coverage, and states how far to trust the analysis.',
    tech: 'Rule-based checks, including an out-of-domain test on the TF-IDF vector of the text.',
    produces: 'A caution level (moderate, high or very high) with the reasons.',
    not: 'Let a confident model lower the caution.',
  },
  {
    title: 'Final analysis presentation',
    does: 'Presents the three readings side by side with their limits, and lets you export or print them.',
    tech: 'The report in this interface, assembled only from the fields the API returned.',
    produces: 'A report you can copy, download as JSON or print.',
    not: 'Merge the readings into a single verdict.',
  },
]

// Five quantities that are easy to confuse. The Method page defines each one.
export const NOT_INTERCHANGEABLE = [
  { term: 'Agreement with dataset labels', body: 'How often the classifier matches the labels in a held-out slice of its training dataset. It measures fit to that dataset, not to the real world.' },
  { term: 'Real-world factual accuracy', body: 'Whether claims are actually true. VERITAS does not measure this at all.' },
  { term: 'Evidence relevance', body: 'How much vocabulary a reference passage shares with the text. A related passage is not a supporting passage, and a passage on the same subject in different words can be missed.' },
  { term: 'Model confidence', body: 'How strongly the text matches patterns in the training labels. A model can be confident and wrong.' },
  { term: 'Trust in the overall analysis', body: 'How far to rely on the readings, given length, domain fit and evidence coverage. It is about the analysis, not the article.' },
]
