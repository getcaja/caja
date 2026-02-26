import { ThemeColor } from './ThemeColor'
import type { CajaTheme } from './types'
import { THEMES, DEFAULT_THEME } from './types'

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
  focus: string
  destructive: string
  selection: string
  'canvas-bg': string
}

export function deriveTokens(theme: CajaTheme): ThemeTokens {
  const surface = ThemeColor.parse(theme.base.surface)
  const text = ThemeColor.parse(theme.base.text)
  const accent = ThemeColor.parse(theme.base.accent)
  const focus = ThemeColor.parse(theme.base.focus)

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
    focus: focus.css(),
    destructive: ThemeColor.parse(theme.base.destructive).css(),
    selection: focus.translucify(0.7).css(),
    'canvas-bg': surface.lower(0.088).css(),
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

/** Get the saved theme (falls back to DEFAULT_THEME) */
export function getActiveTheme(): CajaTheme {
  try {
    const id = localStorage.getItem(THEME_STORAGE_KEY)
    if (id) return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME
  } catch { /* SSR / iframe without storage */ }
  return DEFAULT_THEME
}

/** Persist theme choice and apply to given documents */
export function switchTheme(themeId: string, docs: Document[] = [document]): CajaTheme {
  const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME
  try { localStorage.setItem(THEME_STORAGE_KEY, theme.id) } catch { /* ignore */ }
  for (const doc of docs) applyTheme(theme, doc)
  return theme
}
