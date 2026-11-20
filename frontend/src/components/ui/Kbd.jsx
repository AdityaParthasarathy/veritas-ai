/** Keyboard key hint. */
export default function Kbd({ children }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line-strong bg-ink-2 px-1 font-mono text-[0.6875rem] text-steel">
      {children}
    </kbd>
  )
}
