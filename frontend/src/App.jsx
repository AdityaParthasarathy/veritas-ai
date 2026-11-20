import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import OverviewPage from './pages/OverviewPage'
import AnalyzePage from './pages/AnalyzePage'
import EvidenceExplorerPage from './pages/EvidenceExplorerPage'
import { HistoryPage, PerformancePage, SettingsPage } from './pages/RoutePages'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="evidence" element={<EvidenceExplorerPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<OverviewPage />} />
      </Route>
    </Routes>
  )
}
