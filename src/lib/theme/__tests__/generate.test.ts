import { describe, it, expect } from 'vitest'
import { deriveTokens, generateThemeCSS } from '../generate'
import { ThemeColor } from '../ThemeColor'
import { DEFAULT_DARK, DEFAULT_LIGHT } from '../types'

/** Parse a CSS color and return RGB tuple */
function rgb(css: string): [number, number, number] {
  if (css.startsWith('rgba')) {
    const m = css.match(/rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/)!
    return [+m[1], +m[2], +m[3]]
  }
  if (css.startsWith('color-mix')) {
    // Can't easily parse color-mix, skip RGB comparison
    return [0, 0, 0]
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

describe('deriveTokens (dark)', () => {
  const tokens = deriveTokens(DEFAULT_DARK)

  it('surface-0 matches input', () => {
    expectColorMatch(tokens['surface-0'], '#282828')
  })

  it('surface-1 ≈ #333333', () => {
    expectColorMatch(tokens['surface-1'], '#333333', 2)
  })

  it('surface-2 ≈ #434343', () => {
    expectColorMatch(tokens['surface-2'], '#434343', 2)
  })

  it('surface-3 ≈ #505050', () => {
    expectColorMatch(tokens['surface-3'], '#505050', 2)
  })

  it('text-primary matches input', () => {
    expectColorMatch(tokens['text-primary'], '#ffffff')
  })

  it('text-secondary ≈ #b3b3b3', () => {
    expectColorMatch(tokens['text-secondary'], '#b3b3b3', 2)
  })

  it('text-muted ≈ #787878', () => {
    expectColorMatch(tokens['text-muted'], '#787878', 2)
  })

  it('border ≈ #3a3a3a', () => {
    expectColorMatch(tokens.border, '#3a3a3a', 2)
  })

  it('border-accent ≈ #434343', () => {
    expectColorMatch(tokens['border-accent'], '#434343', 2)
  })

  it('accent matches input', () => {
    expectColorMatch(tokens.accent, '#3378F6')
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

  it('fg-default is white', () => {
    expect(tokens['fg-default']).toBe('#ffffff')
  })

  it('surface-vibrancy is translucent', () => {
    expect(tokens['surface-vibrancy']).toMatch(/^rgba\(/)
  })

  it('control-border is transparent in dark mode', () => {
    expect(tokens['control-border']).toBe('transparent')
  })
})

describe('deriveTokens (light)', () => {
  const tokens = deriveTokens(DEFAULT_LIGHT)

  it('surface-0 matches input (white)', () => {
    expectColorMatch(tokens['surface-0'], '#ffffff')
  })

  it('surface-1 is darker than surface-0', () => {
    const [s0] = rgb(tokens['surface-0'])
    const [s1] = rgb(tokens['surface-1'])
    expect(s1).toBeLessThan(s0)
  })

  it('text-primary is dark', () => {
    const [r] = rgb(tokens['text-primary'])
    expect(r).toBeLessThan(50)
  })

  it('fg-default matches text', () => {
    expectColorMatch(tokens['fg-default'], tokens['text-primary'])
  })

  it('accent matches input', () => {
    expectColorMatch(tokens.accent, '#3378F6')
  })

  it('accent-hover is darker than accent', () => {
    const [ar] = rgb(tokens.accent)
    const [hr] = rgb(tokens['accent-hover'])
    expect(hr).toBeLessThan(ar)
  })

  it('surface-vibrancy is translucent', () => {
    expect(tokens['surface-vibrancy']).toMatch(/^rgba\(/)
  })

  it('control-border is visible in light mode', () => {
    expect(tokens['control-border']).not.toBe('transparent')
  })

  it('control-bg equals surface-1 (unified across modes)', () => {
    const [cb] = rgb(tokens['control-bg'])
    const [s1] = rgb(tokens['surface-1'])
    expect(cb).toBe(s1)
  })
})

describe('generateThemeCSS', () => {
  const css = generateThemeCSS(DEFAULT_DARK)

  it('wraps in :root {}', () => {
    expect(css).toMatch(/^:root \{/)
    expect(css).toMatch(/\}$/)
  })

  it('contains all token properties', () => {
    const expected = [
      'surface-0', 'surface-sunken', 'surface-vibrancy',
      'surface-1', 'surface-2', 'surface-3',
      'text-primary', 'text-secondary', 'text-muted',
      'border', 'border-accent',
      'accent', 'accent-hover', 'accent-text',
      'destructive',
      'canvas-bg',
      'fg-default', 'fg-muted', 'fg-subtle',
      'bg-overlay',
      'control-bg', 'control-border',
      'chrome-border',
      'float-border',
    ]
    for (const key of expected) {
      expect(css, `Missing --color-${key}`).toContain(`--color-${key}:`)
    }
  })
})
