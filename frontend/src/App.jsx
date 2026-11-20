import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import AnalyzePage from './pages/AnalyzePage'
import AuthPage from './pages/AuthPage'
import EvidenceExplorerPage from './pages/EvidenceExplorerPage'
import HistoryDetailPage from './pages/HistoryDetailPage'
import HistoryPage from './pages/HistoryPage'
import ModelPerformancePage from './pages/ModelPerformancePage'
import OverviewPage from './pages/OverviewPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="evidence" element={<EvidenceExplorerPage />} />
        <Route path="performance" element={<ModelPerformancePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="history/:id" element={<ProtectedRoute><HistoryDetailPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<OverviewPage />} />
      </Route>
    </Routes>
  )
}
