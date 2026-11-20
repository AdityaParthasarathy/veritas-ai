import UpcomingPage from './UpcomingPage'

export const AnalyzePage = () => (
  <UpcomingPage
    title="Analyze Content"
    phase="Phase 3"
    description="Submit a headline, article text or URL for NLP-based analysis."
    planned={['Text and URL submission', 'Classifier prediction with confidence', 'Linguistic signal breakdown', 'Uncertainty warnings']}
  />
)

export const HistoryPage = () => (
  <UpcomingPage
    title="Analysis History"
    phase="Phase 4"
    description="Browse previously stored analyses."
    planned={['Persisted analyses per user', 'Filtering and search', 'Re-open past results']}
  />
)

export const EvidencePage = () => (
  <UpcomingPage
    title="Evidence Explorer"
    phase="Phase 3"
    description="Inspect passages retrieved from a curated reference collection."
    planned={['Semantic retrieval with sentence embeddings', 'Clear separation of retrieved evidence and model prediction']}
  />
)

export const PerformancePage = () => (
  <UpcomingPage
    title="Model Performance"
    phase="Phase 2"
    description="Evaluation metrics and dataset limitations for the trained model."
    planned={['Precision, recall, F1 and confusion matrix', 'Dataset description and known biases', 'Limitations of the classifier']}
  />
)

export const SettingsPage = () => (
  <UpcomingPage
    title="Settings"
    phase="Phase 4"
    description="Account and application preferences."
    planned={['Authentication and profile', 'Preferences']}
  />
)
