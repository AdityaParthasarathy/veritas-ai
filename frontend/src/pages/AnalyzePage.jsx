import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, FileText } from 'lucide-react'
import AnalysisScan from '../components/analysis/AnalysisScan'
import Report from '../components/report/Report'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Kbd from '../components/ui/Kbd'
import Tabs from '../components/ui/Tabs'
import { useAuth } from '../context/AuthContext'
import { EXAMPLES } from '../data/examples'
import { useHotkey } from '../hooks/useHotkey'
import { MAX_CHARS, MIN_CHARS, validateInput } from '../data/limits'
import { analyzeText, analyzeUrl, describeError } from '../services/analysisService'

const MODES = [
  { id: 'text', label: 'Paste text' },
  { id: 'url', label: 'Article URL' },
]
const isCancel = (error) => error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'

export default function AnalyzePage() {
  const { user } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState('text')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [touched, setTouched] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [submitted, setSubmitted] = useState(null)
  const [stamp, setStamp] = useState(null)
  const [flash, setFlash] = useState(0)
  const controller = useRef(null)
  const headingRef = useRef(null)
  const textRef = useRef(null)

  const problem = validateInput(mode, { text, url })
  const showProblem = touched && problem

  const loadExample = useCallback((example) => {
    setMode('text')
    setTitle('')
    setText(example.text)
    setTouched(false)
    setError(null)
    setResult(null)
    setPhase('idle')
    setFlash((n) => n + 1)
  }, [])

  // A demo input chosen from the overview or the command palette.
  const requested = location.state?.example
  useEffect(() => {
    const example = EXAMPLES.find((e) => e.id === requested)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (example) loadExample(example)
  }, [requested, loadExample])

  // A draft handed over by the landing-page composer: fill the form, then submit it once the state has settled.
  const draft = location.state?.draft
  const [autoSubmit, setAutoSubmit] = useState(false)
  useEffect(() => {
    if (!draft) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setMode(draft.mode)
    setTitle('')
    setText(draft.text ?? '')
    setUrl(draft.url ?? '')
    setTouched(true)
    setAutoSubmit(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [draft])

  const submit = async () => {
    setTouched(true)
    if (problem || phase === 'running') return
    controller.current = new AbortController()
    setPhase('running')
    setError(null)
    setResult(null)
    const snapshot = { mode, title: title.trim(), text, url: url.trim() }
    setSubmitted(snapshot)
    setStamp(new Date().toLocaleString())
    try {
      const data =
        mode === 'text'
          ? await analyzeText({ title: snapshot.title || null, text }, { signal: controller.current.signal })
          : await analyzeUrl(snapshot.url, { signal: controller.current.signal })
      setResult(data)
      setPhase('done')
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: false }))
    } catch (err) {
      if (isCancel(err)) return
      setError(describeError(err))
      setPhase('idle')
    }
  }

  const cancel = () => {
    controller.current?.abort()
    setPhase('idle')
  }
  const reset = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    requestAnimationFrame(() => (mode === 'text' ? textRef.current : document.getElementById('url'))?.focus())
  }

  useEffect(() => {
    if (!autoSubmit) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoSubmit(false)
    submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit])

  useHotkey('mod+enter', submit, { allowInInputs: true, enabled: phase !== 'running' })
  useEffect(() => () => controller.current?.abort(), [])

  const sheetDisabled = phase === 'running'

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      {phase === 'done' ? (
        <h1 className="sr-only">Investigation report</h1>
      ) : (
        <div className="mb-10 max-w-3xl">
          <p className="t-eyebrow mb-3">Investigation workspace</p>
          <h1 className="t-h1">Open an investigation</h1>
          <p className="t-lead mt-4">Submit text or an article address. You get four separate readings and an honest account of how far to trust them. None of them says whether the text is true.</p>
        </div>
      )}

      {phase === 'running' && submitted ? (
        <AnalysisScan mode={submitted.mode} title={submitted.title} text={submitted.text} url={submitted.url} onCancel={cancel} />
      ) : phase === 'done' ? null : (
        <div className="grid gap-10 lg:grid-cols-12">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
            noValidate
            className="lg:col-span-8"
          >
            <div className="panel overflow-hidden shadow-panel">
              <Tabs tabs={MODES} value={mode} onChange={setMode} label="Input type" idPrefix="mode" className="px-2" />
              <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${mode}`} className="p-5 sm:p-7">
                {mode === 'text' ? (
                  <>
                    <label htmlFor="title" className="sr-only">
                      Headline (optional)
                    </label>
                    <input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={300}
                      disabled={sheetDisabled}
                      placeholder="Headline (optional)"
                      className="font-display w-full border-b border-line bg-transparent pb-3 text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-paper outline-none transition-colors duration-base placeholder:text-dim focus:border-violet"
                    />
                    <div key={flash} className="animate-fade-in mt-5">
                      <label htmlFor="text" className="sr-only">
                        Article text
                      </label>
                      <textarea
                        id="text"
                        ref={textRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={() => setTouched(true)}
                        maxLength={MAX_CHARS}
                        rows={13}
                        disabled={sheetDisabled}
                        aria-invalid={Boolean(showProblem) || undefined}
                        aria-describedby="text-status"
                        placeholder="Paste the article here. Full articles give more meaningful readings than a single headline, and text unlike news will be flagged."
                        className="t-galley min-h-[22rem] w-full max-w-none resize-y border-0 bg-transparent p-0 outline-none placeholder:text-dim"
                      />
                    </div>
                    <div id="text-status" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                      <p role={showProblem ? 'alert' : undefined} className={`text-[0.8125rem] ${showProblem ? 'text-contra' : 'text-dim'}`}>
                        {showProblem ? problem : `At least ${MIN_CHARS} characters.`}
                      </p>
                      <p className="t-meta flex items-center gap-3">
                        <span className="hidden h-px w-24 bg-line sm:block" aria-hidden="true">
                          <span className="block h-px bg-signal-gradient transition-[width] duration-base ease-out" style={{ width: `${Math.min(100, (text.length / MAX_CHARS) * 100)}%` }} />
                        </span>
                        {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                      </p>
                    </div>
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
                      onChange={(e) => setUrl(e.target.value)}
                      onBlur={() => setTouched(true)}
                      maxLength={2048}
                      aria-invalid={Boolean(showProblem) || undefined}
                      aria-describedby="url-status"
                      placeholder="https://example.com/news/article"
                      className="t-data w-full border-b border-line bg-transparent pb-3 text-xl outline-none transition-colors duration-base placeholder:text-dim focus:border-signal"
                    />
                    <p id="url-status" role={showProblem ? 'alert' : undefined} className={`mt-3 text-[0.8125rem] ${showProblem ? 'text-contra' : 'text-dim'}`}>
                      {showProblem ? problem : 'A public web page. The server fetches it, extracts the article and analyses the text.'}
                    </p>
                    <ul className="t-caption mt-6 max-w-2xl list-disc space-y-1 pl-5">
                      <li>Only public http(s) pages on the standard ports. Local, private and internal addresses are blocked.</li>
                      <li>Paywalled, script-rendered or bot-blocking sites may fail; the error will say why.</li>
                      <li>Extracted metadata (title, author, date) is automatic and can be wrong.</li>
                    </ul>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line bg-ink-2/60 px-5 py-4 sm:px-7">
                <Button type="submit" size="lg" magnetic>
                  Begin analysis
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
                {text || title ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setText('')
                      setTitle('')
                      setUrl('')
                      setTouched(false)
                      reset()
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
                <span className="t-caption ml-auto hidden items-center gap-1.5 sm:flex">
                  <Kbd>Ctrl</Kbd>
                  <Kbd>Enter</Kbd> to submit
                </span>
              </div>
            </div>

            <p className="t-caption mt-3">
              {user ? 'Signed in: this investigation will be saved to your Casebook.' : (
                <>
                  Not signed in: this investigation will not be saved.{' '}
                  <Link to="/login" state={{ from: '/analyze' }} className="text-signal underline decoration-signal/30 hover:decoration-signal">
                    Sign in to keep it.
                  </Link>
                </>
              )}
            </p>
            {error && (
              <div role="alert" className="mt-5 rounded-md border border-contra/40 bg-contra/10 px-4 py-3 text-sm text-contra">
                {error}
              </div>
            )}
          </form>

          <aside aria-label="Demo inputs" className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <h2 className="t-h3">Demo inputs</h2>
              <p className="t-caption mt-1 max-w-xs">Six invented texts covering the cases that matter. They load into the sheet; the readings come from the live analysis.</p>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {EXAMPLES.map((example) => (
                  <li key={example.id}>
                    <button type="button" onClick={() => loadExample(example)} className="press group flex w-full items-start gap-3 px-2 py-3 text-left hover:bg-ink-2/70">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-dim transition-colors group-hover:text-signal" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-paper">
                          {example.title}
                          <Badge>{example.kind}</Badge>
                        </span>
                        <span className="t-caption mt-0.5 block">{example.note}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {phase === 'done' && result && (
        <div>
          <div className="no-print mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line pb-5">
            <p className="t-caption max-w-2xl">
              {result.analysis_id ? (
                <>
                  Saved to your{' '}
                  <Link to={`/history/${result.analysis_id}`} className="text-signal underline decoration-signal/30 hover:decoration-signal">
                    Casebook
                  </Link>
                  .
                </>
              ) : (
                'Not saved. Sign in before analysing to keep an investigation.'
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={reset}>
                Edit and re-run
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setText('')
                  setTitle('')
                  setUrl('')
                  setTouched(false)
                  reset()
                }}
              >
                New investigation
              </Button>
            </div>
          </div>
          <Report result={result} text={submitted?.mode === 'text' ? submitted.text : undefined} title={submitted?.title} stamp={stamp} headingRef={headingRef} />
        </div>
      )}
    </div>
  )
}
