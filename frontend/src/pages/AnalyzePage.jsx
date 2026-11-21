import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Gauge, ScanSearch, ShieldHalf } from 'lucide-react'
import AnalysisScan from '../components/analysis/AnalysisScan'
import InvestigationPanel from '../components/investigate/InvestigationPanel'
import Report from '../components/report/Report'
import { EXAMPLES } from '../data/examples'
import { validateInput } from '../data/limits'
import { useHotkey } from '../hooks/useHotkey'
import { analyzeText, analyzeUrl, describeError } from '../services/analysisService'

const EMPTY = { mode: 'text', title: '', text: '', url: '' }
const isCancel = (error) => error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'

export default function AnalyzePage() {
  const location = useLocation()
  const [value, setValue] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [submitted, setSubmitted] = useState(null)
  const [stamp, setStamp] = useState(null)
  const [autoSubmit, setAutoSubmit] = useState(false)
  const controller = useRef(null)
  const headingRef = useRef(null)
  const textRef = useRef(null)

  const patch = useCallback((next) => setValue((current) => ({ ...current, ...next })), [])
  const problem = validateInput(value.mode, value)

  const loadExample = useCallback((example) => {
    setValue({ ...EMPTY, text: example.text })
    setTouched(false)
    setError(null)
    setResult(null)
    setPhase('idle')
  }, [])

  // A demo input chosen from the Casebook or the command palette.
  const requested = location.state?.example
  useEffect(() => {
    const example = EXAMPLES.find((e) => e.id === requested)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (example) loadExample(example)
  }, [requested, loadExample])

  // A draft handed over by the landing page, a Casebook case or the sign-in page: fill the form, then submit it once.
  const draft = location.state?.draft
  useEffect(() => {
    if (!draft) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setValue({ mode: draft.mode, title: draft.title ?? '', text: draft.text ?? '', url: draft.url ?? '' })
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
    const snapshot = { mode: value.mode, title: value.title.trim(), text: value.text, url: value.url.trim() }
    setSubmitted(snapshot)
    setStamp(new Date().toLocaleString())
    try {
      const data =
        snapshot.mode === 'text'
          ? await analyzeText({ title: snapshot.title || null, text: snapshot.text }, { signal: controller.current.signal })
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

  useEffect(() => {
    if (!autoSubmit) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoSubmit(false)
    submit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit])

  const cancel = () => {
    controller.current?.abort()
    setPhase('idle')
  }
  const backToInput = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    requestAnimationFrame(() => (value.mode === 'text' ? textRef.current : document.getElementById('url'))?.focus())
  }
  const startNew = () => {
    setValue(EMPTY)
    setTouched(false)
    backToInput()
  }

  useHotkey('mod+enter', submit, { allowInInputs: true, enabled: phase === 'idle' })
  useEffect(() => () => controller.current?.abort(), [])

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-8 lg:py-14">
      {phase === 'done' ? (
        <h1 className="sr-only">Investigation report</h1>
      ) : (
        <div className="mb-10 max-w-3xl">
          <p className="t-eyebrow mb-3">Investigation workspace</p>
          <h1 className="t-h1">Open an investigation</h1>
          <p className="t-lead mt-4">Submit text or an article address. You get three separate readings and an honest account of how far to trust them. None of them says whether the text is true.</p>
        </div>
      )}

      {phase === 'running' && submitted ? (
        <AnalysisScan mode={submitted.mode} title={submitted.title} text={submitted.text} url={submitted.url} onCancel={cancel} />
      ) : phase === 'done' && result ? (
        <Report
          result={result}
          text={submitted?.mode === 'text' ? submitted.text : undefined}
          title={submitted?.title}
          stamp={stamp}
          headingRef={headingRef}
          onRerun={backToInput}
          onNew={startNew}
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <InvestigationPanel value={value} onChange={patch} onSubmit={submit} touched={touched} onTouch={setTouched} error={error} showHeadline textRef={textRef} onClear={() => setValue(EMPTY)} />
            <p className="t-caption mt-4">Nothing is saved: the analysis runs on the server and the report exists only in this browser tab.</p>
          </div>
          <aside aria-label="How to read the result" className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <h2 className="t-h3">What comes back</h2>
              <ul className="mt-4 space-y-4">
                {[
                  [Gauge, 'Writing-style reading', 'Whether the style resembles examples labelled reliable or unreliable.'],
                  [ScanSearch, 'Related reference material', 'Passages that share wording with the text, with sources. Relevance only.'],
                  [ShieldHalf, 'Trust in the analysis', 'How far to rely on the two readings above, and why.'],
                ].map(([Icon, title, body]) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-3 text-violet">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-paper">{title}</p>
                      <p className="t-caption">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="t-caption mt-6 border-t border-line pt-4">VERITAS does not independently verify whether an article’s claims are true or false.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
