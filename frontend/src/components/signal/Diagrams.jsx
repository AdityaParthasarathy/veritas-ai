// Small geometric diagrams of the four readings. They are illustrations of what each instrument measures, drawn as
// vector geometry; they contain no data and are not results.

const STROKE = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

export function StyleDiagram() {
  return (
    <svg viewBox="0 0 160 64" className="h-24 w-56" aria-hidden="true" {...STROKE}>
      <line x1="6" y1="38" x2="154" y2="38" stroke="#3A424D" strokeWidth="1" />
      {Array.from({ length: 21 }, (_, i) => (
        <line key={i} x1={6 + i * 7.4} y1={38 - (i === 10 ? 9 : i % 2 ? 3 : 5)} x2={6 + i * 7.4} y2={38 + (i === 10 ? 9 : i % 2 ? 3 : 5)} stroke={i === 10 ? '#8691A0' : '#3A424D'} strokeWidth="1" />
      ))}
      <path d="M104 12 L104 38" stroke="#57D8E6" strokeWidth="1.6" />
      <path d="M99.5 8 L108.5 8 L104 15 Z" fill="#57D8E6" stroke="none" />
    </svg>
  )
}

export function SignalsDiagram() {
  const rows = [0.7, 0.2, 0.45, 0, 0.9, 0.12]
  return (
    <svg viewBox="0 0 160 64" className="h-24 w-56" aria-hidden="true" {...STROKE}>
      {rows.map((v, i) => (
        <g key={i}>
          <line x1="6" y1={8 + i * 9.5} x2="154" y2={8 + i * 9.5} stroke="#262C34" strokeWidth="1" />
          <line x1="6" y1={8 + i * 9.5} x2={6 + 148 * v} y2={8 + i * 9.5} stroke={v > 0.6 ? '#E5A93E' : '#8691A0'} strokeWidth="2" />
        </g>
      ))}
    </svg>
  )
}

export function EvidenceDiagram() {
  return (
    <svg viewBox="0 0 160 64" className="h-24 w-56" aria-hidden="true" {...STROKE}>
      <path d="M6 14 H72 M6 24 H60 M6 34 H68" stroke="#A3ACB7" strokeWidth="1.5" />
      <path d="M6 24 H60" stroke="#57D8E6" strokeWidth="2" />
      <path d="M66 18 L72 18 L72 30 L66 30" stroke="#57D8E6" strokeWidth="1.4" />
      <path d="M72 24 H104" stroke="#57D8E6" strokeWidth="1" strokeDasharray="3 3" />
      <rect x="104" y="12" width="48" height="40" rx="3" stroke="#3A424D" strokeWidth="1.4" />
      <path d="M112 22 H144 M112 30 H140 M112 38 H134" stroke="#3A424D" strokeWidth="1.4" />
    </svg>
  )
}

export function TrustDiagram() {
  return (
    <svg viewBox="0 0 160 64" className="h-24 w-56" aria-hidden="true" {...STROKE}>
      <rect x="40" y="38" width="22" height="16" rx="2" fill="#E5A93E" fillOpacity="0.75" />
      <rect x="68" y="26" width="22" height="28" rx="2" fill="#262C34" />
      <rect x="96" y="12" width="22" height="42" rx="2" fill="#262C34" />
    </svg>
  )
}
