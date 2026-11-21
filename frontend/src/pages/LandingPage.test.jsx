import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../components/ui/Toast'
import { AuthProvider } from '../context/AuthContext'
import LandingPage from './LandingPage'

function Where() {
  const { pathname, state } = useLocation()
  return <p data-testid="where">{pathname + JSON.stringify(state ?? {})}</p>
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route index element={<LandingPage />} />
            <Route path="analyze" element={<Where />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Landing page', () => {
  it('has one h1 and the strike-through story with semantic deletions and insertions', () => {
    const { container } = renderLanding()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const deletions = [...container.querySelectorAll('del')].map((n) => n.textContent)
    const insertions = [...container.querySelectorAll('ins')].map((n) => n.textContent)
    expect(deletions).toEqual(['believed', 'a share', 'blind trust', 'applause'])
    expect(insertions).toEqual(['questioned', 'scrutiny', 'evidence', 'a second look'])
  })

  it('does not hand over an input that is too short, and says why', async () => {
    renderLanding()
    await userEvent.type(screen.getByLabelText('Article text to investigate'), 'too short')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Add at least 20 characters/)
    expect(screen.queryByTestId('where')).not.toBeInTheDocument()
  })

  it('hands a valid text draft to the workspace', async () => {
    renderLanding()
    const text = 'NASA scientists said on Tuesday that global temperatures continued to climb.'
    await userEvent.type(screen.getByLabelText('Article text to investigate'), text)
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByTestId('where')).toHaveTextContent(`/analyze{"draft":{"mode":"text","text":"${text}","url":""}}`)
  })

  it('validates and hands over a URL, and loads a demo input into the box', async () => {
    renderLanding()
    await userEvent.click(screen.getByRole('button', { name: 'Sourdough guide' }))
    expect(screen.getByLabelText('Article text to investigate').value).toMatch(/Sourdough bread/)
    await userEvent.click(screen.getByRole('tab', { name: 'Article URL' }))
    await userEvent.type(screen.getByLabelText('Article address'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/starting with http/)
    await userEvent.clear(screen.getByLabelText('Article address'))
    await userEvent.type(screen.getByLabelText('Article address'), 'https://news.example.com/a')
    await userEvent.click(screen.getByRole('button', { name: /Analyze/ }))
    expect(await screen.findByTestId('where')).toHaveTextContent('"mode":"url"')
  })

  it('states the limits of the product on the page', () => {
    renderLanding()
    expect(screen.getByRole('heading', { name: 'What this instrument is, and is not.' })).toBeInTheDocument()
    expect(screen.getByText('Decide whether a claim is true or false')).toBeInTheDocument()
  })
})
