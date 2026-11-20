import { useId } from 'react'

const BASE =
  'w-full rounded-md border border-line bg-ink-1 px-3.5 text-paper transition-[border-color,background-color] duration-fast ease-out hover:border-line-strong focus:border-signal focus:bg-ink-2 focus:outline-none disabled:opacity-50'

function Shell({ id, label, hint, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-3 text-[0.8125rem] font-medium text-steel">
        <span>{label}</span>
        {optional && <span className="t-meta font-sans">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8125rem] text-contra">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="t-caption mt-1.5">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

const describedBy = (id, hint, error) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

/** Single-line input with label, hint and inline error. */
export function Input({ label, hint, error, optional, suffix, className = '', id: idProp, ...rest }) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional}>
      <div className="relative">
        <input id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(id, hint, error)} className={`${BASE} h-11 text-[0.9375rem] ${suffix ? 'pr-11' : ''} ${error ? 'border-contra' : ''} ${className}`} {...rest} />
        {suffix && <div className="absolute inset-y-0 right-1 flex items-center">{suffix}</div>}
      </div>
    </Shell>
  )
}

/** Multi-line input. */
export function Textarea({ label, hint, error, optional, className = '', id: idProp, ...rest }) {
  const generated = useId()
  const id = idProp ?? generated
  return (
    <Shell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy(id, hint, error)} className={`${BASE} py-3 ${error ? 'border-contra' : ''} ${className}`} {...rest} />
    </Shell>
  )
}
