import { Link } from 'react-router-dom'
import Modal from '../ui/Modal'
import { NAV_ITEMS } from './navigation'

/** Full navigation for narrow screens, presented as a bottom sheet with focus management. */
export default function MobileNav({ open, onClose }) {
  const link = 'press flex items-baseline justify-between rounded-md px-1 py-3 text-lg font-semibold tracking-tight text-paper hover:text-violet'
  return (
    <Modal open={open} onClose={onClose} title="Navigate">
      <nav aria-label="Mobile">
        <ul className="divide-y divide-line">
          <li>
            <Link to="/" onClick={onClose} className={link}>
              Home
            </Link>
          </li>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} onClick={onClose} className={link}>
                {item.label}
                <span className="t-caption ml-4 hidden text-right font-sans text-sm font-normal min-[460px]:block">{item.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Modal>
  )
}
