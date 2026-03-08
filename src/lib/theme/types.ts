export interface CajaTheme {
  id: string
  label: string
  dark: boolean
  base: {
    surface: string
    text: string
    accent: string
    destructive: string
  }
}

export const DEFAULT_DARK: CajaTheme = {
  id: 'default-dark',
  label: 'Dark',
  dark: true,
  base: {
    surface: '#1e1e1e',
    text: '#ffffff',
    accent: '#3378F6',
    destructive: '#ef4444',
  },
}

export const DEFAULT_LIGHT: CajaTheme = {
  id: 'default-light',
  label: 'Light',
  dark: false,
  base: {
    surface: '#ececec',
    text: '#1a1a1a',
    accent: '#3378F6',
    destructive: '#ef4444',
  },
}

export const THEMES: CajaTheme[] = [DEFAULT_DARK, DEFAULT_LIGHT]
