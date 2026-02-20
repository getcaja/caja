export interface ScaleOption {
  token: string
  value: number
}

export interface ColorScaleOption {
  token: string
  value: string
}

export const FONT_SIZE_SCALE: ScaleOption[] = [
  { token: 'xs', value: 12 },
  { token: 'sm', value: 14 },
  { token: 'base', value: 16 },
  { token: 'lg', value: 18 },
  { token: 'xl', value: 20 },
  { token: '2xl', value: 24 },
  { token: '3xl', value: 30 },
  { token: '4xl', value: 36 },
  { token: '5xl', value: 48 },
  { token: '6xl', value: 60 },
  { token: '7xl', value: 72 },
  { token: '8xl', value: 96 },
  { token: '9xl', value: 128 },
]

export const COLOR_SCALE: ColorScaleOption[] = [
  { token: 'white', value: '#ffffff' },
  { token: 'black', value: '#000000' },
  { token: 'slate-500', value: '#64748b' },
  { token: 'gray-500', value: '#6b7280' },
  { token: 'zinc-500', value: '#71717a' },
  { token: 'red-500', value: '#ef4444' },
  { token: 'orange-500', value: '#f97316' },
  { token: 'amber-500', value: '#f59e0b' },
  { token: 'yellow-500', value: '#eab308' },
  { token: 'lime-500', value: '#84cc16' },
  { token: 'green-500', value: '#22c55e' },
  { token: 'emerald-500', value: '#10b981' },
  { token: 'teal-500', value: '#14b8a6' },
  { token: 'cyan-500', value: '#06b6d4' },
  { token: 'sky-500', value: '#0ea5e9' },
  { token: 'blue-500', value: '#3b82f6' },
  { token: 'indigo-500', value: '#6366f1' },
  { token: 'violet-500', value: '#8b5cf6' },
  { token: 'purple-500', value: '#a855f7' },
  { token: 'fuchsia-500', value: '#d946ef' },
  { token: 'pink-500', value: '#ec4899' },
  { token: 'rose-500', value: '#f43f5e' },
]

export const OPACITY_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '5', value: 5 },
  { token: '10', value: 10 },
  { token: '20', value: 20 },
  { token: '25', value: 25 },
  { token: '30', value: 30 },
  { token: '40', value: 40 },
  { token: '50', value: 50 },
  { token: '60', value: 60 },
  { token: '70', value: 70 },
  { token: '75', value: 75 },
  { token: '80', value: 80 },
  { token: '90', value: 90 },
  { token: '95', value: 95 },
  { token: '100', value: 100 },
]
