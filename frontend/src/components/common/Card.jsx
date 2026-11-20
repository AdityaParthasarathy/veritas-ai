export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-xl border border-veritas-border-subtle bg-veritas-card/80 p-5 transition-colors duration-200 hover:border-white/15 ${className}`}>
      {children}
    </div>
  )
}
