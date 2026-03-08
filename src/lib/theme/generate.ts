import { ThemeColor } from './ThemeColor'
import type { CajaTheme } from './types'
import { THEMES, DEFAULT_DARK, DEFAULT_LIGHT } from './types'

const THEME_STORAGE_KEY = 'caja-theme-id'

export interface ThemeTokens {
  // Surfaces
  'surface-0': string
  'surface-sunken': string
  'surface-vibrancy': string
  'surface-1': string
  'surface-2': string
  'surface-3': string
  // Text (semantic)
  'text-primary': string
  'text-secondary': string
  'text-muted': string
  // Borders
  border: string
  'border-accent': string
  // Accent
  accent: string
  'accent-hover': string
  'accent-text': string
  // Semantic
  destructive: string
  // Canvas
  'canvas-bg': string
  // Primitives (fg/bg)
  'fg-default': string
  'fg-muted': string
  'fg-subtle': string
  'bg-overlay': string
  // Controls (inputs, segments)
  'control-bg': string
  'control-border': string
  'control-active': string
  // Chrome (window edge)
  'chrome-border': string
  // Floating surfaces (menus, popovers) — border in dark, shadow-only in light
  'float-border': string
}

// ── Shared derivation constants ──
// One set of deltas, direction flips per mode (dark lifts, light lowers).
// Light mode uses a perceptual multiplier (1.5×) on surface steps to
// compensate for Weber's law — the eye needs bigger deltas to perceive
// the same contrast in light tones as in dark tones.
const STEP_1       = 0.062   // surface → s1 (inputs, segments, cards)
const STEP_2       = 0.124   // surface → s2 (hover, inset, border-accent)
const STEP_3       = 0.187   // surface → s3 (emphasis)
const BORDER_STEP  = 0.093   // surface → border (between s1 and s2)
const LIGHT_BOOST  = 1.5     // perceptual compensation for light surfaces
const TEXT_SEC     = 0.30    // text → secondary
const TEXT_MUTED   = 0.53    // text → muted (section labels)
const FG_MUTED     = 0.35    // text → fg-muted (interactive dimmed)
const FG_SUBTLE    = 0.50    // text → fg-subtle (placeholders)
const ACCENT_HOVER = 0.08    // accent shift for hover
const VIBRANCY_A   = 0.15    // surface-vibrancy opacity factor

export function deriveTokens(theme: CajaTheme): ThemeTokens {
  const surface = ThemeColor.parse(theme.base.surface)
  const text = ThemeColor.parse(theme.base.text)
  const accent = ThemeColor.parse(theme.base.accent)

  // Direction: dark lifts from surface, light lowers (with perceptual boost)
  const boost = theme.dark ? 1 : LIGHT_BOOST
  const away = (base: ThemeColor, delta: number) =>
    theme.dark ? base.lift(delta) : base.lower(delta * boost)
  // Text fades toward surface
  const fade = (base: ThemeColor, delta: number) =>
    theme.dark ? base.lower(delta) : base.lift(delta)

  const s1 = away(surface, STEP_1)
  const s2 = away(surface, STEP_2)
  const s3 = away(surface, STEP_3)

  return {
    // ── Surfaces ──
    'surface-0': surface.css(),
    'surface-sunken': theme.dark
      ? surface.lower(0.40).css()       // deep dark for canvas/console
      : surface.lower(0.04).css(),      // subtle off-white
    'surface-vibrancy': surface.translucify(VIBRANCY_A).css(),
    'surface-1': s1.css(),
    'surface-2': s2.css(),
    'surface-3': s3.css(),

    // ── Text ──
    'text-primary': text.css(),
    'text-secondary': fade(text, TEXT_SEC).css(),
    'text-muted': fade(text, TEXT_MUTED).css(),

    // ── Borders ──
    border: away(surface, BORDER_STEP).css(),
    'border-accent': s2.css(),

    // ── Accent ──
    accent: accent.css(),
    'accent-hover': theme.dark
      ? accent.lift(ACCENT_HOVER).css()
      : accent.lower(ACCENT_HOVER).css(),
    'accent-text': theme.dark
      ? `color-mix(in srgb, ${accent.css()} 65%, white)`
      : `color-mix(in srgb, ${accent.css()} 65%, black)`,

    // ── Semantic ──
    destructive: ThemeColor.parse(theme.base.destructive).css(),

    // ── Canvas ──
    'canvas-bg': theme.dark
      ? surface.lower(0.40).css()       // same as sunken
      : surface.lower(0.04).css(),      // same as sunken

    // ── Foreground / overlay ──
    'fg-default': text.css(),
    'fg-muted': fade(text, FG_MUTED).css(),
    'fg-subtle': fade(text, FG_SUBTLE).css(),
    'bg-overlay': theme.dark
      ? surface.lower(0.35).css()
      : surface.lower(0.04).css(),

    // ── Controls ──
    'control-bg': s1.css(),
    'control-border': theme.dark
      ? 'transparent'                   // dark: bg contrast is enough
      : away(surface, BORDER_STEP).css(), // light: needs visible border
    'control-active': surface.css(),      // surface-0: pops against s1 container in both modes

    // ── Chrome & floating ── (mode-specific by nature)
    'chrome-border': theme.dark
      ? away(surface, BORDER_STEP).css()
      : 'transparent',
    'float-border': theme.dark
      ? s2.css()
      : 'transparent',
  }
}

export function generateThemeCSS(theme: CajaTheme): string {
  const tokens = deriveTokens(theme)
  const lines = Object.entries(tokens)
    .map(([key, value]) => `  --color-${key}: ${value};`)
  return `:root {\n${lines.join('\n')}\n}`
}

export function applyTheme(theme: CajaTheme, doc: Document = document): void {
  const id = 'caja-theme'
  let style = doc.getElementById(id) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = id
    doc.head.appendChild(style)
  }
  style.textContent = generateThemeCSS(theme)
}

/** Resolve system preference to a concrete theme */
function resolveSystemTheme(): CajaTheme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return DEFAULT_LIGHT
  }
  return DEFAULT_DARK
}

/** Get the saved theme (falls back to system preference) */
export function getActiveTheme(): CajaTheme {
  try {
    const id = localStorage.getItem(THEME_STORAGE_KEY)
    if (id === 'system') return resolveSystemTheme()
    if (id) return THEMES.find((t) => t.id === id) ?? resolveSystemTheme()
  } catch { /* expected: SSR or iframe without localStorage access */ }
  return resolveSystemTheme()
}

/** Get the stored preference ID ('system', 'default-dark', 'default-light') */
export function getThemePreference(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'system'
  } catch { return 'system' }
}

/** Persist theme choice and apply to the document */
export function switchTheme(themeId: string, docs: Document[] = [document]): CajaTheme {
  try { localStorage.setItem(THEME_STORAGE_KEY, themeId) } catch { /* expected: SSR */ }
  const theme = themeId === 'system'
    ? resolveSystemTheme()
    : THEMES.find((t) => t.id === themeId) ?? resolveSystemTheme()
  for (const doc of docs) applyTheme(theme, doc)
  return theme
}
