import { describe, it, expect } from 'vitest'
import { deriveTokens, generateThemeCSS } from '../generate'
import { ThemeColor } from '../ThemeColor'
import { DEFAULT_DARK } from '../types'

/** Parse a CSS color and return RGB tuple */
function rgb(css: string): [number, number, number] {
  if (css.startsWith('rgba')) {
    const m = css.match(/rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/)!
    return [+m[1], +m[2], +m[3]]
  }
  const c = ThemeColor.parse(css)
  return c.toRGB()
}

/** Assert two colors match within ±tolerance per RGB channel */
function expectColorMatch(actual: string, expected: string, tolerance = 1) {
  const [ar, ag, ab] = rgb(actual)
  const [er, eg, eb] = rgb(expected)
  expect(ar, `R: ${actual} vs ${expected}`).toBeGreaterThanOrEqual(er - tolerance)
  expect(ar, `R: ${actual} vs ${expected}`).toBeLessThanOrEqual(er + tolerance)
  expect(ag, `G: ${actual} vs ${expected}`).toBeGreaterThanOrEqual(eg - tolerance)
  expect(ag, `G: ${actual} vs ${expected}`).toBeLessThanOrEqual(eg + tolerance)
  expect(ab, `B: ${actual} vs ${expected}`).toBeGreaterThanOrEqual(eb - tolerance)
  expect(ab, `B: ${actual} vs ${expected}`).toBeLessThanOrEqual(eb + tolerance)
}

describe('deriveTokens', () => {
  const tokens = deriveTokens(DEFAULT_DARK)

  it('surface-0 matches input', () => {
    expectColorMatch(tokens['surface-0'], '#111111')
  })

  it('surface-1 ≈ #1b1b1b', () => {
    expectColorMatch(tokens['surface-1'], '#1b1b1b')
  })

  it('surface-2 ≈ #262626', () => {
    expectColorMatch(tokens['surface-2'], '#262626')
  })

  it('surface-3 ≈ #3f3f3f', () => {
    expectColorMatch(tokens['surface-3'], '#3f3f3f')
  })

  it('text-primary matches input', () => {
    expectColorMatch(tokens['text-primary'], '#f0f0f0')
  })

  it('text-secondary ≈ #a1a1a1', () => {
    expectColorMatch(tokens['text-secondary'], '#a1a1a1', 2)
  })

  it('text-muted ≈ #717171', () => {
    expectColorMatch(tokens['text-muted'], '#717171', 2)
  })

  it('border ≈ #323232', () => {
    expectColorMatch(tokens.border, '#323232', 2)
  })

  it('border-accent ≈ #3e3e3e', () => {
    expectColorMatch(tokens['border-accent'], '#3e3e3e', 2)
  })

  it('accent matches input', () => {
    expectColorMatch(tokens.accent, '#0c8ce9')
  })

  it('accent-hover is lighter than accent', () => {
    const [ar] = rgb(tokens.accent)
    const [hr] = rgb(tokens['accent-hover'])
    expect(hr).toBeGreaterThan(ar)
  })

  it('destructive matches input', () => {
    expectColorMatch(tokens.destructive, '#ef4444')
  })

  it('canvas-bg is darker than surface', () => {
    const [sr] = rgb(tokens['surface-0'])
    const [cr] = rgb(tokens['canvas-bg'])
    expect(cr).toBeLessThan(sr)
  })
})

describe('generateThemeCSS', () => {
  const css = generateThemeCSS(DEFAULT_DARK)

  it('wraps in :root {}', () => {
    expect(css).toMatch(/^:root \{/)
    expect(css).toMatch(/\}$/)
  })

  it('contains all expected properties', () => {
    const expected = [
      'surface-0', 'surface-1', 'surface-2', 'surface-3',
      'text-primary', 'text-secondary', 'text-muted',
      'border', 'border-accent',
      'accent', 'accent-hover',
      'destructive', 'canvas-bg',
    ]
    for (const key of expected) {
      expect(css, `Missing --color-${key}`).toContain(`--color-${key}:`)
    }
  })

})
