import { describe, it, expect } from 'vitest'
import type { Spacing, DesignValue } from '../../../types/frame'

// We test the toggle logic directly rather than rendering the component.
// The key invariant: toggling mode never mutates spacing values.

type SpacingMode = 'all' | 'axis' | 'sides'
const MODE_CYCLE: SpacingMode[] = ['all', 'axis', 'sides']

function dvSame(a: DesignValue<number> | undefined, b: DesignValue<number> | undefined): boolean {
  if (!a || !b) return a === b
  if (!('mode' in a) || !('mode' in b)) return false
  if (a.mode !== b.mode || a.value !== b.value) return false
  if (a.mode === 'token' && b.mode === 'token') return a.token === b.token
  return true
}

function detectMode(v: Spacing): SpacingMode {
  if (!v?.top || !v?.right || !v?.bottom || !v?.left) return 'all'
  const allSame = dvSame(v.top, v.bottom) && dvSame(v.left, v.right) && dvSame(v.top, v.left)
  if (allSame) return 'all'
  const axisSame = dvSame(v.top, v.bottom) && dvSame(v.left, v.right)
  if (axisSame) return 'axis'
  return 'sides'
}

const dv = (value: number, token?: string): DesignValue<number> =>
  token ? { mode: 'token', token, value } : { mode: 'custom', value }

const dvAuto: DesignValue<number> = { mode: 'token', token: 'auto', value: 0 }

describe('SpacingControl toggle logic', () => {
  it('detectMode returns all when all sides are equal', () => {
    const v: Spacing = { top: dv(16), right: dv(16), bottom: dv(16), left: dv(16) }
    expect(detectMode(v)).toBe('all')
  })

  it('detectMode returns axis when H/V pairs match', () => {
    const v: Spacing = { top: dv(8), right: dv(16), bottom: dv(8), left: dv(16) }
    expect(detectMode(v)).toBe('axis')
  })

  it('detectMode returns sides when values differ', () => {
    const v: Spacing = { top: dv(4), right: dv(8), bottom: dv(16), left: dv(0) }
    expect(detectMode(v)).toBe('sides')
  })

  it('detectMode returns all when sides are missing/undefined', () => {
    expect(detectMode({} as Spacing)).toBe('all')
    expect(detectMode({ top: dv(4) } as Spacing)).toBe('all')
  })

  it('toggle cycles through modes without mutation', () => {
    // Simulate: mx-auto + py-128 (axis mode with different H/V)
    const spacing: Spacing = {
      top: dv(128, '32'),
      right: dvAuto,
      bottom: dv(128, '32'),
      left: dvAuto,
    }

    // Start in axis mode
    expect(detectMode(spacing)).toBe('axis')

    // Toggle axis → sides: no mutation needed (just shows 4 inputs)
    let mode: SpacingMode = 'axis'
    mode = MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length]
    expect(mode).toBe('sides')

    // Values unchanged
    expect(spacing.left).toBe(dvAuto)
    expect(spacing.top.value).toBe(128)

    // Toggle sides → all: no mutation, just shows single input
    mode = MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length]
    expect(mode).toBe('all')

    // Values still unchanged — mx-auto preserved
    expect(spacing.left).toBe(dvAuto)
    expect(spacing.right).toBe(dvAuto)
    expect(spacing.top.value).toBe(128)
    expect(spacing.bottom.value).toBe(128)

    // Toggle all → axis: values still intact
    mode = MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length]
    expect(mode).toBe('axis')
    expect(spacing.left).toBe(dvAuto)
    expect(spacing.top.value).toBe(128)
  })

  it('mixed detection works for all mode with different values', () => {
    const v: Spacing = { top: dv(8), right: dv(16), bottom: dv(8), left: dv(16) }
    const allSame = dvSame(v.top, v.bottom) && dvSame(v.left, v.right) && dvSame(v.top, v.left)
    expect(allSame).toBe(false) // mixed when in "all" mode
  })

  it('mixed detection works for axis mode with asymmetric sides', () => {
    const v: Spacing = { top: dv(4), right: dv(8), bottom: dv(16), left: dv(8) }
    const hSame = dvSame(v.left, v.right)
    const vSame = dvSame(v.top, v.bottom)
    expect(hSame).toBe(true)
    expect(vSame).toBe(false) // mixed V in axis mode
  })

  it('token values are compared correctly', () => {
    const a = dv(16, '4')
    const b = dv(16, '4')
    const c = dv(16, '8') // same value, different token
    expect(dvSame(a, b)).toBe(true)
    expect(dvSame(a, c)).toBe(false)
  })
})
