import { useEffect, useRef } from 'react'

const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/**
 * Registers a keyboard shortcut. `combo` examples: 'mod+k', 'mod+enter', '/'.
 * `mod` is Ctrl or Cmd. Plain-key shortcuts are ignored while the user is typing in a field.
 */
export function useHotkey(combo, handler, { enabled = true, allowInInputs = false } = {}) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return undefined
    const parts = combo.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const wantsMod = parts.includes('mod')
    const onKeyDown = (event) => {
      const mod = event.ctrlKey || event.metaKey
      if (wantsMod !== mod) return
      if (event.key.toLowerCase() !== key) return
      if (!wantsMod && !allowInInputs && isTyping(event.target)) return
      event.preventDefault()
      handlerRef.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [combo, enabled, allowInInputs])
}
