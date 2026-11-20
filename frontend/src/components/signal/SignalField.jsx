import { useEffect, useRef } from 'react'
import { colors } from '../../design/tokens'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// SYNTHETIC demonstration content: invented sentences used only to show what the instrument does.
// kind: 'match' (a reference passage would be retrieved), 'query' (a claim a reader should question), 'noise' (pressure language).
const DEMO_LINES = [
  { text: 'Officials said on Tuesday that the outbreak had reached three more towns.', kind: 'match', tag: 'matched 0.82' },
  { text: 'The department urged parents to check their children’s vaccination records.', kind: null },
  { text: 'A spokesperson declined to say how the figures were compiled.', kind: 'query', tag: 'source?' },
  { text: 'EVERYTHING you were told is a lie and they know it!!!', kind: 'noise', tag: 'noise' },
  { text: 'Clinics will open extra sessions over the next two weeks.', kind: 'match', tag: 'matched 0.74' },
  { text: 'No deaths have been reported, although seven patients needed hospital care.', kind: null },
  { text: 'SHARE this before it is deleted!!!', kind: 'noise', tag: 'noise' },
  { text: 'The study has not been reviewed by outside experts.', kind: 'query', tag: 'unreviewed' },
  { text: 'Schools will stay open, with contacts asked to remain at home.', kind: null },
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const smooth = (t) => t * t * (3 - 2 * t)

/**
 * Signal-versus-noise instrument. Noisy traces resolve into legible proof lines behind a slow scan beam and under the
 * pointer loupe; resolved lines carry proofreader-style margin marks. Decorative (aria-hidden); the surrounding page
 * must label it as a synthetic demonstration. Pauses when offscreen or hidden. With reduced motion it renders one
 * static, fully resolved frame.
 */
export default function SignalField({ variant = 'hero', className = '' }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const quiet = variant === 'quiet'
    const lines = quiet ? DEMO_LINES.slice(0, 6) : DEMO_LINES
    const state = { w: 0, h: 0, layout: null, px: -999, py: -999, radius: 0, targetRadius: 0, raf: 0, visible: true, start: performance.now() - 4200, demo: !reduced, demoStart: performance.now() }

    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      state.w = w
      state.h = h

      const pad = w < 480 ? 16 : 28
      const gutter = !quiet && w >= 560 ? 120 : 0
      const colW = Math.max(160, w - pad * 2 - gutter)
      const rowH = (h - 52) / (lines.length + 1) // leaves room under the last line for the page's caption
      let size = clamp(w / 34, 13, 19)
      ctx.font = `${size}px "Bodoni Moda", Georgia, serif`
      const widest = Math.max(...lines.map((l) => ctx.measureText(l.text).width))
      if (widest > colW) {
        size = Math.max(10, size * (colW / widest))
        ctx.font = `${size}px "Bodoni Moda", Georgia, serif`
      }
      const space = ctx.measureText(' ').width
      const rows = lines.map((line, i) => {
        let x = pad
        const words = line.text.split(' ').map((word) => {
          const width = ctx.measureText(word).width
          const item = { word, x, width }
          x += width + space
          return item
        })
        return { ...line, y: 16 + rowH * (i + 1), words, end: x - space }
      })
      state.layout = { pad, gutter, colW, rowH, size, rows, tagX: pad + colW + 18 }
    }

    const mask = (x, y, beamX, trail) => {
      const beam = x < beamX ? smooth(clamp(1 - (beamX - x) / trail, 0, 1)) : 0
      const dx = x - state.px
      const dy = (y - state.py) * 0.85
      const d = Math.hypot(dx, dy)
      const loupe = state.radius > 1 ? 1 - smooth(clamp((d - state.radius * 0.55) / (state.radius * 0.45), 0, 1)) : 0
      return Math.max(beam, loupe)
    }

    const draw = (now, still) => {
      const { w, h, layout } = state
      if (!layout) return
      const t = (now - state.start) / 1000
      const period = quiet ? 16 : 11
      const trail = w * 0.62
      const beamX = still ? w * 3 : ((t / period) % 1) * (w + trail * 1.4) - trail * 0.2
      // Until the pointer is used, a loupe drifts across the sheet once so the interaction is discoverable.
      if (state.demo && !quiet) {
        const p = (now - state.demoStart) / 4200
        if (p >= 1) {
          state.demo = false
          state.targetRadius = 0
        } else {
          state.px = w * (0.22 + 0.56 * smooth(p))
          state.py = h * (0.3 + 0.32 * Math.sin(p * Math.PI * 1.4))
          state.targetRadius = 120
        }
      }
      state.radius += (state.targetRadius - state.radius) * 0.12

      ctx.clearRect(0, 0, w, h)
      ctx.lineWidth = 1
      const amp = layout.rowH * 0.34
      const step = 5

      layout.rows.forEach((row, i) => {
        // The noise trace, drawn in short segments so alpha can follow the resolve mask.
        let prevX = layout.pad
        let prevY = row.y
        for (let x = layout.pad; x <= layout.pad + layout.colW; x += step) {
          const m = mask(x, row.y, beamX, trail)
          const wave = Math.sin(x * 0.07 + t * 2.3 + i) + 0.6 * Math.sin(x * 0.19 - t * 3.1 + i * 2.1) + 0.4 * Math.sin(x * 0.43 + t * 5.7)
          const y = row.y + amp * (1 - m) * wave * 0.55
          ctx.strokeStyle = colors.steel
          ctx.globalAlpha = 0.08 + 0.34 * (1 - m) * (quiet ? 0.7 : 1)
          ctx.beginPath()
          ctx.moveTo(prevX, prevY)
          ctx.lineTo(x, y)
          ctx.stroke()
          prevX = x
          prevY = y
        }

        // Words fade in as the mask reaches them.
        ctx.font = `${layout.size}px "Bodoni Moda", Georgia, serif`
        ctx.textBaseline = 'middle'
        let lineResolved = 0
        row.words.forEach((word) => {
          const mid = word.x + word.width / 2
          const m = mask(mid, row.y, beamX, trail)
          lineResolved = Math.max(lineResolved, m)
          if (m < 0.04) return
          ctx.globalAlpha = m
          ctx.fillStyle = row.kind === 'noise' ? colors.dim : colors.paper
          ctx.fillText(word.word, word.x, row.y)
          if (row.kind === 'noise') {
            ctx.strokeStyle = colors.steel
            ctx.beginPath()
            ctx.moveTo(word.x, row.y)
            ctx.lineTo(word.x + word.width, row.y)
            ctx.stroke()
          }
        })

        // Proofreader's margin mark, shown once the end of the line has resolved.
        if (row.kind && layout.gutter) {
          const endM = mask(row.end, row.y, beamX, trail)
          if (endM > 0.05) {
            ctx.globalAlpha = endM
            const mx = layout.tagX
            ctx.lineWidth = 1.4
            if (row.kind === 'match') {
              ctx.strokeStyle = colors.signal.DEFAULT
              ctx.fillStyle = colors.signal.DEFAULT
              ctx.beginPath()
              ctx.moveTo(layout.pad + layout.colW + 8, row.y - 9)
              ctx.lineTo(layout.pad + layout.colW + 12, row.y - 9)
              ctx.lineTo(layout.pad + layout.colW + 12, row.y + 9)
              ctx.lineTo(layout.pad + layout.colW + 8, row.y + 9)
              ctx.stroke()
            } else if (row.kind === 'query') {
              ctx.strokeStyle = colors.caution
              ctx.fillStyle = colors.caution
              ctx.beginPath()
              ctx.arc(mx + 5, row.y, 6.5, 0, Math.PI * 2)
              ctx.stroke()
              ctx.font = '600 10px "Azeret Mono", monospace'
              ctx.fillText('?', mx + 2.4, row.y + 0.5)
            } else {
              ctx.strokeStyle = colors.dim
              ctx.fillStyle = colors.dim
              ctx.beginPath()
              ctx.moveTo(mx, row.y - 5)
              ctx.lineTo(mx + 10, row.y + 5)
              ctx.moveTo(mx + 10, row.y - 5)
              ctx.lineTo(mx, row.y + 5)
              ctx.stroke()
            }
            ctx.lineWidth = 1
            ctx.font = '11px "Azeret Mono", monospace'
            ctx.fillText(row.tag, mx + 18, row.y + 0.5)
          }
        }
        void lineResolved
      })

      // The scan beam.
      if (!still && beamX > 0 && beamX < w) {
        ctx.globalAlpha = 0.55
        ctx.strokeStyle = colors.signal.DEFAULT
        ctx.beginPath()
        ctx.moveTo(beamX, 6)
        ctx.lineTo(beamX, h - 6)
        ctx.stroke()
        const gradient = ctx.createLinearGradient(beamX - 46, 0, beamX, 0)
        gradient.addColorStop(0, 'rgba(87,216,230,0)')
        gradient.addColorStop(1, 'rgba(87,216,230,0.07)')
        ctx.globalAlpha = 1
        ctx.fillStyle = gradient
        ctx.fillRect(beamX - 46, 0, 46, h)
      }
      ctx.globalAlpha = 1
    }

    const loop = (now) => {
      if (state.visible && document.visibilityState === 'visible') draw(now, false)
      state.raf = requestAnimationFrame(loop)
    }

    const render = () => {
      measure()
      draw(performance.now(), reduced)
    }

    const onMove = (event) => {
      if (event.pointerType === 'touch') return
      state.demo = false
      const box = canvas.getBoundingClientRect()
      state.px = event.clientX - box.left
      state.py = event.clientY - box.top
      state.targetRadius = variant === 'hero' ? 130 : 90
    }
    const onLeave = () => {
      state.targetRadius = 0
    }

    let cancelled = false
    const fontReady = document.fonts?.load ? Promise.all([document.fonts.load('17px "Bodoni Moda"'), document.fonts.load('11px "Azeret Mono"')]) : Promise.resolve()
    fontReady.catch(() => {}).then(() => {
      if (cancelled) return
      render()
      if (!reduced) state.raf = requestAnimationFrame(loop)
    })

    const resizeObserver = new ResizeObserver(render)
    resizeObserver.observe(wrap)
    const intersection = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting
    })
    intersection.observe(wrap)
    if (!reduced) {
      wrap.addEventListener('pointermove', onMove)
      wrap.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(state.raf)
      resizeObserver.disconnect()
      intersection.disconnect()
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
    }
  }, [variant, reduced])

  return (
    <div ref={wrapRef} role="img" aria-label="Decorative demonstration with invented text: noisy lines resolving into legible sentences, with proofreader-style margin marks." className={`${className.includes('absolute') ? '' : 'relative'} ${className}`}>
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </div>
  )
}
