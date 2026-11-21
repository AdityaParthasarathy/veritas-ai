// The analysis pipeline as the server runs it, with what each step does and, equally, what it does not do.
export const PIPELINE = [
  { title: 'Input processing', does: 'Cleans the text, or fetches and extracts a public article page, and checks its length.', not: 'Verify that a page is what it claims to be.' },
  { title: 'Writing-style classification', does: 'A classifier trained on WELFake reports whether the style resembles sources labelled reliable or unreliable.', not: 'Decide whether any claim is true.' },
  { title: 'Linguistic analysis', does: 'Counts emphasis, ALL-CAPS, sensational and hedging wording, attribution and named entities.', not: 'Turn counts into a conclusion.' },
  { title: 'Semantic evidence retrieval', does: 'Finds passages in a curated 70-passage collection that are close in meaning, with source links and scores.', not: 'Judge whether a passage supports or contradicts the text.' },
  { title: 'Uncertainty assessment', does: 'Checks length, domain fit, model decisiveness and evidence coverage, and states how far to trust the analysis.', not: 'Let a confident model lower the caution.' },
  { title: 'Final analysis presentation', does: 'Presents the three readings side by side with their limits, and lets you export or print them.', not: 'Merge them into a single verdict.' },
]
