import { Copy, Download, FileText, Pencil, Plus, Printer } from 'lucide-react'
import Button from '../ui/Button'
import { useToast } from '../ui/Toast'
import { buildFullReportText, buildSummaryText } from './reportModel'

/**
 * Title, metadata and every report action. Each button does something real:
 * copy summary / full report (clipboard), JSON download, print, re-run and new investigation (callbacks from the page).
 * Nothing is stored on a server in this edition: a report exists only in the browser until it is copied or downloaded.
 */
export default function ReportHeader({ result, title, text, stamp, inputType, headingRef, onRerun, onNew }) {
  const toast = useToast()

  const copy = async (build, done) => {
    try {
      await navigator.clipboard.writeText(build())
      toast({ title: done, description: 'It includes the limitations, so it can be shared with them attached.' })
    } catch {
      toast({ title: 'Could not copy', description: 'Your browser blocked clipboard access.', tone: 'error' })
    }
  }
  const downloadJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `veritas-analysis-${new Date().toISOString().slice(0, 10)}.json` })
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
      <div className="min-w-0 max-w-3xl">
        <p className="t-eyebrow mb-2">Investigation report</p>
        <h2 id="report-title" ref={headingRef} tabIndex={-1} className="t-h1 outline-none">
          {title}
        </h2>
        <dl className="t-meta mt-4 flex flex-wrap gap-x-5 gap-y-1">
          {[
            ['Analysed', stamp],
            ['Length', `${result.word_count} words`],
            ['Input', inputType],
            result.source ? ['Source', result.source.domain] : null,
          ]
            .filter((pair) => pair && pair[1])
            .map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <dt>{k}</dt>
                <dd className="text-steel">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => copy(() => buildSummaryText(result, { title }), 'Summary copied')}>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy summary
        </Button>
        <Button variant="secondary" size="sm" onClick={() => copy(() => buildFullReportText(result, { title, text }), 'Full report copied')}>
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Copy full report
        </Button>
        <Button variant="secondary" size="sm" onClick={downloadJson}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          JSON
        </Button>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Print
        </Button>
        {onRerun && (
          <Button variant="secondary" size="sm" onClick={onRerun}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit and re-run
          </Button>
        )}
        {onNew && (
          <Button variant="ghost" size="sm" onClick={onNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New investigation
          </Button>
        )}
      </div>
    </header>
  )
}
