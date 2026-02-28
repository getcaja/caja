import { ThemeColor } from './ThemeColor'
import type { CajaTheme } from './types'
import { THEMES, DEFAULT_DARK, DEFAULT_LIGHT } from './types'

const THEME_STORAGE_KEY = 'caja-theme-id'

export interface ThemeTokens {
  'surface-0': string
  'surface-1': string
  'surface-2': string
  'surface-3': string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
  border: string
  'border-accent': string
  accent: string
  'accent-hover': string
  destructive: string
  'canvas-bg': string
}

export function deriveTokens(theme: CajaTheme): ThemeTokens {
  const surface = ThemeColor.parse(theme.base.surface)
  const text = ThemeColor.parse(theme.base.text)
  const accent = ThemeColor.parse(theme.base.accent)

  if (theme.dark) {
    return {
      'surface-0': surface.css(),
      'surface-1': surface.lift(0.042).css(),
      'surface-2': surface.lift(0.088).css(),
      'surface-3': surface.lift(0.193).css(),
      'text-primary': text.css(),
      'text-secondary': text.lower(0.329).css(),
      'text-muted': text.lower(0.529).css(),
      border: surface.lift(0.139).css(),
      'border-accent': surface.lift(0.189).css(),
      accent: accent.css(),
      'accent-hover': accent.lift(0.066).css(),
      destructive: ThemeColor.parse(theme.base.destructive).css(),
      'canvas-bg': surface.lower(0.088).css(),
    }
  }

  // Light mode — invert derivation direction
  return {
    'surface-0': surface.css(),
    'surface-1': surface.lower(0.024).css(),
    'surface-2': surface.lower(0.052).css(),
    'surface-3': surface.lower(0.10).css(),
    'text-primary': text.css(),
    'text-secondary': text.lift(0.329).css(),
    'text-muted': text.lift(0.529).css(),
    border: surface.lower(0.10).css(),
    'border-accent': surface.lower(0.15).css(),
    accent: accent.css(),
    'accent-hover': accent.lower(0.1).css(),
    destructive: ThemeColor.parse(theme.base.destructive).css(),
    'canvas-bg': surface.lower(0.04).css(),
  }
}

export function generateThemeCSS(theme: CajaTheme): string {
  const tokens = deriveTokens(theme)
  const lines = Object.entries(tokens).map(
    ([key, value]) => `  --color-${key}: ${value};`,
  )
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
