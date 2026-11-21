import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

const VARIANTS = {
  primary: 'bg-brand-gradient text-white shadow-glow hover:brightness-110 disabled:bg-none disabled:bg-line disabled:text-dim disabled:shadow-none',
  secondary: 'border border-line-strong bg-ink-2/50 text-paper hover:border-violet hover:bg-ink-3 disabled:border-line disabled:text-dim',
  ghost: 'text-steel hover:bg-ink-3 hover:text-paper disabled:text-dim',
  danger: 'border border-contra/50 text-contra hover:bg-contra hover:text-ink-0 disabled:border-line disabled:text-dim',
}
const SIZES = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2.5',
}

/**
 * Button or router link. `magnetic` adds a small pull toward the pointer (fine pointers only, never with
 * reduced motion); `loading` swaps the icon for a spinner and blocks repeat activation.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  magnetic = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const classes = `press inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`

  const onMove = (event) => {
    if (!magnetic || reduced || event.pointerType === 'touch') return
    const node = ref.current
    if (!node) return
    const box = node.getBoundingClientRect()
    const dx = (event.clientX - (box.left + box.width / 2)) / box.width
    const dy = (event.clientY - (box.top + box.height / 2)) / box.height
    node.style.transform = `translate(${(dx * 6).toFixed(2)}px, ${(dy * 4).toFixed(2)}px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  const magnet = magnetic ? { onPointerMove: onMove, onPointerLeave: onLeave } : {}
  const content = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...magnet} {...rest}>
        {content}
      </Link>
    )
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...magnet} {...rest}>
        {content}
      </a>
    )
  }
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...magnet} {...rest}>
      {content}
    </button>
  )
}
