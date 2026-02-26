/**
 * Zero-dependency HSL color manipulation.
 * Immutable — all operations return new instances.
 */
export class ThemeColor {
  constructor(
    readonly h: number,
    readonly s: number,
    readonly l: number,
    readonly a: number = 1,
  ) {}

  /** Parse #rgb, #rrggbb, rgb(), hsl() */
  static parse(css: string): ThemeColor {
    const c = css.trim()

    // Hex
    if (c.startsWith('#')) {
      const hex = c.slice(1)
      let r: number, g: number, b: number
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else {
        r = parseInt(hex.slice(0, 2), 16)
        g = parseInt(hex.slice(2, 4), 16)
        b = parseInt(hex.slice(4, 6), 16)
      }
      return ThemeColor.fromRGB(r, g, b)
    }

    // rgb(r, g, b) or rgb(r g b)
    const rgbMatch = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/)
    if (rgbMatch) {
      return ThemeColor.fromRGB(
        +rgbMatch[1], +rgbMatch[2], +rgbMatch[3], rgbMatch[4] != null ? +rgbMatch[4] : 1,
      )
    }

    // hsl(h, s%, l%) or hsl(h s% l%)
    const hslMatch = c.match(/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?(?:[\s,/]+([\d.]+))?\s*\)$/)
    if (hslMatch) {
      return new ThemeColor(+hslMatch[1], +hslMatch[2], +hslMatch[3], hslMatch[4] != null ? +hslMatch[4] : 1)
    }

    throw new Error(`Cannot parse color: ${css}`)
  }

  static fromRGB(r: number, g: number, b: number, a = 1): ThemeColor {
    const rn = r / 255, gn = g / 255, bn = b / 255
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    if (max === min) return new ThemeColor(0, 0, l * 100, a)
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
    else if (max === gn) h = ((bn - rn) / d + 2) / 6
    else h = ((rn - gn) / d + 4) / 6
    return new ThemeColor(h * 360, s * 100, l * 100, a)
  }

  /** Dark mode: lighten. mod = proportion of remaining range toward white. */
  lift(mod: number): ThemeColor {
    const newL = this.l + (100 - this.l) * mod
    return new ThemeColor(this.h, this.s, newL, this.a)
  }

  /** Dark mode: darken. mod = proportion of range toward black. */
  lower(mod: number): ThemeColor {
    const newL = this.l * (1 - mod)
    return new ThemeColor(this.h, this.s, newL, this.a)
  }

  /** Reduce alpha by proportion. translucify(0.7) on alpha 1.0 → 0.3 */
  translucify(mod: number): ThemeColor {
    return new ThemeColor(this.h, this.s, this.l, this.a * (1 - mod))
  }

  /** Convert to RGB */
  toRGB(): [number, number, number] {
    const h = this.h / 360, s = this.s / 100, l = this.l / 100
    if (s === 0) {
      const v = Math.round(l * 255)
      return [v, v, v]
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return [
      Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      Math.round(hue2rgb(p, q, h) * 255),
      Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    ]
  }

  /** Output #rrggbb (opaque) or rgba(r,g,b,a) (translucent) */
  css(): string {
    const [r, g, b] = this.toRGB()
    if (this.a >= 1) {
      return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
    }
    return `rgba(${r}, ${g}, ${b}, ${+this.a.toFixed(3)})`
  }
}
