import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './examples'

const samples = resolve(import.meta.dirname, '../../../docs/samples')

describe('demo inputs', () => {
  it('have unique ids and the fields the UI needs', () => {
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length)
    for (const e of EXAMPLES) {
      expect(e.title && e.kind && e.note && e.text.length).toBeTruthy()
    }
  })

  // The repository copy in docs/samples is the source of truth; skipped in a frontend-only checkout.
  it.skipIf(!existsSync(samples))('match docs/samples exactly', () => {
    for (const e of EXAMPLES) {
      expect(e.text).toBe(readFileSync(resolve(samples, `${e.id}.txt`), 'utf-8').trim().replace(/\r\n/g, '\n'))
    }
  })
})
