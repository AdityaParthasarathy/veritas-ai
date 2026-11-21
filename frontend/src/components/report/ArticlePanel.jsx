import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import DocumentProof from './DocumentProof'

/** The analysed text, collapsed to a preview. The full text stays in the page so matched sentences remain linkable. */
export default function ArticlePanel({ text, hits, activeRef, onActivate }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div>
      <div id={id} className={`relative overflow-hidden transition-[max-height] duration-slow ease-out ${open ? 'max-h-[40rem]' : 'max-h-44'}`}>
        <DocumentProof text={text} hits={hits} activeRef={activeRef} onActivate={onActivate} />
        {!open && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-1 to-transparent" />}
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="press mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-[0.8125rem] text-steel hover:border-violet hover:text-paper">
        {open ? 'Collapse article' : 'Expand article'}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-base ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
    </div>
  )
}
