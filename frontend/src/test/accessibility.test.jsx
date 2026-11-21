import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from '../components/common/ErrorBoundary'
import CommandPalette from '../components/layout/CommandPalette'
import Report from '../components/report/Report'
import { ToastProvider } from '../components/ui/Toast'
import { AuthProvider } from '../context/AuthContext'
import AppLayout from '../layouts/AppLayout'
import AnalyzePage from '../pages/AnalyzePage'
import AuthPage from '../pages/AuthPage'
import CaseDetailPage from '../pages/CaseDetailPage'
import CasebookPage from '../pages/CasebookPage'
import EvidenceExplorerPage from '../pages/EvidenceExplorerPage'
import LandingPage from '../pages/LandingPage'
import ModelPerformancePage from '../pages/ModelPerformancePage'
import NotFoundPage from '../pages/NotFoundPage'
import { analysisResult, performance } from './fixtures'
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
vi.mock('../services/api', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, apiClient: { ...original.apiClient, get: vi.fn().mockResolvedValue({ data: { status: 'ready', load_seconds: 11.3 } }) } }
})
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
  expect(await axe(container)).toHaveNoViolations()
}

const sourceResult = { ...analysisResult, source: { url: 'https://a.example/x', final_url: 'https://a.example/x', domain: 'a.example', title: 'T', author: null, published: null, extracted_chars: 500, truncated: false } }
const outOfDomainResult = {
  ...analysisResult,
  evidence: { ...analysisResult.evidence, hits: [{ ...analysisResult.evidence.hits[0], relevant: false, score: 0.2 }] },
  uncertainty: { ...analysisResult.uncertainty, level: 'very_high', domain_check: { available: true, in_domain: false, similarity: 0.03, threshold: 0.06 } },
}

describe('automated accessibility checks (axe)', () => {
  it('application shell: skip link, landmarks, navigation, readout', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<LandingPage />} />
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    await expectNoViolations(container)
  })

  it.each([
    ['sign in', <AuthPage key="a" mode="login" />],
    ['create account', <AuthPage key="b" mode="register" />],
    ['investigation workspace (text)', <AnalyzePage key="c" />],
    ['casebook', <CasebookPage key="d" />],
    ['not found', <NotFoundPage key="e" />],
  ])('%s has no violations', async (_name, ui) => {
    const { container } = renderWithProviders(ui)
    await expectNoViolations(container)
  })

  it('a casebook case with its recorded report has no violations', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/casebook/03-misleading-sober']}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/casebook/:id" element={<CaseDetailPage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Three separate readings' })).toBeInTheDocument()
    expect(screen.getByText('Invented example')).toBeInTheDocument()
    await expectNoViolations(container)
  })

  it('workspace with the URL tab open has no violations', async () => {
    const { container } = renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await expectNoViolations(container)
  })

  it('report with source, evidence and the document proof has no violations', async () => {
    const { container } = renderWithProviders(
      <Report result={sourceResult} text="Researchers reported warming. Carbon dioxide concentrations measured at Mauna Loa remain far above pre-industrial levels." title="Warming" stamp="today" />,
    )
    await expectNoViolations(container)
  })

  it('out-of-domain report with weak matches has no violations', async () => {
    const { container } = renderWithProviders(<Report result={outOfDomainResult} title="Sourdough" />)
    await expectNoViolations(container)
  })

  it('reference library and method pages have no violations', async () => {
    const library = renderWithProviders(<EvidenceExplorerPage />)
    await screen.findByText(/Atmospheric carbon dioxide/)
    await expectNoViolations(library.container)
    library.unmount()
    const method = renderWithProviders(<ModelPerformancePage />)
    await screen.findByText('Limitations')
    expect(performance.variants.length).toBeGreaterThan(0)
    await expectNoViolations(method.container)
  })

  it('command palette dialog has no violations and offers only actions that exist', async () => {
    renderWithProviders(<CommandPalette open onClose={() => {}} />)
    await expectNoViolations(screen.getByRole('dialog'))
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options.join(' ')).toMatch(/Start an investigation/)
    expect(options.join(' ')).toMatch(/Casebook/)
    expect(options.join(' ')).not.toMatch(/Saved investigations/) // signed-out users have none
  })

  it('error boundary fallback is announced as an alert and hides internals', async () => {
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
    expect(screen.queryByText('boom')).not.toBeInTheDocument()
    await expectNoViolations(container)
  })
})
