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
const TITLE = /^NASA scientists said on Tuesday that global temperatures/ // the first sentence, trimmed to 78 characters

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function fillAndSubmit(text = LONG) {
  await userEvent.type(screen.getByLabelText('Article text'), text)
  await userEvent.click(screen.getByRole('button', { name: /Begin analysis/ }))
}

describe('Investigation workspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates before sending and says how many characters are missing', async () => {
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), 'too short')
    await userEvent.click(screen.getByRole('button', { name: /Begin analysis/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Add at least 20 characters\. 11 to go/)
    expect(analyzeText).not.toHaveBeenCalled()
  })

  it('shows the real pipeline without claiming per-step progress, then resolves into the report', async () => {
    const pending = deferred()
    analyzeText.mockReturnValue(pending.promise)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()

    const scan = await screen.findByRole('status', { name: 'Analysis in progress' })
    expect(within(scan).getByText('What the server is doing')).toBeInTheDocument()
    expect(within(scan).getByText(/Measure linguistic indicators/)).toBeInTheDocument()
    expect(within(scan).getByText(/does not report which step is running, so none is shown as complete/)).toBeInTheDocument()
    expect(within(scan).queryByText(/Fetch the page/)).not.toBeInTheDocument() // text mode has no fetch step
    expect(analyzeText).toHaveBeenCalledWith({ title: null, text: LONG }, expect.objectContaining({ signal: expect.any(AbortSignal) }))

    pending.resolve(analysisResult)
    expect(await screen.findByRole('heading', { name: 'Three separate instruments' })).toBeInTheDocument()
    expect(screen.getByText('Overall assessment')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Writing-style analysis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence retrieval' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trust in this analysis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Claim breakdown' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence explorer' })).toBeInTheDocument()
    expect(screen.getByText(/Claim-level verification is not available/)).toBeInTheDocument()
    expect(screen.getAllByText(/does not verify that any claim is true or false/).length).toBeGreaterThan(0)
    expect(screen.getByText(/It is not the probability that the content is true or false/)).toBeInTheDocument()
    expect(screen.getByText('Moderate caution', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/Not saved\. Sign in before analysing/)).toBeInTheDocument()
  })

  it('moves focus to the report heading when results arrive', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Three separate instruments' })
    await waitFor(() => expect(screen.getByRole('heading', { name: TITLE })).toHaveFocus())
  })

  it('cancels an in-flight analysis and returns the sheet with the text intact', async () => {
    const pending = deferred()
    analyzeText.mockReturnValue(pending.promise)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    const { signal } = analyzeText.mock.calls[0][1]
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(signal.aborted).toBe(true)
    expect(await screen.findByLabelText('Article text')).toHaveValue(LONG)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an accessible error and keeps the sheet when the request fails', async () => {
    analyzeText.mockRejectedValue({ response: { status: 503, data: { error: { code: 'MODEL_UNAVAILABLE', message: 'Analysis components are not available.' } } } })
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Analysis components are not available.')
    expect(screen.getByLabelText('Article text')).toHaveValue(LONG)
  })

  it('derives a readable report title from the first sentence when no headline was given', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByRole('heading', { name: TITLE })).toBeInTheDocument()
    expect(screen.queryByText('Untitled text')).not.toBeInTheDocument()
  })

  it('replaces the input sheet with the report, and offers to edit and re-run or start fresh', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Three separate instruments' })
    expect(screen.queryByLabelText('Article text')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit and re-run' }))
    expect(screen.getByLabelText('Article text')).toHaveValue(LONG)
  })

  it('submits with Ctrl+Enter', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(() => expect(analyzeText).toHaveBeenCalledTimes(1))
  })

  it('loads a demo input into the sheet', async () => {
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('button', { name: /Sourdough guide/ }))
    expect(screen.getByLabelText('Article text').value).toMatch(/Sourdough bread is made by fermenting dough/)
  })

  it('loads a demo input requested through navigation state', async () => {
    renderWithProviders(<AnalyzePage />, { route: { pathname: '/analyze', state: { example: '06-short-headline' } } })
    await waitFor(() => expect(screen.getByLabelText('Article text')).toHaveValue('Scientists reveal fruit that cures all diseases overnight'))
  })

  it('analyses a URL, shows the source page with its caveats, and blocks malformed addresses', async () => {
    analyzeUrl.mockResolvedValue({
      ...analysisResult,
      source: { url: 'https://news.example.com/a', final_url: 'https://news.example.com/a', domain: 'news.example.com', title: 'Library funding approved', author: 'Jane Reporter', published: '2026-03-01', extracted_chars: 1200, truncated: false },
    })
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await userEvent.type(screen.getByLabelText('Article address'), 'not a url')
    await userEvent.click(screen.getByRole('button', { name: /Begin analysis/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/starting with http/)
    expect(analyzeUrl).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Article address'))
    await userEvent.type(screen.getByLabelText('Article address'), 'https://news.example.com/a')
    await userEvent.click(screen.getByRole('button', { name: /Begin analysis/ }))
    expect(await screen.findByRole('heading', { name: 'Source page' })).toBeInTheDocument()
    expect(screen.getAllByText('news.example.com').length).toBeGreaterThan(0)
    expect(screen.getByText(/Metadata can be wrong or missing/)).toBeInTheDocument()
    expect(analyzeUrl).toHaveBeenCalledWith('https://news.example.com/a', expect.any(Object))
  })

  it('shows the server message when a URL is blocked', async () => {
    analyzeUrl.mockRejectedValue({ response: { status: 422, data: { error: { code: 'URL_BLOCKED', message: 'This URL points to a private, local or reserved address and cannot be fetched.' } } } })
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await userEvent.type(screen.getByLabelText('Article address'), 'http://169.254.169.254/latest')
    await userEvent.click(screen.getByRole('button', { name: /Begin analysis/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/private, local or reserved/)
  })

  it('warns that an out-of-domain reading should not be relied on, and never lowers caution for a confident model', async () => {
    const outOfDomain = {
      ...analysisResult,
      classification: { ...analysisResult.classification, probability_unreliable_style: 0.99 },
      evidence: { ...analysisResult.evidence, hits: [{ ...analysisResult.evidence.hits[0], relevant: false, score: 0.12 }] },
      uncertainty: {
        ...analysisResult.uncertainty,
        level: 'very_high',
        domain_check: { available: true, in_domain: false, similarity: 0.0442, threshold: 0.0589 },
        reasons: ['This text looks unlike the articles the classifier was trained on. The classification is outside its training domain and should not be relied on, however confident it appears.'],
      },
    }
    analyzeText.mockResolvedValue(outOfDomain)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByText('Very high caution', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/should not be relied on, however confident it appears/)).toBeInTheDocument()
    expect(screen.getAllByText(/not meaningful here/).length).toBeGreaterThan(0)
    expect(screen.getByText(/No passage in the reference collection \(34 passages\) is clearly related/)).toBeInTheDocument()
  })

  it('renders results saved before newer fields existed', async () => {
    const legacy = structuredClone(analysisResult)
    delete legacy.classification.confidence_note
    delete legacy.uncertainty.meaning
    delete legacy.uncertainty.domain_check
    analyzeText.mockResolvedValue(legacy)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByRole('heading', { name: 'Three separate instruments' })).toBeInTheDocument()
    expect(screen.queryByText(/^domain check:/)).not.toBeInTheDocument()
  })

  it('names the state "Insufficient evidence" when the style looks reliable but nothing related was retrieved', async () => {
    analyzeText.mockResolvedValue({ ...analysisResult, evidence: { ...analysisResult.evidence, hits: [] } })
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByRole('heading', { name: 'Insufficient evidence' })).toBeInTheDocument()
    expect(screen.getByText(/Its factual claims remain unverified/)).toBeInTheDocument()
    expect(screen.getByText(/not a verdict on whether it is true/)).toBeInTheDocument()
  })

  it('submits a draft handed over from the landing page', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />, { route: { pathname: '/analyze', state: { draft: { mode: 'text', text: LONG, url: '' } } } })
    await waitFor(() => expect(analyzeText).toHaveBeenCalledTimes(1))
    expect(analyzeText).toHaveBeenCalledWith({ title: null, text: LONG }, expect.any(Object))
    expect(await screen.findByText('Overall assessment')).toBeInTheDocument()
  })

  it('copies a summary that carries the limitations', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await userEvent.click(await screen.findByRole('button', { name: /Copy summary/ }))
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/does not verify that any claim is true or false/))
    expect(await screen.findByText('Summary copied')).toBeInTheDocument()
  })

  it('links the document text to its evidence: a matched sentence is marked and numbered', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit('Researchers reported warming. Carbon dioxide concentrations measured at Mauna Loa remain far above pre-industrial levels. More work is planned.')
    const proof = await screen.findByLabelText('Submitted text with matched sentences marked')
    expect(within(proof).getByText(/Mauna Loa/).closest('span')).toHaveTextContent('[1]')
    expect(screen.getByLabelText('Reference 1')).toBeInTheDocument()
  })
})
