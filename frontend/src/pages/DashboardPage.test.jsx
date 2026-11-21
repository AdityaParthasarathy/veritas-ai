import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { performance } from '../test/fixtures'
import { renderWithProviders } from '../test/renderApp'
import DashboardPage from './DashboardPage'

vi.mock('../services/historyService', () => ({ listAnalyses: vi.fn() }))
vi.mock('../services/performanceService', () => ({ getPerformance: vi.fn() }))
import { listAnalyses } from '../services/historyService'
import { getPerformance } from '../services/performanceService'

const item = (id, label, level) => ({ id, title: `Case ${id}`, preview: 'Preview text.', created_at: new Date().toISOString(), word_count: 120, classifier_label: label, probability_unreliable: 0.3, uncertainty_level: level })

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPerformance.mockResolvedValue(performance)
  })

  it('summarises only what the API returned', async () => {
    listAnalyses.mockResolvedValue({ total: 3, limit: 50, offset: 0, items: [item('a', 'resembles_reliable_sources', 'moderate'), item('b', 'resembles_unreliable_sources', 'high'), item('c', 'resembles_reliable_sources', 'very_high')] })
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('Recent investigations')).toBeInTheDocument()
    expect(screen.getByText('Saved investigations')).toBeInTheDocument()
    expect(screen.getByText('2 / 1')).toBeInTheDocument() // reliable-like / unreliable-like
    expect(screen.getByText('Case a')).toBeInTheDocument()
    expect(await screen.findByText(/This is agreement with labels, not factual accuracy/)).toBeInTheDocument()
  })

  it('shows an empty state when nothing has been saved', async () => {
    listAnalyses.mockResolvedValue({ total: 0, limit: 50, offset: 0, items: [] })
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByText('No investigations yet')).toBeInTheDocument()
  })

  it('shows the error when the history cannot be loaded', async () => {
    listAnalyses.mockRejectedValue({ response: { status: 500, data: { error: { code: 'X', message: 'History is unavailable.' } } } })
    renderWithProviders(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not complete the request.')
  })
})
