import { useInView } from '../../hooks/useInView'

/**
 * Reveals its children once as they scroll into view. Content is visible by default; hiding only applies while
 * the observer has not yet reported the element, and never in environments without IntersectionObserver.
 */
export default function Reveal({ as: Tag = 'div', variant = 'rise', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return (
    <Tag ref={ref} className={`reveal ${variant === 'wipe' ? 'reveal-wipe' : ''} ${inView ? '' : 'is-pending'} ${className}`} style={{ transitionDelay: inView ? `${delay}ms` : '0ms', ...style }} {...rest}>
      {children}
    </Tag>
  )
}
