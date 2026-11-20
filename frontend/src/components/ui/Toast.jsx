import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, X } from 'lucide-react'

const ToastContext = createContext(null)
const LIFETIME = 4200

/** Provides `toast({ title, description, tone })`. Toasts sit in a polite live region and dismiss themselves. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])
  const toast = useCallback(
    ({ title, description, tone = 'success' }) => {
      const id = ++counter.current
      setToasts((list) => [...list.slice(-2), { id, title, description, tone }])
      setTimeout(() => dismiss(id), LIFETIME)
    },
    [dismiss],
  )
  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line-strong bg-ink-3 p-3.5 shadow-float">
            {t.tone === 'success' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-support" aria-hidden="true" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-contra" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-paper">{t.title}</p>
              {t.description && <p className="t-caption mt-0.5">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="press -m-1 rounded p-1 text-dim hover:text-paper">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx.toast
}
