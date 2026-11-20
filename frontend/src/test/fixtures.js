export const user = { id: 'u1', email: 'ada@example.com', full_name: 'Ada', created_at: '2026-01-01T00:00:00Z' }

export const analysisResult = {
  analysis_id: null,
  source: null,
  word_count: 62,
  classification: {
    kind: 'machine_learning_classification',
    label: 'resembles_reliable_sources',
    probability_unreliable_style: 0.2381,
    confidence_note: 'Model confidence describes how strongly the text matches patterns in the training labels. It is not the probability that the content is true or false.',
    model: { name: 'TF-IDF + Logistic Regression (source_masked)', trained_on: 'WELFake (about 62k de-duplicated articles)', test_accuracy_on_dataset_labels: 0.9637 },
    disclaimer: 'Describes how closely the writing resembles articles from sources labelled unreliable or reliable. It is not a fact-check.',
  },
  linguistic_signals: [
    { key: 'word_count', label: 'Words', value: 62, unit: 'words', description: 'Length of the text.' },
    { key: 'exclamation_marks', label: 'Exclamation marks', value: 0, unit: 'per 1,000 words', description: 'Emphasis.' },
  ],
  evidence: {
    kind: 'retrieved_reference_passages',
    collection_name: 'VERITAS AI demo reference collection',
    collection_size: 34,
    relevance_threshold: 0.4,
    hits: [
      {
        id: 'climate-co2', score: 0.74, relevant: true, topic: 'Climate',
        passage: 'Atmospheric carbon dioxide has been measured continuously at Mauna Loa Observatory since 1958.',
        source_org: 'NOAA', source_title: 'Trends in atmospheric carbon dioxide', source_url: 'https://gml.noaa.gov/ccgg/trends/',
        matched_text: 'carbon dioxide concentrations measured at Mauna Loa',
      },
    ],
    disclaimer: 'Passages are retrieved by semantic similarity. They show related reference material only.',
  },
  uncertainty: {
    level: 'moderate',
    meaning: 'This level describes how far the analysis itself can be trusted. It says nothing about whether the content is true or false.',
    domain_check: { available: true, in_domain: true, similarity: 0.0838, threshold: 0.0589 },
    reasons: ['The text is shorter (62 words) than most training articles, which reduces reliability.'],
    standing_caveats: ['The classifier was trained on WELFake.', 'A result cannot establish whether the claims are true.'],
  },
  disclaimer: 'This output is an automated statistical and similarity analysis. It does not verify that any claim is true or false.',
}

export const performance = {
  dataset_name: 'WELFake', dataset_source: 'https://zenodo.org/records/4561253', dataset_license: 'CC-BY-4.0',
  label_convention: 'is_fake: 1 = fake/unreliable, 0 = real', generated_at: '2026-11-20T21:36:00+00:00',
  cleaning: { raw_rows: 72134, dropped_empty_content: 1128, dropped_exact_duplicates: 8178, dropped_duplicate_text: 391, final_rows: 62437 },
  split_strategy: 'stratified 70/15/15', leakage_check: 'passed',
  split_sizes: { train: { rows: 43705, fake: 19475, real: 24230 }, validation: { rows: 9366, fake: 4174, real: 5192 }, test: { rows: 9366, fake: 4173, real: 5193 } },
  interpretation: 'These figures measure agreement with the dataset labels. They are not a measure of factual accuracy.',
  limitations: [{ title: 'Labels reflect sources', detail: 'A fake label means the source was labelled unreliable.' }],
  variants: [
    {
      variant: 'source_masked', description: 'Publisher cues removed.', selected_C: 128, vocabulary_size: 200000,
      validation: { accuracy: 0.96, per_class: {}, macro_avg: { precision: 0.96, recall: 0.96, f1: 0.96 }, confusion_matrix: { labels: ['real', 'fake'], rows_are: 'true', columns_are: 'predicted', matrix: [[5033, 160], [180, 3993]] } },
      test: {
        accuracy: 0.9637,
        per_class: { real: { precision: 0.9655, recall: 0.9692, f1: 0.9673, support: 5193 }, fake: { precision: 0.9615, recall: 0.9569, f1: 0.9592, support: 4173 } },
        macro_avg: { precision: 0.9635, recall: 0.9631, f1: 0.9632 },
        confusion_matrix: { labels: ['real', 'fake'], rows_are: 'true', columns_are: 'predicted', matrix: [[5033, 160], [180, 3993]] },
      },
      top_features: { most_fake: ['featured image', 'video'], most_real: ['said', 'follow'] },
    },
  ],
}
