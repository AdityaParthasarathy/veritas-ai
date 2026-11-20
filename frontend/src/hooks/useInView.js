import { useEffect, useRef, useState } from 'react'

/**
 * Reports whether an element has entered the viewport. With `once`, it latches true.
 * Environments without IntersectionObserver (tests, very old browsers) report visible.
 */
export function useInView({ once = true, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null)
  const supported = typeof IntersectionObserver !== 'undefined'
  const [inView, setInView] = useState(!supported)

  useEffect(() => {
    const node = ref.current
    if (!node || !supported) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [once, rootMargin, supported])

  return [ref, inView]
}
