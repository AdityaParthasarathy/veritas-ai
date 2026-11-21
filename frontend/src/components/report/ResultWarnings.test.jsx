import { screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { describe, expect, it } from 'vitest'
import { analysisResult } from '../../test/fixtures'
import { renderWithProviders } from '../../test/renderApp'
import Report from './Report'

const warning = 'The extracted text looks like a menu, feed or index page rather than a single article: the same short label (“Learn More”) appears 4 times. The classifier was trained on whole articles, so its reading of this text is not meaningful.'
const hub = {
  ...analysisResult,
  word_count: 615,
  source: { url: 'https://h.example/', final_url: 'https://h.example/', domain: 'h.example', title: 'Hub page', author: null, published: null, extracted_chars: 3824, truncated: false, extraction_warning: warning },
  classification: { ...analysisResult.classification, label: 'resembles_unreliable_sources', probability_unreliable_style: 0.9855 },
  uncertainty: { ...analysisResult.uncertainty, level: 'high', reasons: [warning] },
}

describe('result warnings on the report (hub-page regression)', () => {
  it('puts the not-an-article warning before the result and reframes the reading as not meaningful', async () => {
    const { container } = renderWithProviders(<Report result={hub} title="Hub page" />)
    const region = screen.getByRole('region', { name: 'Read this before the result' })
    expect(within(region).getByText('This page does not look like a single article')).toBeInTheDocument()
    expect(within(region).getByText(warning)).toBeInTheDocument()
    // The warning region precedes the headline in document order.
    const headline = screen.getByRole('heading', { name: 'The writing-style reading is not meaningful for this text.' })
    expect(region.compareDocumentPosition(headline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Not meaningful here')).toBeInTheDocument()
    // The measurement is still shown, and still carries its "not a probability of fake" note.
    expect(screen.getByText(/Model probability for the unreliable label: 99%/)).toBeInTheDocument()
    expect(screen.getByText(/not a 99% probability that the article is fake/)).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows no warning region for a long, in-domain pasted text', () => {
    renderWithProviders(<Report result={{ ...analysisResult, word_count: 400 }} title="Fine" />)
    expect(screen.queryByRole('region', { name: 'Read this before the result' })).not.toBeInTheDocument()
  })

  it('shows the short-input warning prominently and separately', () => {
    renderWithProviders(<Report result={{ ...analysisResult, word_count: 12 }} title="Headline" />)
    const region = screen.getByRole('region', { name: 'Read this before the result' })
    expect(within(region).getByText('Very short input (12 words)')).toBeInTheDocument()
  })
})

describe('report glossary', () => {
  it('defines the terms in plain language, with the relevance threshold from the result', () => {
    renderWithProviders(<Report result={{ ...analysisResult, word_count: 400 }} title="Terms" />)
    expect(screen.getByText('Terms used in this report')).toBeInTheDocument()
    expect(screen.getByText('Model probability')).toBeInTheDocument()
    expect(screen.getByText(/It is not the probability that the text is false/)).toBeInTheDocument()
    expect(screen.getByText(/It does not show support or contradiction/)).toBeInTheDocument()
  })
})
