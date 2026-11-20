import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analysisResult } from '../test/fixtures'
import { renderWithProviders } from '../test/renderApp'
import AnalyzePage from './AnalyzePage'

vi.mock('../services/analysisService', async (importOriginal) => ({
  ...(await importOriginal()),
  analyzeText: vi.fn(),
  analyzeUrl: vi.fn(),
}))
import { analyzeText, analyzeUrl } from '../services/analysisService'

const LONG = 'NASA scientists said on Tuesday that global temperatures continued to climb according to new measurements.'

describe('AnalyzePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps Analyze disabled until the text is long enough', async () => {
    renderWithProviders(<AnalyzePage />)
    const button = screen.getByRole('button', { name: 'Analyze' })
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Article text'), 'too short')
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Article text'), ` ${LONG}`)
    expect(button).toBeEnabled()
  })

  it('shows classification, signals, evidence and uncertainty as separate sections with disclaimers', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))

    expect(await screen.findByText('Model classification')).toBeInTheDocument()
    expect(screen.getByText('Machine-learning output · not evidence')).toBeInTheDocument()
    expect(screen.getByText('Linguistic signals')).toBeInTheDocument()
    expect(screen.getByText('Related reference passages')).toBeInTheDocument()
    expect(screen.getByText('Moderate uncertainty')).toBeInTheDocument()
    expect(screen.getByText(/does not verify that any claim is true or false/)).toBeInTheDocument()
    expect(screen.getByText(/not accuracy on real-world content/)).toBeInTheDocument()
    expect(screen.getByText(/It is not the probability that the content is true or false/)).toBeInTheDocument()
    expect(screen.getByText(/says nothing about whether the content is true or false/)).toBeInTheDocument()
    expect(screen.getByText(/resembles the classifier's training articles/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /NOAA/ })
    expect(link).toHaveAttribute('href', 'https://gml.noaa.gov/ccgg/trends/')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '24')
    expect(analyzeText).toHaveBeenCalledWith({ title: null, text: LONG })
    expect(screen.getByText(/Not signed in: this analysis will not be saved/)).toBeInTheDocument()
  })

  it('says when no reference passage is related instead of showing weak matches as evidence', async () => {
    const unrelated = { ...analysisResult, evidence: { ...analysisResult.evidence, hits: [{ ...analysisResult.evidence.hits[0], relevant: false, score: 0.12 }] } }
    analyzeText.mockResolvedValue(unrelated)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(await screen.findByText(/No passage in the reference collection is clearly related/)).toBeInTheDocument()
    expect(screen.queryByText(/Similarity/)).not.toBeInTheDocument()
  })

  it('shows an accessible error when the request fails', async () => {
    analyzeText.mockRejectedValue({ response: { status: 503, data: { error: { code: 'MODEL_UNAVAILABLE', message: 'Analysis components are not available.' } } } })
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Analysis components are not available.')
  })

  it('analyzes a URL and shows the source metadata with caveats', async () => {
    analyzeUrl.mockResolvedValue({
      ...analysisResult,
      source: { url: 'https://news.example.com/a', final_url: 'https://news.example.com/a', domain: 'news.example.com', title: 'Library funding approved', author: 'Jane Reporter', published: '2026-03-01', extracted_chars: 1200, truncated: false },
    })
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    const button = screen.getByRole('button', { name: 'Analyze' })
    expect(button).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox', { name: 'Article URL' }), 'not a url')
    expect(button).toBeDisabled()
    await userEvent.clear(screen.getByRole('textbox', { name: 'Article URL' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Article URL' }), 'https://news.example.com/a')
    await userEvent.click(button)
    expect(await screen.findByText('Source page')).toBeInTheDocument()
    expect(screen.getByText('news.example.com')).toBeInTheDocument()
    expect(screen.getByText(/Metadata is extracted automatically and may be missing or wrong/)).toBeInTheDocument()
    expect(analyzeUrl).toHaveBeenCalledWith('https://news.example.com/a')
  })

  it('shows blocked-URL errors from the server', async () => {
    analyzeUrl.mockRejectedValue({ response: { status: 422, data: { error: { code: 'URL_BLOCKED', message: 'This URL points to a private, local or reserved address and cannot be fetched.' } } } })
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Article URL' }), 'http://169.254.169.254/latest')
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/private, local or reserved/)
  })

  it('supports arrow-key navigation between the input tabs', async () => {
    renderWithProviders(<AnalyzePage />)
    screen.getByRole('tab', { name: 'Paste text' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Article URL' })).toHaveAttribute('aria-selected', 'true'))
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByRole('textbox', { name: 'Article URL' })).toBeInTheDocument()
  })
})

describe('AnalyzePage out-of-domain warning', () => {
  it('warns that the classification should not be relied on for out-of-domain text', async () => {
    const outOfDomain = {
      ...analysisResult,
      uncertainty: {
        ...analysisResult.uncertainty,
        level: 'very_high',
        domain_check: { available: true, in_domain: false, similarity: 0.0442, threshold: 0.0589 },
        reasons: ['This text looks unlike the articles the classifier was trained on. The classification is outside its training domain and should not be relied on, however confident it appears.'],
      },
    }
    analyzeText.mockResolvedValue(outOfDomain)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(await screen.findByText('Very high uncertainty')).toBeInTheDocument()
    expect(screen.getByText(/unlike the classifier's training articles/)).toBeInTheDocument()
    expect(screen.getByText(/should not be relied on, however confident it appears/)).toBeInTheDocument()
  })

  it('still renders results saved before the new fields existed', async () => {
    const legacy = structuredClone(analysisResult)
    delete legacy.classification.confidence_note
    delete legacy.uncertainty.meaning
    delete legacy.uncertainty.domain_check
    analyzeText.mockResolvedValue(legacy)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.click(screen.getByRole('button', { name: 'Analyze' }))
    expect(await screen.findByText('Model classification')).toBeInTheDocument()
    expect(screen.queryByText(/Domain check/)).not.toBeInTheDocument()
  })
})
