export interface CajaTheme {
  id: string
  label: string
  dark: boolean
  base: {
    surface: string
    text: string
    accent: string
    focus: string
    destructive: string
  }
}

export const DEFAULT_THEME: CajaTheme = {
  id: 'default-dark',
  label: 'Default Dark',
  dark: true,
  base: {
    surface: '#111111',
    text: '#f0f0f0',
    accent: '#20744A',
    focus: '#4A90D9',
    destructive: '#ef4444',
  },
}

export const DRACULA_THEME: CajaTheme = {
  id: 'dracula',
  label: 'Dracula',
  dark: true,
  base: {
    surface: '#282a36',
    text: '#f8f8f2',
    accent: '#50fa7b',
    focus: '#bd93f9',
    destructive: '#ff5555',
  },
}

export const CATPPUCCIN_MOCHA_THEME: CajaTheme = {
  id: 'catppuccin-mocha',
  label: 'Catppuccin Mocha',
  dark: true,
  base: {
    surface: '#1e1e2e',
    text: '#cdd6f4',
    accent: '#a6e3a1',
    focus: '#89b4fa',
    destructive: '#f38ba8',
  },
}

export const THEMES: CajaTheme[] = [DEFAULT_THEME, DRACULA_THEME, CATPPUCCIN_MOCHA_THEME]
