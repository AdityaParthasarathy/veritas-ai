import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/common/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import LandingPage from './pages/LandingPage'

// Every page except the landing page is split into its own chunk and loaded on first visit.
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const EvidenceExplorerPage = lazy(() => import('./pages/EvidenceExplorerPage'))
const HistoryDetailPage = lazy(() => import('./pages/HistoryDetailPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ModelPerformancePage = lazy(() => import('./pages/ModelPerformancePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="evidence" element={<EvidenceExplorerPage />} />
        <Route path="performance" element={<ModelPerformancePage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="history/:id" element={<ProtectedRoute><HistoryDetailPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
