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
  await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
}

describe('Investigation workspace', () => {
  beforeEach(() => vi.clearAllMocks())

  it('disables Analyze while the box is empty, and validates before sending', async () => {
    renderWithProviders(<AnalyzePage />)
    expect(screen.getByRole('button', { name: /Analyze/ })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Article text'), 'too short')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Add at least 20 characters\. 11 to go/)
    expect(analyzeText).not.toHaveBeenCalled()
  })

  it('counts words and characters while typing', async () => {
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), 'one two three')
    expect(screen.getByText(/3 words · 13 \/ 20,000 characters/)).toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Three separate readings' })).toBeInTheDocument()
    expect(screen.getByText('What did the classifier observe?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Writing style resembles examples labelled reliable.' })).toBeInTheDocument()
    expect(screen.getByText('Model probability for the unreliable label: 24%')).toBeInTheDocument()
    expect(screen.getByText(/It is not a 24% probability that the article is fake/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Writing-style reading' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Evidence retrieval' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trust in the analysis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What should I take away from this?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Related reference material' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/does not independently verify whether an article’s claims are true or false/)
    expect(screen.getAllByText(/does not verify that any claim is true or false/).length).toBeGreaterThan(0)
    expect(screen.getByText(/It is not the probability that the content is true or false/)).toBeInTheDocument()
    expect(screen.getByText('Moderate caution', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/has not independently checked the article's claims/)).toBeInTheDocument()
  })

  it('offers the report sections as a navigator', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    const nav = await screen.findByRole('navigation', { name: 'Report sections' })
    for (const name of ['Overview', 'Writing style', 'Evidence', 'Trust assessment', 'Method and limitations']) {
      expect(within(nav).getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('moves focus to the report heading when results arrive', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Three separate readings' })
    await waitFor(() => expect(screen.getByRole('heading', { name: TITLE })).toHaveFocus())
  })

  it('cancels an in-flight analysis and returns the input with the text intact', async () => {
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

  it('shows an accessible error and keeps the input when the request fails', async () => {
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

  it('replaces the input with the report, and offers to edit and re-run or start fresh', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Three separate readings' })
    expect(screen.queryByLabelText('Article text')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit and re-run' }))
    expect(screen.getByLabelText('Article text')).toHaveValue(LONG)
  })

  it('starts a new investigation with an empty box', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await userEvent.click(await screen.findByRole('button', { name: 'New investigation' }))
    expect(screen.getByLabelText('Article text')).toHaveValue('')
  })

  it('submits with Ctrl+Enter', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await userEvent.type(screen.getByLabelText('Article text'), LONG)
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    await waitFor(() => expect(analyzeText).toHaveBeenCalledTimes(1))
  })

  it('loads a demo input into the box, and clears it', async () => {
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('button', { name: /Sourdough guide/ }))
    expect(screen.getByLabelText('Article text').value).toMatch(/Sourdough bread is made by fermenting dough/)
    await userEvent.click(screen.getByRole('button', { name: /Clear/ }))
    expect(screen.getByLabelText('Article text')).toHaveValue('')
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
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/starting with http/)
    expect(analyzeUrl).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText('Article address'))
    await userEvent.type(screen.getByLabelText('Article address'), 'https://news.example.com/a')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('heading', { name: 'Source page' })).toBeInTheDocument()
    expect(screen.getAllByText('news.example.com').length).toBeGreaterThan(0)
    expect(screen.getByText(/Metadata can be wrong or missing/)).toBeInTheDocument()
    expect(screen.getByText('Article URL', { selector: 'dd' })).toBeInTheDocument()
    expect(analyzeUrl).toHaveBeenCalledWith('https://news.example.com/a', expect.any(Object))
  })

  it('shows the server message when a URL is blocked', async () => {
    analyzeUrl.mockRejectedValue({ response: { status: 422, data: { error: { code: 'URL_BLOCKED', message: 'This URL points to a private, local or reserved address and cannot be fetched.' } } } })
    renderWithProviders(<AnalyzePage />)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await userEvent.type(screen.getByLabelText('Article address'), 'http://169.254.169.254/latest')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/private, local or reserved/)
  })

  it('warns that an out-of-domain reading is not meaningful, and never lowers caution for a confident model', async () => {
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
    expect(screen.getByRole('heading', { name: 'The writing-style reading is not meaningful for this text.' })).toBeInTheDocument()
    expect(screen.getAllByText(/should not be relied on, however confident it appears/).length).toBeGreaterThan(0)
    expect(screen.getByText(/carries no meaning here/)).toBeInTheDocument()
    expect(screen.getByText('No clearly related reference passage was found')).toBeInTheDocument()
    expect(screen.getByText(/The reference collection has 34 passages/)).toBeInTheDocument()
  })

  it('renders results saved before newer fields existed', async () => {
    const legacy = structuredClone(analysisResult)
    delete legacy.classification.confidence_note
    delete legacy.uncertainty.meaning
    delete legacy.uncertainty.domain_check
    analyzeText.mockResolvedValue(legacy)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByRole('heading', { name: 'Three separate readings' })).toBeInTheDocument()
    expect(screen.queryByText(/^domain (suitable|unsuitable)/)).not.toBeInTheDocument()
  })

  it('says the system has not checked the claims when nothing related was retrieved', async () => {
    analyzeText.mockResolvedValue({ ...analysisResult, evidence: { ...analysisResult.evidence, hits: [] } })
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    expect(await screen.findByText(/No clearly related passage was found in the reference collection \(34 passages\)/)).toBeInTheDocument()
    expect(screen.getByText("This means the system has not independently checked the article's claims.")).toBeInTheDocument()
    expect(screen.getByText('No related passage')).toBeInTheDocument()
  })

  it('offers no account or save actions: nothing is stored, and the page says so', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    expect(screen.getByText(/Nothing is saved/)).toBeInTheDocument()
    await fillAndSubmit()
    await screen.findByRole('heading', { name: 'Three separate readings' })
    expect(screen.queryByRole('link', { name: /Save investigation|Sign in/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Saved: open/)).not.toBeInTheDocument()
  })

  it('submits a draft handed over from the landing page', async () => {
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />, { route: { pathname: '/analyze', state: { draft: { mode: 'text', text: LONG, url: '' } } } })
    await waitFor(() => expect(analyzeText).toHaveBeenCalledTimes(1))
    expect(analyzeText).toHaveBeenCalledWith({ title: null, text: LONG }, expect.any(Object))
    expect(await screen.findByText('What did the classifier observe?')).toBeInTheDocument()
  })

  it('copies a summary and a full report, both carrying the limitations', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    analyzeText.mockResolvedValue(analysisResult)
    renderWithProviders(<AnalyzePage />)
    await fillAndSubmit()
    await userEvent.click(await screen.findByRole('button', { name: /Copy summary/ }))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/does not verify that any claim is true or false/))
    expect(await screen.findByText('Summary copied')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Copy full report/ }))
    expect(writeText).toHaveBeenLastCalledWith(expect.stringMatching(/--- Full report ---/))
    expect(await screen.findByText('Full report copied')).toBeInTheDocument()
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
