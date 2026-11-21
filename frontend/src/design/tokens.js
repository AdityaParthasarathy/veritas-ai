// Single source of truth for the VERITAS visual system.
// Consumed by tailwind.config.js (classes + CSS variables), canvas/SVG drawing code and the contrast test.
//
// World: a night-time intelligence console. Deep midnight indigo ground, glass panels layered on it, violet for
// action, cyan for analysis (the instrument at work), amber for caution. Green and red are reserved for system
// state and the descriptive style reading; they never mean "true" or "false".

export const colors = {
  ink: { 0: '#080B18', 1: '#0D1224', 2: '#141B35', 3: '#1A2342' }, // page, raised, elevated, higher
  line: { DEFAULT: '#242C52', strong: '#38417A' },
  paper: '#F4F5FF', // primary text
  steel: '#A3AEC9', // secondary text
  dim: '#8793AF', // muted text (lifted from the brief's #77839F: that value measures 4.06:1 on the highest surface)
  brand: { DEFAULT: '#8060FF', strong: '#9A80FF', deep: '#2A2073' }, // primary accent
  violet: '#A78BFA', // highlights on action surfaces
  signal: { DEFAULT: '#48D9ED', strong: '#8EEAF6', deep: '#0F3E52' }, // analysis and data
  caution: '#F5B84B',
  support: '#37D3A8',
  contra: '#EE6F7C',
}

export const fonts = {
  display: ['Inter', 'system-ui', 'sans-serif'], // headings: Inter at heavier weight and tighter tracking
  sans: ['Inter', 'system-ui', 'sans-serif'], // interface and body
  mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'], // ids, timestamps, measurements
  serif: ['"Instrument Serif"', 'Georgia', 'serif'], // editorial display: the hero line and the story's replacement words
}

// Motion: durations in ms, easings as CSS values.
export const motion = {
  fast: 140, // press and hover feedback
  base: 240, // routine state changes
  slow: 460, // overlays, layout
  cinematic: 900, // authored focal moments only
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
}

export const radius = { sm: '6px', md: '10px', lg: '14px', xl: '20px', '2xl': '28px' }

// Flatten the colour map to CSS custom properties (--c-ink-0, --c-paper ...).
export function cssVariables() {
  const vars = {}
  const walk = (value, path) => {
    if (typeof value === 'string') vars[`--c-${path.join('-')}`] = value
    else for (const [key, child] of Object.entries(value)) walk(child, key === 'DEFAULT' ? path : [...path, key])
  }
  walk(colors, [])
  vars['--dur-fast'] = `${motion.fast}ms`
  vars['--dur-base'] = `${motion.base}ms`
  vars['--dur-slow'] = `${motion.slow}ms`
  vars['--dur-cinematic'] = `${motion.cinematic}ms`
  vars['--ease-out'] = motion.easeOut
  vars['--ease-in-out'] = motion.easeInOut
  vars['--glass'] = 'rgba(30, 35, 75, 0.55)'
  vars['--glass-border'] = 'rgba(150, 130, 255, 0.18)'
  return vars
}
