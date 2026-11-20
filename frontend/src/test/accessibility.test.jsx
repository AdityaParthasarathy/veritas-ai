import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import AnalysisResults from '../components/analysis/AnalysisResults'
import { AuthProvider } from '../context/AuthContext'
import ErrorBoundary from '../components/common/ErrorBoundary'
import AppLayout from '../layouts/AppLayout'
import AnalyzePage from '../pages/AnalyzePage'
import AuthPage from '../pages/AuthPage'
import EvidenceExplorerPage from '../pages/EvidenceExplorerPage'
import ModelPerformancePage from '../pages/ModelPerformancePage'
import NotFoundPage from '../pages/NotFoundPage'
import OverviewPage from '../pages/OverviewPage'
import { analysisResult } from './fixtures'
import { renderWithProviders } from './renderApp'

vi.mock('../services/performanceService', async () => {
  const { performance } = await import('./fixtures')
  return { getPerformance: vi.fn().mockResolvedValue(performance) }
})
vi.mock('../services/systemService', () => ({
  getLiveStatus: vi.fn().mockResolvedValue({ status: 'alive' }),
  getReadyStatus: vi.fn().mockResolvedValue({ status: 'ready', database: 'connected' }),
  getSystemInfo: vi.fn().mockResolvedValue({ version: '1.0.0', environment: 'test' }),
}))
vi.mock('../services/analysisService', async (importOriginal) => {
  const { analysisResult } = await import('./fixtures')
  return {
    ...(await importOriginal()),
    listPassages: vi.fn().mockResolvedValue({
      collection: { name: 'Demo', description: 'Demo collection.', size: 1, url_checked_on: '2026-11-20' },
      passages: [{ ...analysisResult.evidence.hits[0], score: 0, relevant: false }],
    }),
  }
})

async function expectNoViolations(container) {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

describe('automated accessibility checks (axe)', () => {
  it('app shell: skip link, landmarks and navigation', async () => {
    const { container } = render(
      <MemoryRouter>
        <AppShellWithAuth />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    await expectNoViolations(container)
  })

  it.each([
    ['sign in', <AuthPage key="a" mode="login" />],
    ['create account', <AuthPage key="b" mode="register" />],
    ['analyze (text mode)', <AnalyzePage key="c" />],
    ['not found', <NotFoundPage key="d" />],
  ])('%s page has no violations', async (_name, ui) => {
    const { container } = renderWithProviders(ui)
    await expectNoViolations(container)
  })

  it('overview with live status has no violations', async () => {
    const { container } = renderWithProviders(<OverviewPage />)
    await screen.findByText('Connected')
    await expectNoViolations(container)
  })

  it('analysis results (with source card) have no violations', async () => {
    const withSource = { ...analysisResult, source: { url: 'https://a.example/x', final_url: 'https://a.example/x', domain: 'a.example', title: 'T', author: null, published: null, extracted_chars: 500, truncated: false } }
    const { container } = renderWithProviders(<AnalysisResults result={withSource} />)
    await expectNoViolations(container)
  })

  it('evidence explorer and model performance pages have no violations', async () => {
    const evidence = renderWithProviders(<EvidenceExplorerPage />)
    await screen.findByText(/Atmospheric carbon dioxide/)
    await expectNoViolations(evidence.container)
    evidence.unmount()
    const perf = renderWithProviders(<ModelPerformancePage />)
    await screen.findByText('Limitations')
    await expectNoViolations(perf.container)
  })

  it('error boundary fallback is announced as an alert', async () => {
    const Boom = () => {
      throw new Error('boom')
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    spy.mockRestore()
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.queryByText('boom')).not.toBeInTheDocument() // internal details are not shown
    await expectNoViolations(container)
  })
})

// AppLayout renders an <Outlet/>, which is empty outside routes; the shell itself is what is checked here.
function AppShellWithAuth() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  )
}
