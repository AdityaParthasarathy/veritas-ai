import UpcomingPage from './UpcomingPage'

export const HistoryPage = () => (
  <UpcomingPage
    title="Analysis History"
    phase="Phase 4"
    description="Browse previously stored analyses."
    planned={['Persisted analyses per user', 'Filtering and search', 'Re-open past results']}
  />
)

export const PerformancePage = () => (
  <UpcomingPage
    title="Model Performance"
    phase="Phase 4"
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
