import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import LandingPage from './pages/LandingPage'

// Every page except the landing page is split into its own chunk and loaded on first visit.
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'))
const CasebookPage = lazy(() => import('./pages/CasebookPage'))
const CaseDetailPage = lazy(() => import('./pages/CaseDetailPage'))
const EvidenceExplorerPage = lazy(() => import('./pages/EvidenceExplorerPage'))
const ModelPerformancePage = lazy(() => import('./pages/ModelPerformancePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="casebook" element={<CasebookPage />} />
        <Route path="casebook/:id" element={<CaseDetailPage />} />
        <Route path="evidence" element={<EvidenceExplorerPage />} />
        <Route path="performance" element={<ModelPerformancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
