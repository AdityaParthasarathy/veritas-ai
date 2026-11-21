import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Link2, Type } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { MAX_CHARS, validateInput } from '../../data/limits'
import Button from '../ui/Button'

const MODES = [
  { id: 'text', label: 'Paste text', icon: Type },
  { id: 'url', label: 'Article URL', icon: Link2 },
]

/**
 * The landing-page input. It only collects and validates; the analysis itself runs in the investigation workspace,
 * which receives the draft through router state and submits it. Nothing is analysed or invented here.
 */
export default function HeroComposer() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('text')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const problem = validateInput(mode, { text, url })

  const submit = (event) => {
    event.preventDefault()
    setTouched(true)
    if (problem) return
    navigate('/analyze', { state: { draft: { mode, text, url: url.trim() } } })
  }

  return (
    <div>
      <form onSubmit={submit} noValidate aria-label="Start an investigation" className="glass rounded-xl p-2">
        <div role="tablist" aria-label="Input type" className="flex gap-1 p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id)
                setTouched(false)
              }}
              className={`press inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors duration-fast ${mode === id ? 'bg-brand/25 text-paper' : 'text-dim hover:text-steel'}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div className="px-3 pb-2 pt-1">
          {mode === 'text' ? (
            <>
              <label htmlFor="hero-text" className="sr-only">
                Article text to investigate
              </label>
              <textarea
                id="hero-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
                rows={4}
                aria-invalid={Boolean(touched && problem) || undefined}
                aria-describedby="hero-status"
                placeholder="Paste a news article or headline to investigate…"
                className="w-full resize-none bg-transparent text-[0.9375rem] leading-relaxed text-paper outline-none placeholder:text-dim"
              />
            </>
          ) : (
            <>
              <label htmlFor="hero-url" className="sr-only">
                Article address
              </label>
              <input
                id="hero-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={Boolean(touched && problem) || undefined}
                aria-describedby="hero-status"
                placeholder="https://example.com/news/article"
                className="t-data h-[5.25rem] w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-dim"
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-3 pb-1 pt-3">
          <p id="hero-status" role={touched && problem ? 'alert' : undefined} className={`text-[0.8125rem] ${touched && problem ? 'text-contra' : 'text-dim'}`}>
            {touched && problem ? problem : mode === 'text' ? 'The analysis runs on the server. Nothing is saved.' : 'A public web page. The server fetches and analyses it.'}
          </p>
          <Button type="submit" size="md" magnetic>
            Analyze
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      <div className="mt-4">
        <p className="t-meta mb-2">Or load an invented demo input</p>
        <ul className="flex flex-wrap gap-2" aria-label="Demo inputs">
          {EXAMPLES.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                onClick={() => {
                  setMode('text')
                  setText(example.text)
                  setTouched(false)
                }}
                className="press rounded-full border border-line bg-ink-2/50 px-3 py-1 text-[0.8125rem] text-steel hover:border-violet hover:text-paper"
              >
                {example.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
