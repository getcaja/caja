export interface ScaleOption {
  token: string
  value: number
  label?: string
  group?: string  // group header shown before this item in dropdown
}

export type SpacingGrid = 'off' | '4px' | '8px'

export function filterSpacingScale(scale: ScaleOption[], grid: SpacingGrid): ScaleOption[] {
  if (grid === 'off') return scale
  const base = grid === '4px' ? 4 : 8
  return scale.filter((s) => {
    if (typeof s.value !== 'number') return true  // keep 'auto' etc
    if (s.value === 0) return true
    return s.value % base === 0
  })
}

export const FONT_WEIGHT_SCALE: ScaleOption[] = [
  { token: 'thin', value: 100, label: 'Thin' },
  { token: 'extralight', value: 200, label: 'Extra Light' },
  { token: 'light', value: 300, label: 'Light' },
  { token: 'normal', value: 400, label: 'Regular' },
  { token: 'medium', value: 500, label: 'Medium' },
  { token: 'semibold', value: 600, label: 'Semi Bold' },
  { token: 'bold', value: 700, label: 'Bold' },
  { token: 'extrabold', value: 800, label: 'Extra Bold' },
  { token: 'black', value: 900, label: 'Black' },
]

export const GROW_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: 'DEFAULT', value: 1 },
]

export const SHRINK_SCALE: ScaleOption[] = [
  { token: 'DEFAULT', value: 1 },
  { token: '0', value: 0 },
]

export const FONT_SIZE_SCALE: ScaleOption[] = [
  { token: 'xs', value: 12, label: 'Extra Small' },
  { token: 'sm', value: 14, label: 'Small' },
  { token: 'base', value: 16, label: 'Base' },
  { token: 'lg', value: 18, label: 'Large' },
  { token: 'xl', value: 20, label: 'Extra Large' },
  { token: '2xl', value: 24, label: '2X Large' },
  { token: '3xl', value: 30, label: '3X Large' },
  { token: '4xl', value: 36, label: '4X Large' },
  { token: '5xl', value: 48, label: '5X Large' },
  { token: '6xl', value: 60, label: '6X Large' },
  { token: '7xl', value: 72, label: '7X Large' },
  { token: '8xl', value: 96, label: '8X Large' },
  { token: '9xl', value: 128, label: '9X Large' },
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
  { token: 'none', value: 1, label: 'None' },
  { token: 'tight', value: 1.25, label: 'Tight' },
  { token: 'snug', value: 1.375, label: 'Snug' },
  { token: 'normal', value: 1.5, label: 'Normal' },
  { token: 'relaxed', value: 1.625, label: 'Relaxed' },
  { token: 'loose', value: 2, label: 'Loose' },
]

// Default lineHeight token for each fontSize token (typographic conventions)
export const LETTER_SPACING_SCALE: ScaleOption[] = [
  { token: 'tighter', value: -0.8, label: 'Tighter' },
  { token: 'tight', value: -0.4, label: 'Tight' },
  { token: 'normal', value: 0, label: 'Normal' },
  { token: 'wide', value: 0.4, label: 'Wide' },
  { token: 'wider', value: 0.8, label: 'Wider' },
  { token: 'widest', value: 1.6, label: 'Widest' },
]

export const BORDER_WIDTH_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '', value: 1 },
  { token: '2', value: 2 },
  { token: '4', value: 4 },
  { token: '8', value: 8 },
]

export const BORDER_RADIUS_SCALE: ScaleOption[] = [
  { token: 'sm', value: 2, label: 'Small' },
  { token: 'DEFAULT', value: 4, label: 'Base' },
  { token: 'md', value: 6, label: 'Medium' },
  { token: 'lg', value: 8, label: 'Large' },
  { token: 'xl', value: 12, label: 'XL' },
  { token: '2xl', value: 16, label: '2XL' },
  { token: '3xl', value: 24, label: '3XL' },
  { token: 'full', value: 9999, label: 'Full' },
]

export const GAP_SCALE: ScaleOption[] = [
  { token: 'auto', value: 0, label: 'Space' },
  { ...SPACING_SCALE[0], group: 'Fixed' },
  ...SPACING_SCALE.slice(1),
]

export const MARGIN_SCALE: ScaleOption[] = [
  { token: 'auto', value: 0, label: 'Auto' },
  { ...SPACING_SCALE[0], group: 'Fixed' },
  ...SPACING_SCALE.slice(1),
]

export const SIZE_CONSTRAINT_SCALE: ScaleOption[] = [
  ...SPACING_SCALE,
  { token: 'md', value: 448 },
  { token: 'lg', value: 512 },
  { token: 'xl', value: 576 },
  { token: '2xl', value: 672 },
  { token: '3xl', value: 768 },
  { token: '4xl', value: 896 },
  { token: '5xl', value: 1024 },
  { token: '6xl', value: 1152 },
  { token: '7xl', value: 1280 },
  // Tailwind screen breakpoint tokens (max-w-screen-*)
  { token: 'screen-sm', value: 640 },
  { token: 'screen-md', value: 768 },
  { token: 'screen-lg', value: 1024 },
  { token: 'screen-xl', value: 1280 },
  { token: 'screen-2xl', value: 1536 },
]

export const Z_INDEX_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '10', value: 10 },
  { token: '20', value: 20 },
  { token: '30', value: 30 },
  { token: '40', value: 40 },
  { token: '50', value: 50 },
]

export const GRID_COLS_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '4', value: 4 },
  { token: '5', value: 5 },
  { token: '6', value: 6 },
  { token: '7', value: 7 },
  { token: '8', value: 8 },
  { token: '9', value: 9 },
  { token: '10', value: 10 },
  { token: '11', value: 11 },
  { token: '12', value: 12 },
]

export const GRID_ROWS_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '4', value: 4 },
  { token: '5', value: 5 },
  { token: '6', value: 6 },
]

export const COL_SPAN_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '4', value: 4 },
  { token: '5', value: 5 },
  { token: '6', value: 6 },
  { token: '7', value: 7 },
  { token: '8', value: 8 },
  { token: '9', value: 9 },
  { token: '10', value: 10 },
  { token: '11', value: 11 },
  { token: '12', value: 12 },
  { token: 'full', value: 9999 },
]

export const ROW_SPAN_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '4', value: 4 },
  { token: '5', value: 5 },
  { token: '6', value: 6 },
  { token: 'full', value: 9999 },
]

export const ROTATE_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '6', value: 6 },
  { token: '12', value: 12 },
  { token: '45', value: 45 },
  { token: '90', value: 90 },
  { token: '180', value: 180 },
]

export const SKEW_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '1', value: 1 },
  { token: '2', value: 2 },
  { token: '3', value: 3 },
  { token: '6', value: 6 },
  { token: '12', value: 12 },
]

export const SCALE_SCALE: ScaleOption[] = [
  { token: '0', value: 0 },
  { token: '50', value: 50 },
  { token: '75', value: 75 },
  { token: '90', value: 90 },
  { token: '95', value: 95 },
  { token: '100', value: 100 },
  { token: '105', value: 105 },
  { token: '110', value: 110 },
  { token: '125', value: 125 },
  { token: '150', value: 150 },
]

export const DURATION_SCALE: ScaleOption[] = [
  { token: '75', value: 75 },
  { token: '100', value: 100 },
  { token: '150', value: 150 },
  { token: '200', value: 200 },
  { token: '300', value: 300 },
  { token: '500', value: 500 },
  { token: '700', value: 700 },
  { token: '1000', value: 1000 },
]

export const BLUR_SCALE: ScaleOption[] = [
  { token: 'sm', value: 4, label: 'Small' },
  { token: 'DEFAULT', value: 8, label: 'Base' },
  { token: 'md', value: 12, label: 'Medium' },
  { token: 'lg', value: 16, label: 'Large' },
  { token: 'xl', value: 24, label: 'XL' },
  { token: '2xl', value: 40, label: '2XL' },
  { token: '3xl', value: 64, label: '3XL' },
]
