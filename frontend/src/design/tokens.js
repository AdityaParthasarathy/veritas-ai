// Single source of truth for the VERITAS visual system.
// Consumed by tailwind.config.js (classes + CSS variables), canvas drawing code and the contrast test.
//
// Scene: an investigator at a desk late in the evening, reading long text on a dim screen.
// The ground is obsidian; colour is reserved for meaning (signal cyan = the instrument at work,
// amber = caution, green/red = semantic states, never "true"/"false").

export const colors = {
  ink: { 0: '#07080A', 1: '#0C0E11', 2: '#121519', 3: '#191D22' }, // page, raised, panel, elevated
  line: { DEFAULT: '#262C34', strong: '#3A424D' },
  paper: '#EBE7DD', // primary text, warm off-white
  steel: '#A3ACB7', // secondary text
  dim: '#8691A0', // tertiary text and metadata
  signal: { DEFAULT: '#57D8E6', strong: '#86E7F1', deep: '#103B42' },
  caution: '#E5A93E',
  support: '#6FBD92',
  contra: '#E4695F',
}

export const fonts = {
  display: ['"Bodoni Moda"', 'Georgia', 'serif'],
  sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
  mono: ['"Azeret Mono"', 'ui-monospace', 'Consolas', 'monospace'],
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

export const radius = { sm: '4px', md: '8px', lg: '12px', xl: '16px' }

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
  return vars
}
