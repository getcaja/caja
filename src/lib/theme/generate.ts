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

export function deriveTokens(theme: CajaTheme): ThemeTokens {
  const surface = ThemeColor.parse(theme.base.surface)
  const text = ThemeColor.parse(theme.base.text)
  const accent = ThemeColor.parse(theme.base.accent)

  if (theme.dark) {
    const s1 = surface.lift(0.062)
    const s2 = surface.lift(0.124)
    const s3 = surface.lift(0.187)
    return {
      'surface-0': surface.css(),
      'surface-sunken': surface.lower(0.25).css(),
      'surface-vibrancy': surface.translucify(0.10).css(),
      'surface-1': s1.css(),
      'surface-2': s2.css(),
      'surface-3': s3.css(),
      'text-primary': text.css(),
      'text-secondary': text.lower(0.30).css(),
      'text-muted': text.lower(0.53).css(),
      border: surface.lift(0.093).css(),
      'border-accent': s2.css(),
      accent: accent.css(),
      'accent-hover': accent.lift(0.066).css(),
      'accent-text': `color-mix(in srgb, ${accent.css()} 65%, white)`,
      destructive: ThemeColor.parse(theme.base.destructive).css(),
      'canvas-bg': surface.lower(0.25).css(),
      'fg-default': text.css(),
      'fg-muted': text.lower(0.35).css(),
      'fg-subtle': text.lower(0.50).css(),
      'bg-overlay': surface.lower(0.35).css(),
      'control-bg': s1.css(),            // darker than panel → contrast defines them
      'control-border': 'transparent',   // no border needed in dark
      'control-active': s2.css(),        // lighter than control-bg → stands out
      'chrome-border': surface.lift(0.093).css(), // subtle window edge in dark
      'float-border': surface.lift(0.124).css(), // visible border on floating surfaces in dark
    }
  }

  // Light mode — symmetric deltas to dark mode (Radix-validated approach).
  // Dark lifts: 0.062, 0.124, 0.187 → Light lowers: same values.
  const s1 = surface.lower(0.062)   // ~#f0f0f0 — inputs, cards (≈ Radix gray3)
  const s2 = surface.lower(0.124)   // ~#e0e0e0 — hover, inset  (≈ Radix gray5)
  const s3 = surface.lower(0.187)   // ~#d0d0d0 — emphasis       (≈ Radix gray7)
  return {
    'surface-0': surface.css(),
    'surface-sunken': surface.lower(0.04).css(),
    'surface-vibrancy': surface.translucify(0.15).css(),
    'surface-1': s1.css(),
    'surface-2': s2.css(),
    'surface-3': s3.css(),
    'text-primary': text.css(),
    'text-secondary': text.lift(0.35).css(),
    'text-muted': text.lift(0.55).css(),
    border: surface.lower(0.14).css(),    // ≈ Radix gray6 #d9d9d9
    'border-accent': surface.lower(0.187).css(), // ≈ Radix gray7
    accent: accent.css(),
    'accent-hover': accent.lower(0.1).css(),
    'accent-text': `color-mix(in srgb, ${accent.css()} 65%, black)`,
    destructive: ThemeColor.parse(theme.base.destructive).css(),
    'canvas-bg': surface.lower(0.04).css(),
    'fg-default': text.css(),
    'fg-muted': text.lift(0.38).css(),
    'fg-subtle': text.lift(0.55).css(),
    'bg-overlay': surface.lower(0.04).css(),
    // Paper pattern: controls lighter than panel, border defines them
    'control-bg': surface.lower(0.02).css(),     // ~#fafafa — near white
    'control-border': surface.lower(0.15).css(), // ~#d9d9d9 — visible separator
    'control-active': surface.css(),             // white — pops against control-bg
    'chrome-border': 'transparent',              // OS shadow defines window edge in light
    'float-border': 'transparent',              // shadow outline is enough in light
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
