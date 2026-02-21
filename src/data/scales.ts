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

export const SPACING_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '0.5', value: 2 },
  { token: '1', value: 4 },
  { token: '1.5', value: 6 },
  { token: '2', value: 8 },
  { token: '2.5', value: 10 },
  { token: '3', value: 12 },
  { token: '3.5', value: 14 },
  { token: '4', value: 16 },
  { token: '5', value: 20 },
  { token: '6', value: 24 },
  { token: '7', value: 28 },
  { token: '8', value: 32 },
  { token: '9', value: 36 },
  { token: '10', value: 40 },
  { token: '11', value: 44 },
  { token: '12', value: 48 },
  { token: '14', value: 56 },
  { token: '16', value: 64 },
  { token: '20', value: 80 },
  { token: '24', value: 96 },
  { token: '28', value: 112 },
  { token: '32', value: 128 },
  { token: '36', value: 144 },
  { token: '40', value: 160 },
  { token: '44', value: 176 },
  { token: '48', value: 192 },
  { token: '52', value: 208 },
  { token: '56', value: 224 },
  { token: '60', value: 240 },
  { token: '64', value: 256 },
  { token: '72', value: 288 },
  { token: '80', value: 320 },
  { token: '96', value: 384 },
]

export const LINE_HEIGHT_SCALE: ScaleOption[] = [
  { token: 'none', value: 1 },
  { token: 'tight', value: 1.25 },
  { token: 'snug', value: 1.375 },
  { token: 'normal', value: 1.5 },
  { token: 'relaxed', value: 1.625 },
  { token: 'loose', value: 2 },
]

export const LETTER_SPACING_SCALE: ScaleOption[] = [
  { token: 'tighter', value: -0.8 },
  { token: 'tight', value: -0.4 },
  { token: 'normal', value: 0 },
  { token: 'wide', value: 0.4 },
  { token: 'wider', value: 0.8 },
  { token: 'widest', value: 1.6 },
]

export const BORDER_WIDTH_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '', value: 1 },
  { token: '2', value: 2 },
  { token: '4', value: 4 },
  { token: '8', value: 8 },
]

export const BORDER_RADIUS_SCALE: ScaleOption[] = [
  { token: 'none', value: 0 },
  { token: 'sm', value: 2 },
  { token: 'DEFAULT', value: 4 },
  { token: 'md', value: 6 },
  { token: 'lg', value: 8 },
  { token: 'xl', value: 12 },
  { token: '2xl', value: 16 },
  { token: '3xl', value: 24 },
  { token: 'full', value: 9999 },
]

export const MARGIN_SCALE: ScaleOption[] = [
  { token: 'auto', value: 0 },
  ...SPACING_SCALE,
]

export const SIZE_CONSTRAINT_SCALE: ScaleOption[] = [
  ...SPACING_SCALE,
  { token: 'xs', value: 320 },
  { token: 'sm', value: 384 },
  { token: 'md', value: 448 },
  { token: 'lg', value: 512 },
  { token: 'xl', value: 576 },
  { token: '2xl', value: 672 },
  { token: '3xl', value: 768 },
  { token: '4xl', value: 896 },
  { token: '5xl', value: 1024 },
  { token: '6xl', value: 1152 },
  { token: '7xl', value: 1280 },
]
