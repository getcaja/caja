import { describe, it, expect } from 'vitest'
import { ThemeColor } from '../ThemeColor'

/** Parse hex and compare RGB values within tolerance */
function expectRGB(color: ThemeColor, r: number, g: number, b: number, tolerance = 1) {
  const [cr, cg, cb] = color.toRGB()
  expect(cr).toBeGreaterThanOrEqual(r - tolerance)
  expect(cr).toBeLessThanOrEqual(r + tolerance)
  expect(cg).toBeGreaterThanOrEqual(g - tolerance)
  expect(cg).toBeLessThanOrEqual(g + tolerance)
  expect(cb).toBeGreaterThanOrEqual(b - tolerance)
  expect(cb).toBeLessThanOrEqual(b + tolerance)
}

describe('ThemeColor', () => {
  describe('parse', () => {
    it('parses #rrggbb', () => {
      const c = ThemeColor.parse('#1b1b1b')
      expectRGB(c, 0x1b, 0x1b, 0x1b)
    })

    it('parses #rgb shorthand', () => {
      const c = ThemeColor.parse('#fff')
      expectRGB(c, 255, 255, 255)
    })

    it('parses #000', () => {
      const c = ThemeColor.parse('#000')
      expectRGB(c, 0, 0, 0)
    })

    it('parses chromatic hex', () => {
      const c = ThemeColor.parse('#20744A')
      expectRGB(c, 0x20, 0x74, 0x4a)
    })

    it('parses rgb()', () => {
      const c = ThemeColor.parse('rgb(32, 116, 74)')
      expectRGB(c, 32, 116, 74)
    })

    it('parses hsl()', () => {
      const c = ThemeColor.parse('hsl(0, 0%, 10.6%)')
      expectRGB(c, 27, 27, 27)
    })

    it('throws on invalid input', () => {
      expect(() => ThemeColor.parse('not-a-color')).toThrow()
    })
  })

  describe('lift', () => {
    it('lightens achromatic color', () => {
      const base = ThemeColor.parse('#111111') // L ≈ 6.67%
      const lifted = base.lift(0.042)
      // 6.67 + (100 - 6.67) * 0.042 ≈ 10.59 → ~#1b1b1b
      expectRGB(lifted, 0x1b, 0x1b, 0x1b)
    })

    it('lift(0) is identity', () => {
      const base = ThemeColor.parse('#3f3f3f')
      const same = base.lift(0)
      expect(same.css()).toBe(base.css())
    })

    it('lift(1) produces white', () => {
      const base = ThemeColor.parse('#111111')
      const white = base.lift(1)
      expectRGB(white, 255, 255, 255)
    })

    it('lifts chromatic color', () => {
      const accent = ThemeColor.parse('#20744A')
      const lifted = accent.lift(0.066)
      // Should approximate #25875a
      const [r, g, b] = lifted.toRGB()
      expect(r).toBeGreaterThan(0x20)
      expect(g).toBeGreaterThan(0x74)
      expect(b).toBeGreaterThan(0x4a)
    })
  })

  describe('lower', () => {
    it('darkens text color', () => {
      const text = ThemeColor.parse('#f0f0f0') // L ≈ 94.1%
      const lowered = text.lower(0.329)
      // 94.1 * (1 - 0.329) ≈ 63.1 → ~#a1a1a1
      expectRGB(lowered, 0xa1, 0xa1, 0xa1, 2)
    })

    it('lower(0) is identity', () => {
      const base = ThemeColor.parse('#f0f0f0')
      expect(base.lower(0).css()).toBe(base.css())
    })

    it('lower(1) produces black', () => {
      const base = ThemeColor.parse('#f0f0f0')
      const black = base.lower(1)
      expectRGB(black, 0, 0, 0)
    })
  })

  describe('translucify', () => {
    it('reduces alpha', () => {
      const c = ThemeColor.parse('#4A90D9')
      const t = c.translucify(0.7)
      expect(t.a).toBeCloseTo(0.3, 2)
    })

    it('outputs rgba format', () => {
      const c = ThemeColor.parse('#4A90D9').translucify(0.7)
      expect(c.css()).toMatch(/^rgba\(/)
    })

    it('translucify(0) is identity', () => {
      const c = ThemeColor.parse('#4A90D9')
      expect(c.translucify(0).a).toBe(1)
    })
  })

  describe('css roundtrip', () => {
    it('outputs #rrggbb for opaque', () => {
      const c = ThemeColor.parse('#20744a')
      expect(c.css()).toBe('#20744a')
    })

    it('roundtrips hex values', () => {
      for (const hex of ['#000000', '#ffffff', '#111111', '#3f3f3f', '#ef4444']) {
        const c = ThemeColor.parse(hex)
        expect(c.css()).toBe(hex)
      }
    })
  })
})
