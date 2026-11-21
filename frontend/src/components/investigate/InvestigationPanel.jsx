import { useId } from 'react'
import { ArrowRight, Eraser, Link2, Type } from 'lucide-react'
import { EXAMPLES } from '../../data/examples'
import { MAX_CHARS, validateInput } from '../../data/limits'
import Button from '../ui/Button'
import Kbd from '../ui/Kbd'
import Tabs from '../ui/Tabs'

const MODES = [
  { id: 'text', label: 'Paste text' },
  { id: 'url', label: 'Article URL' },
]
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length

/**
 * The investigation input, shared by the landing page and the workspace. Controlled: the parent owns the values and
 * decides what submitting does. It validates, counts, and says plainly what will and will not happen; it never
 * pretends a result exists before the backend has answered.
 */
export default function InvestigationPanel({ value, onChange, onSubmit, touched, onTouch, busy = false, error = null, showHeadline = false, onClear, textRef, className = '' }) {
  const status = useId()
  const { mode, title, text, url } = value
  const problem = validateInput(mode, { text, url })
  const showProblem = touched && problem
  const empty = mode === 'text' ? text.trim().length === 0 : url.trim().length === 0
  const dirty = Boolean(text || title || url)

  const submit = (event) => {
    event.preventDefault()
    onTouch(true)
    if (problem || busy) return
    onSubmit()
  }

  return (
    <div className={className}>
      <form onSubmit={submit} noValidate aria-label="Investigation input" className="group/panel glass rounded-xl p-1.5 transition-shadow duration-base focus-within:shadow-[0_0_0_1px_rgb(150_130_255/0.55),0_0_36px_-8px_rgb(128_96_255/0.5)]">
        <Tabs tabs={MODES} value={mode} onChange={(next) => onChange({ mode: next })} label="Input type" idPrefix="mode" className="px-2" />
        <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${mode}`} className="px-4 pb-2 pt-4 sm:px-5">
          {mode === 'text' ? (
            <>
              {showHeadline && (
                <>
                  <label htmlFor="title" className="sr-only">
                    Headline (optional)
                  </label>
                  <input
                    id="title"
                    value={title}
                    onChange={(e) => onChange({ title: e.target.value })}
                    maxLength={300}
                    disabled={busy}
                    placeholder="Headline (optional)"
                    className="mb-3 w-full border-b border-line bg-transparent pb-3 text-[1.25rem] font-semibold tracking-[-0.02em] text-paper outline-none transition-colors duration-base placeholder:text-dim focus:border-violet"
                  />
                </>
              )}
              <label htmlFor="text" className="sr-only">
                Article text
              </label>
              <textarea
                id="text"
                ref={textRef}
                value={text}
                onChange={(e) => onChange({ text: e.target.value })}
                onBlur={() => onTouch(true)}
                maxLength={MAX_CHARS}
                rows={showHeadline ? 12 : 5}
                disabled={busy}
                aria-invalid={Boolean(showProblem) || undefined}
                aria-describedby={status}
                placeholder="Paste the article text here. Full articles give more meaningful readings than a single headline."
                className="w-full resize-y bg-transparent text-[0.9375rem] leading-relaxed text-paper outline-none placeholder:text-dim"
              />
              {empty && (
                <p className="t-caption mt-2 border-t border-dashed border-line pt-3">
                  You will get three separate readings: how the text is written, which reference passages are related, and how far to trust the analysis. None of them says whether the text is true.
                </p>
              )}
            </>
          ) : (
            <>
              <label htmlFor="url" className="mb-2 block text-[0.8125rem] font-medium text-steel">
                Article address
              </label>
              <input
                id="url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => onChange({ url: e.target.value })}
                onBlur={() => onTouch(true)}
                maxLength={2048}
                disabled={busy}
                aria-invalid={Boolean(showProblem) || undefined}
                aria-describedby={status}
                placeholder="https://example.com/news/article"
                className="t-data h-12 w-full border-b border-line bg-transparent text-lg outline-none transition-colors duration-base placeholder:text-dim focus:border-violet"
              />
              <ul className="t-caption mt-4 list-disc space-y-1 pl-5">
                <li>Only public web pages. Local, private and internal addresses are blocked.</li>
                <li>Paywalled or script-rendered sites may fail; the error will say why.</li>
                <li>Title, author and date are extracted automatically and can be wrong.</li>
              </ul>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-line/70 px-4 py-3 sm:px-5">
          <p id={status} role={showProblem ? 'alert' : undefined} className={`mr-auto text-[0.8125rem] ${showProblem ? 'text-contra' : 'text-dim'}`}>
            {showProblem ? problem : mode === 'text' ? <span className="t-meta">{wordCount(text).toLocaleString()} words · {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters</span> : 'The server fetches the page, extracts the article and analyses the text.'}
          </p>
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                onClear?.()
                onTouch(false)
              }}
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </Button>
          )}
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-dim lg:flex">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
          </span>
          <Button type="submit" size="lg" magnetic loading={busy} disabled={empty || undefined} className="min-w-36">
            Analyze
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
          {error}
        </div>
      )}

      <div className="mt-5">
        <p className="t-meta mb-2 flex items-center gap-2">
          {mode === 'text' ? <Type className="h-3.5 w-3.5" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Try an invented demo input
        </p>
        <ul className="flex flex-wrap gap-2" aria-label="Demo inputs">
          {EXAMPLES.map((example) => (
            <li key={example.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onChange({ mode: 'text', title: '', text: example.text })
                  onTouch(false)
                }}
                className="press rounded-md border border-line bg-ink-2/50 px-3 py-1 text-[0.8125rem] text-steel hover:border-violet hover:text-paper disabled:opacity-50"
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
