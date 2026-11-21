// Single source of truth for the VERITAS visual system.
// Consumed by tailwind.config.js (classes + CSS variables), canvas/SVG drawing code and the contrast test.
//
// World: a night-time intelligence console. Deep midnight indigo ground, glass panels layered on it, violet for
// action, cyan for analysis (the instrument at work), amber for caution. Green and red are reserved for system
// state and the descriptive style reading; they never mean "true" or "false".

export const colors = {
  ink: { 0: '#080A18', 1: '#0D1124', 2: '#141A32', 3: '#1C2344' }, // page, raised, elevated, hover
  line: { DEFAULT: '#262E57', strong: '#3B4580' },
  paper: '#F5F4FF', // primary text
  steel: '#A8B0CB', // secondary text
  dim: '#8791B3', // tertiary text and metadata (lifted from the brief's #737E9D to hold AA on raised surfaces)
  brand: { DEFAULT: '#7654F6', strong: '#8F72FF', deep: '#2A2073' }, // primary action
  violet: '#A78BFA', // highlights on action surfaces
  signal: { DEFAULT: '#45D9E8', strong: '#86EAF3', deep: '#0F3E52' }, // analysis and data
  caution: '#F5B84B',
  support: '#35D6A0',
  contra: '#F06A79',
}

export const fonts = {
  display: ['Sora', 'Inter', 'system-ui', 'sans-serif'], // landing headlines and page titles
  sans: ['Inter', 'system-ui', 'sans-serif'], // application interface
  mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace'], // ids, timestamps, measurements
  serif: ['"Instrument Serif"', 'Georgia', 'serif'], // editorial accent: replacement words only
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
  vars['--glass-border'] = 'rgba(167, 139, 250, 0.16)'
  return vars
}
