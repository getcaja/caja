// Inverse of frameToClasses: parses a Tailwind class string into frame properties.
// Used by MCP tools so LLMs can send classes directly instead of verbose JSON.

import type { DesignValue, Spacing, BorderRadius, Border } from '../types/frame'
import {
  SPACING_SCALE, FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE,
  BORDER_WIDTH_SCALE, BORDER_RADIUS_SCALE, SIZE_CONSTRAINT_SCALE, OPACITY_SCALE,
  Z_INDEX_SCALE, GRID_COLS_SCALE, GRID_ROWS_SCALE, COL_SPAN_SCALE, ROW_SPAN_SCALE,
  ROTATE_SCALE, SCALE_SCALE, DURATION_SCALE, BLUR_SCALE,
} from '../data/scales'
import { COLOR_GRID, SPECIAL_COLORS } from '../data/colors'

// --- Token → value lookup maps (built once) ---

function buildTokenMap(scale: { token: string; value: number }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const { token, value } of scale) if (token) map.set(token, value)
  return map
}

const SPACING_TOKENS = buildTokenMap(SPACING_SCALE)
const FONT_SIZE_TOKENS = buildTokenMap(FONT_SIZE_SCALE)
const LINE_HEIGHT_TOKENS = buildTokenMap(LINE_HEIGHT_SCALE)
const LETTER_SPACING_TOKENS = buildTokenMap(LETTER_SPACING_SCALE)
const BORDER_WIDTH_TOKENS = buildTokenMap(BORDER_WIDTH_SCALE)
const BORDER_RADIUS_TOKENS = buildTokenMap(BORDER_RADIUS_SCALE)
const SIZE_TOKENS = buildTokenMap(SIZE_CONSTRAINT_SCALE)
const OPACITY_TOKENS = buildTokenMap(OPACITY_SCALE)
const Z_INDEX_TOKENS = buildTokenMap(Z_INDEX_SCALE)
const GRID_COLS_TOKENS = buildTokenMap(GRID_COLS_SCALE)
const GRID_ROWS_TOKENS = buildTokenMap(GRID_ROWS_SCALE)
const COL_SPAN_TOKENS = buildTokenMap(COL_SPAN_SCALE)
const ROW_SPAN_TOKENS = buildTokenMap(ROW_SPAN_SCALE)
const ROTATE_TOKENS = buildTokenMap(ROTATE_SCALE)
const SCALE_TOKENS = buildTokenMap(SCALE_SCALE)
const DURATION_TOKENS = buildTokenMap(DURATION_SCALE)
const BLUR_TOKENS = buildTokenMap(BLUR_SCALE)

// Color token → hex
const COLOR_TOKEN_MAP = new Map<string, string>()
for (const { token, value } of SPECIAL_COLORS) COLOR_TOKEN_MAP.set(token, value)
for (const family of COLOR_GRID) {
  for (const { token, value } of family.shades) COLOR_TOKEN_MAP.set(token, value)
}

// Set of known fontSize token names (for text- disambiguation)
const FONT_SIZE_TOKEN_SET = new Set(FONT_SIZE_SCALE.map((s) => s.token))

/** Sentinel value for col-span-full / row-span-full tokens */
const SPAN_FULL_VALUE = 9999

// --- Helpers ---

function parseNumericDV(token: string, tokenMap: Map<string, number>): DesignValue<number> | null {
  const value = tokenMap.get(token)
  if (value !== undefined) return { mode: 'token', token, value }
  // Arbitrary [Npx] or [N]
  const m = token.match(/^\[(\d+(?:\.\d+)?)(px)?\]$/)
  if (m) return { mode: 'custom', value: parseFloat(m[1]) }
  return null
}

function parseColorDV(token: string): DesignValue<string> | null {
  const hex = COLOR_TOKEN_MAP.get(token)
  if (hex) return { mode: 'token', token, value: hex }
  // Arbitrary [#hex] or [rgb(...)]
  const m = token.match(/^\[(.+)\]$/)
  if (m) return { mode: 'custom', value: m[1] }
  return null
}

function dvNum(token: string, value: number): DesignValue<number> {
  return { mode: 'token', token, value }
}

// --- Result type ---

export interface ParsedTailwindResult {
  properties: Record<string, unknown>
  tailwindClasses: string
}

// --- Matchers ---

type Props = Record<string, unknown>

function matchLayout(cls: string, props: Props): boolean {
  if (cls === 'flex') { props.display = 'flex'; props.direction = 'row'; return true }
  if (cls === 'inline-flex') { props.display = 'inline-flex'; props.direction = 'row'; return true }
  if (cls === 'grid') { props.display = 'grid'; return true }
  if (cls === 'block') { props.display = 'block'; return true }
  if (cls === 'inline-block') { props.display = 'inline-block'; return true }
  if (cls === 'inline') { props.display = 'inline'; return true }
  if (cls === 'flex-row') { props.direction = 'row'; return true }
  if (cls === 'flex-col') { props.direction = 'column'; return true }
  if (cls === 'flex-wrap') { props.wrap = true; return true }
  if (cls === 'flex-nowrap') { props.wrap = false; return true }

  const justifyMap: Record<string, string> = {
    'justify-start': 'start', 'justify-center': 'center', 'justify-end': 'end',
    'justify-between': 'between', 'justify-around': 'around',
  }
  if (justifyMap[cls]) { props.justify = justifyMap[cls]; return true }

  const alignMap: Record<string, string> = {
    'items-start': 'start', 'items-center': 'center', 'items-end': 'end', 'items-stretch': 'stretch',
  }
  if (alignMap[cls]) { props.align = alignMap[cls]; return true }

  if (cls.startsWith('gap-')) {
    const dv = parseNumericDV(cls.slice(4), SPACING_TOKENS)
    if (dv) { props.gap = dv; return true }
  }

  // Grid columns/rows
  if (cls.startsWith('grid-cols-')) {
    const dv = parseNumericDV(cls.slice(10), GRID_COLS_TOKENS)
    if (dv) { props.gridCols = dv; return true }
  }
  if (cls.startsWith('grid-rows-')) {
    const dv = parseNumericDV(cls.slice(10), GRID_ROWS_TOKENS)
    if (dv) { props.gridRows = dv; return true }
  }

  // Col/row span
  if (cls === 'col-span-full') { props.colSpan = dvNum('full', SPAN_FULL_VALUE); return true }
  if (cls.startsWith('col-span-')) {
    const dv = parseNumericDV(cls.slice(9), COL_SPAN_TOKENS)
    if (dv) { props.colSpan = dv; return true }
  }
  if (cls === 'row-span-full') { props.rowSpan = dvNum('full', SPAN_FULL_VALUE); return true }
  if (cls.startsWith('row-span-')) {
    const dv = parseNumericDV(cls.slice(9), ROW_SPAN_TOKENS)
    if (dv) { props.rowSpan = dv; return true }
  }

  return false
}

function setSpacingSides(
  spacing: Partial<Spacing>,
  sides: ('top' | 'right' | 'bottom' | 'left')[],
  dv: DesignValue<number>,
) {
  for (const side of sides) spacing[side] = { ...dv }
}

function matchSpacing(cls: string, padding: Partial<Spacing>, margin: Partial<Spacing>): boolean {
  // Determine prefix and target
  const prefixes: [string, ('top' | 'right' | 'bottom' | 'left')[], Partial<Spacing>][] = [
    ['p-', ['top', 'right', 'bottom', 'left'], padding],
    ['px-', ['right', 'left'], padding],
    ['py-', ['top', 'bottom'], padding],
    ['pt-', ['top'], padding],
    ['pr-', ['right'], padding],
    ['pb-', ['bottom'], padding],
    ['pl-', ['left'], padding],
    ['m-', ['top', 'right', 'bottom', 'left'], margin],
    ['mx-', ['right', 'left'], margin],
    ['my-', ['top', 'bottom'], margin],
    ['mt-', ['top'], margin],
    ['mr-', ['right'], margin],
    ['mb-', ['bottom'], margin],
    ['ml-', ['left'], margin],
  ]

  for (const [prefix, sides, target] of prefixes) {
    if (cls.startsWith(prefix)) {
      const rest = cls.slice(prefix.length)
      // Handle mx-auto / my-auto / m-auto
      if (rest === 'auto') {
        setSpacingSides(target, sides, dvNum('auto', 0))
        return true
      }
      const dv = parseNumericDV(rest, SPACING_TOKENS)
      if (dv) { setSpacingSides(target, sides, dv); return true }
    }
  }

  return false
}

function matchSizing(cls: string, props: Props): boolean {
  // Width
  if (cls === 'w-full') { props.width = { mode: 'fill', value: { mode: 'custom', value: 0 } }; return true }
  if (cls === 'w-fit') { props.width = { mode: 'hug', value: { mode: 'custom', value: 0 } }; return true }
  if (cls.startsWith('w-') && !cls.startsWith('w-fit') && !cls.startsWith('w-full')) {
    const dv = parseNumericDV(cls.slice(2), SIZE_TOKENS)
    if (dv) { props.width = { mode: 'fixed', value: dv }; return true }
  }

  // Height
  if (cls === 'h-full') { props.height = { mode: 'fill', value: { mode: 'custom', value: 0 } }; return true }
  if (cls === 'h-fit') { props.height = { mode: 'hug', value: { mode: 'custom', value: 0 } }; return true }
  if (cls.startsWith('h-') && !cls.startsWith('h-fit') && !cls.startsWith('h-full')) {
    const dv = parseNumericDV(cls.slice(2), SIZE_TOKENS)
    if (dv) { props.height = { mode: 'fixed', value: dv }; return true }
  }

  // Constraints
  if (cls.startsWith('min-w-')) { const dv = parseNumericDV(cls.slice(6), SIZE_TOKENS); if (dv) { props.minWidth = dv; return true } }
  if (cls.startsWith('max-w-')) { const dv = parseNumericDV(cls.slice(6), SIZE_TOKENS); if (dv) { props.maxWidth = dv; return true } }
  if (cls.startsWith('min-h-')) { const dv = parseNumericDV(cls.slice(6), SIZE_TOKENS); if (dv) { props.minHeight = dv; return true } }
  if (cls.startsWith('max-h-')) { const dv = parseNumericDV(cls.slice(6), SIZE_TOKENS); if (dv) { props.maxHeight = dv; return true } }

  // Grow / shrink → DesignValue
  if (cls === 'grow') { props.grow = { mode: 'token', token: 'DEFAULT', value: 1 }; return true }
  if (cls === 'grow-0') { props.grow = { mode: 'token', token: '0', value: 0 }; return true }
  if (cls.startsWith('grow-[')) { const m = cls.match(/^grow-\[(\d+)\]$/); if (m) { props.grow = { mode: 'custom', value: parseInt(m[1]) }; return true } }
  if (cls === 'shrink') { props.shrink = { mode: 'token', token: 'DEFAULT', value: 1 }; return true }
  if (cls === 'shrink-0') { props.shrink = { mode: 'token', token: '0', value: 0 }; return true }

  // Align self
  const selfMap: Record<string, string> = {
    'self-start': 'start', 'self-center': 'center', 'self-end': 'end', 'self-stretch': 'stretch', 'self-auto': 'auto',
  }
  if (selfMap[cls]) { props.alignSelf = selfMap[cls]; return true }

  return false
}

// Build a reverse lookup: "font-thin" → DesignValue for fontWeight
const WEIGHT_CLASS_MAP = new Map<string, { mode: 'token'; token: string; value: number }>()
for (const { token, value } of FONT_WEIGHT_SCALE) {
  WEIGHT_CLASS_MAP.set(`font-${token}`, { mode: 'token', token, value })
}

function matchText(cls: string, props: Props): boolean {
  // font-weight (token classes: font-thin, font-bold, etc.)
  const weightDV = WEIGHT_CLASS_MAP.get(cls)
  if (weightDV) { props.fontWeight = { ...weightDV }; return true }
  if (cls.startsWith('font-[')) {
    const m = cls.match(/^font-\[(\d+)\]$/)
    if (m) { props.fontWeight = { mode: 'custom', value: parseInt(m[1]) }; return true }
  }

  // text-align
  if (cls === 'text-left') { props.textAlign = 'left'; return true }
  if (cls === 'text-center') { props.textAlign = 'center'; return true }
  if (cls === 'text-right') { props.textAlign = 'right'; return true }

  // text- (fontSize or color)
  if (cls.startsWith('text-')) {
    const rest = cls.slice(5)

    // Combined fontSize/lineHeight: text-xl/relaxed or text-xl/[1.1]
    if (rest.includes('/')) {
      const [sizePart, lhPart] = rest.split('/')
      if (FONT_SIZE_TOKEN_SET.has(sizePart)) {
        const fsValue = FONT_SIZE_TOKENS.get(sizePart)!
        props.fontSize = { mode: 'token', token: sizePart, value: fsValue }
        const lhValue = LINE_HEIGHT_TOKENS.get(lhPart)
        if (lhValue !== undefined) {
          props.lineHeight = { mode: 'token', token: lhPart, value: lhValue }
        } else {
          const m = lhPart.match(/^\[(\d+(?:\.\d+)?)\]$/)
          if (m) props.lineHeight = { mode: 'custom', value: parseFloat(m[1]) }
        }
        return true
      }
    }

    // Arbitrary value
    if (rest.startsWith('[')) {
      if (rest.match(/^\[#/) || rest.match(/^\[rgb/)) {
        // Color: text-[#ff0000] or text-[rgb(...)]
        const cdv = parseColorDV(rest)
        if (cdv) { props.color = cdv; return true }
      }
      // Size: text-[20px]
      const sdv = parseNumericDV(rest, FONT_SIZE_TOKENS)
      if (sdv) { props.fontSize = sdv; return true }
      return false
    }

    // Named fontSize token (xs, sm, base, lg, xl, 2xl, etc.)
    if (FONT_SIZE_TOKEN_SET.has(rest)) {
      const value = FONT_SIZE_TOKENS.get(rest)!
      props.fontSize = { mode: 'token', token: rest, value }
      // Don't auto-set lineHeight — Tailwind v4's `text-sm` already includes
      // its compound line-height. Setting it explicitly would output `text-sm/normal`
      // which overrides the native value (1.25rem) with `leading-normal` (1.5).
      return true
    }

    // Color token (white, black, red-500, etc.)
    const cdv = parseColorDV(rest)
    if (cdv) { props.color = cdv; return true }

    return false
  }

  // leading- (standalone lineHeight)
  if (cls.startsWith('leading-')) {
    const rest = cls.slice(8)
    const lhValue = LINE_HEIGHT_TOKENS.get(rest)
    if (lhValue !== undefined) { props.lineHeight = { mode: 'token', token: rest, value: lhValue }; return true }
    const m = rest.match(/^\[(\d+(?:\.\d+)?)\]$/)
    if (m) { props.lineHeight = { mode: 'custom', value: parseFloat(m[1]) }; return true }
    return false
  }

  // tracking- (letterSpacing)
  if (cls.startsWith('tracking-')) {
    const rest = cls.slice(9)
    const dv = parseNumericDV(rest, LETTER_SPACING_TOKENS)
    if (dv) { props.letterSpacing = dv; return true }
    return false
  }

  // Style / decoration / transform / whitespace
  if (cls === 'italic') { props.fontStyle = 'italic'; return true }
  if (cls === 'not-italic') { props.fontStyle = 'normal'; return true }
  if (cls === 'underline') { props.textDecoration = 'underline'; return true }
  if (cls === 'line-through') { props.textDecoration = 'line-through'; return true }
  if (cls === 'no-underline') { props.textDecoration = 'none'; return true }
  if (cls === 'uppercase') { props.textTransform = 'uppercase'; return true }
  if (cls === 'lowercase') { props.textTransform = 'lowercase'; return true }
  if (cls === 'capitalize') { props.textTransform = 'capitalize'; return true }
  if (cls === 'normal-case') { props.textTransform = 'none'; return true }
  if (cls.startsWith('whitespace-')) { props.whiteSpace = cls.slice(11); return true }

  return false
}

function matchVisual(
  cls: string, props: Props,
  border: Partial<Border>,
  borderRadius: { corners: Partial<BorderRadius>; uniform: DesignValue<number> | null },
): boolean {
  // bg-
  if (cls.startsWith('bg-')) {
    const rest = cls.slice(3)
    // bg-[url('...')] → bgImage
    const urlMatch = rest.match(/^\[url\(['"]?(.+?)['"]?\)\]$/)
    if (urlMatch) { props.bgImage = urlMatch[1]; return true }
    // Skip bg-cover/contain/repeat/position — handled by matchBgImage
    if (['cover', 'contain', 'no-repeat', 'repeat', 'repeat-x', 'repeat-y', 'center', 'top', 'bottom', 'left', 'right', 'left-top', 'right-top', 'left-bottom', 'right-bottom'].includes(rest)) {
      return false
    }
    const cdv = parseColorDV(rest)
    if (cdv) { props.bg = cdv; return true }
    return false
  }

  // border (per-side width, style, color)
  if (cls === 'border') {
    // Uniform 1px — set all 4 sides
    const w = dvNum('', 1)
    border.top = w; border.right = { ...w }; border.bottom = { ...w }; border.left = { ...w }
    border.style = 'solid'; return true
  }
  if (cls.startsWith('border-')) {
    const rest = cls.slice(7)
    // Per-side borders: border-t, border-b-2, border-x, border-y-4, etc.
    const dirMatch = rest.match(/^([tbrlxy])(?:-(.+))?$/)
    if (dirMatch) {
      const dir = dirMatch[1]
      const widthPart = dirMatch[2]
      const wdv = widthPart ? parseNumericDV(widthPart, BORDER_WIDTH_TOKENS) : dvNum('', 1)
      if (wdv) {
        if (dir === 't') border.top = wdv
        else if (dir === 'b') border.bottom = wdv
        else if (dir === 'r') border.right = wdv
        else if (dir === 'l') border.left = wdv
        else if (dir === 'x') { border.left = wdv; border.right = { ...wdv } }
        else if (dir === 'y') { border.top = wdv; border.bottom = { ...wdv } }
        if (!border.style || border.style === 'none') border.style = 'solid'
        return true
      }
      return false
    }
    // Style
    if (['solid', 'dashed', 'dotted', 'none'].includes(rest)) {
      border.style = rest as Border['style']; return true
    }
    // Uniform width token/arbitrary (border-2, border-[3px])
    const wdv = parseNumericDV(rest, BORDER_WIDTH_TOKENS)
    if (wdv) {
      border.top = wdv; border.right = { ...wdv }; border.bottom = { ...wdv }; border.left = { ...wdv }
      if (!border.style || border.style === 'none') border.style = 'solid'
      return true
    }
    // Color
    const cdv = parseColorDV(rest)
    if (cdv) { border.color = cdv; return true }
    return false
  }

  // rounded (borderRadius)
  if (cls === 'rounded') { borderRadius.uniform = dvNum('DEFAULT', 4); return true }
  if (cls.startsWith('rounded-')) {
    const rest = cls.slice(8)
    // Per-corner: rounded-tl-, rounded-tr-, rounded-br-, rounded-bl-
    const cornerMap: Record<string, keyof BorderRadius> = {
      'tl-': 'topLeft', 'tr-': 'topRight', 'br-': 'bottomRight', 'bl-': 'bottomLeft',
    }
    for (const [prefix, corner] of Object.entries(cornerMap)) {
      if (rest.startsWith(prefix)) {
        const token = rest.slice(prefix.length)
        // Handle rounded-tl (no value = DEFAULT)
        if (!token) { borderRadius.corners[corner] = dvNum('DEFAULT', 4); return true }
        const dv = parseNumericDV(token, BORDER_RADIUS_TOKENS)
        if (dv) { borderRadius.corners[corner] = dv; return true }
        return false
      }
    }
    // Uniform: rounded-lg, rounded-[8px]
    const dv = parseNumericDV(rest, BORDER_RADIUS_TOKENS)
    if (dv) { borderRadius.uniform = dv; return true }
    return false
  }

  // overflow
  if (cls.startsWith('overflow-')) {
    const val = cls.slice(9)
    if (['visible', 'hidden', 'scroll', 'auto'].includes(val)) { props.overflow = val; return true }
    return false
  }

  // opacity
  if (cls.startsWith('opacity-')) {
    const rest = cls.slice(8)
    const dv = parseNumericDV(rest, OPACITY_TOKENS)
    if (dv) { props.opacity = dv; return true }
    // Arbitrary decimal: opacity-[0.5] → 50
    const m = rest.match(/^\[(0?\.\d+)\]$/)
    if (m) { props.opacity = { mode: 'custom', value: Math.round(parseFloat(m[1]) * 100) }; return true }
    return false
  }

  // shadow
  const shadowReverseMap: Record<string, string> = {
    'shadow-sm': 'sm', 'shadow': 'base', 'shadow-md': 'md',
    'shadow-lg': 'lg', 'shadow-xl': 'xl', 'shadow-2xl': '2xl',
  }
  if (shadowReverseMap[cls]) { props.boxShadow = shadowReverseMap[cls]; return true }

  return false
}

function matchPosition(cls: string, props: Props): boolean {
  // Position
  const positions = ['static', 'relative', 'absolute', 'fixed', 'sticky']
  if (positions.includes(cls)) { props.position = cls; return true }

  // z-index
  if (cls.startsWith('z-')) {
    const dv = parseNumericDV(cls.slice(2), Z_INDEX_TOKENS)
    if (dv) { props.zIndex = dv; return true }
  }

  // Inset
  if (cls === 'inset-auto') { props._insetAll = 'auto'; return true }
  if (cls.startsWith('inset-x-')) {
    const rest = cls.slice(8)
    if (rest === 'auto') { props._insetLeft = 'auto'; props._insetRight = 'auto'; return true }
    const dv = parseNumericDV(rest, SPACING_TOKENS)
    if (dv) { props._insetLeft = dv; props._insetRight = { ...dv }; return true }
  }
  if (cls.startsWith('inset-y-')) {
    const rest = cls.slice(8)
    if (rest === 'auto') { props._insetTop = 'auto'; props._insetBottom = 'auto'; return true }
    const dv = parseNumericDV(rest, SPACING_TOKENS)
    if (dv) { props._insetTop = dv; props._insetBottom = { ...dv }; return true }
  }
  if (cls.startsWith('inset-') && !cls.startsWith('inset-x-') && !cls.startsWith('inset-y-')) {
    const dv = parseNumericDV(cls.slice(6), SPACING_TOKENS)
    if (dv) { props._insetAll = dv; return true }
  }
  // Per-side inset: top-4, right-auto, etc.
  const insetSides: [string, string][] = [['top-', '_insetTop'], ['right-', '_insetRight'], ['bottom-', '_insetBottom'], ['left-', '_insetLeft']]
  for (const [prefix, key] of insetSides) {
    if (cls.startsWith(prefix)) {
      const rest = cls.slice(prefix.length)
      if (rest === 'auto') { props[key] = 'auto'; return true }
      const dv = parseNumericDV(rest, SPACING_TOKENS)
      if (dv) { props[key] = dv; return true }
    }
  }

  return false
}

function matchTransform(cls: string, props: Props): boolean {
  // Negative prefix handling
  const isNeg = cls.startsWith('-')
  const base = isNeg ? cls.slice(1) : cls

  // Rotate
  if (base.startsWith('rotate-')) {
    const dv = parseNumericDV(base.slice(7), ROTATE_TOKENS)
    if (dv) {
      if (isNeg) dv.value = -dv.value
      props.rotate = dv
      return true
    }
  }

  // Scale
  if (base.startsWith('scale-')) {
    const dv = parseNumericDV(base.slice(6), SCALE_TOKENS)
    if (dv) { props.scaleVal = dv; return true }
  }

  // Translate
  if (base.startsWith('translate-x-')) {
    const dv = parseNumericDV(base.slice(12), SPACING_TOKENS)
    if (dv) {
      if (isNeg) dv.value = -dv.value
      props.translateX = dv
      return true
    }
  }
  if (base.startsWith('translate-y-')) {
    const dv = parseNumericDV(base.slice(12), SPACING_TOKENS)
    if (dv) {
      if (isNeg) dv.value = -dv.value
      props.translateY = dv
      return true
    }
  }

  return false
}

function matchTransition(cls: string, props: Props): boolean {
  const transitionTypes = ['all', 'colors', 'opacity', 'shadow', 'transform']
  if (cls === 'transition') { props.transition = 'all'; return true }
  if (cls.startsWith('transition-')) {
    const val = cls.slice(11)
    if (transitionTypes.includes(val)) { props.transition = val; return true }
  }

  if (cls.startsWith('duration-')) {
    const dv = parseNumericDV(cls.slice(9), DURATION_TOKENS)
    if (dv) { props.duration = dv; return true }
  }

  const easeMap: Record<string, string> = {
    'ease-linear': 'linear', 'ease-in': 'in', 'ease-out': 'out', 'ease-in-out': 'in-out',
  }
  if (easeMap[cls]) { props.ease = easeMap[cls]; return true }

  return false
}

function matchFilter(cls: string, props: Props): boolean {
  // Blur
  if (cls === 'blur') { props.blur = dvNum('DEFAULT', 8); return true }
  if (cls.startsWith('blur-')) {
    const dv = parseNumericDV(cls.slice(5), BLUR_TOKENS)
    if (dv) { props.blur = dv; return true }
  }

  // Backdrop blur
  if (cls === 'backdrop-blur') { props.backdropBlur = dvNum('DEFAULT', 8); return true }
  if (cls.startsWith('backdrop-blur-')) {
    const dv = parseNumericDV(cls.slice(14), BLUR_TOKENS)
    if (dv) { props.backdropBlur = dv; return true }
  }

  return false
}

function matchBgImage(cls: string, props: Props): boolean {
  // bg-[url('...')] — handled in matchVisual via bg- prefix, skip here
  // bg-cover, bg-contain
  if (cls === 'bg-cover') { props.bgSize = 'cover'; return true }
  if (cls === 'bg-contain') { props.bgSize = 'contain'; return true }

  // bg-no-repeat, bg-repeat-x, bg-repeat-y
  if (cls === 'bg-no-repeat') { props.bgRepeat = 'no-repeat'; return true }
  if (cls === 'bg-repeat-x') { props.bgRepeat = 'repeat-x'; return true }
  if (cls === 'bg-repeat-y') { props.bgRepeat = 'repeat-y'; return true }
  if (cls === 'bg-repeat') { props.bgRepeat = 'repeat'; return true }

  // bg-position: bg-center, bg-top, bg-left-top, etc.
  const bgPosMap: Record<string, string> = {
    'bg-center': 'center', 'bg-top': 'top', 'bg-bottom': 'bottom', 'bg-left': 'left', 'bg-right': 'right',
    'bg-left-top': 'top-left', 'bg-right-top': 'top-right',
    'bg-left-bottom': 'bottom-left', 'bg-right-bottom': 'bottom-right',
  }
  if (bgPosMap[cls]) { props.bgPosition = bgPosMap[cls]; return true }

  return false
}

function matchMisc(cls: string, props: Props): boolean {
  if (cls.startsWith('cursor-')) {
    const val = cls.slice(7)
    if (['auto', 'default', 'pointer', 'text', 'not-allowed', 'grab'].includes(val)) {
      props.cursor = val; return true
    }
  }

  // Image object-fit
  const fitMap: Record<string, string> = {
    'object-cover': 'cover', 'object-contain': 'contain', 'object-fill': 'fill', 'object-none': 'none',
  }
  if (fitMap[cls]) { props.objectFit = fitMap[cls]; return true }

  return false
}

// --- Main parser ---

export function parseTailwindClasses(classes: string): ParsedTailwindResult {
  const tokens = classes.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { properties: {}, tailwindClasses: '' }

  const props: Props = {}
  const padding: Partial<Spacing> = {}
  const margin: Partial<Spacing> = {}
  const border: Partial<Border> = {}
  const borderRadius: { corners: Partial<BorderRadius>; uniform: DesignValue<number> | null } = {
    corners: {}, uniform: null,
  }
  const unrecognized: string[] = []

  for (const cls of tokens) {
    // Skip responsive/state prefixes — pass through
    if (cls.includes(':')) { unrecognized.push(cls); continue }

    if (matchLayout(cls, props)) continue
    if (matchSpacing(cls, padding, margin)) continue
    if (matchSizing(cls, props)) continue
    if (matchText(cls, props)) continue
    if (matchVisual(cls, props, border, borderRadius)) continue
    if (matchPosition(cls, props)) continue
    if (matchTransform(cls, props)) continue
    if (matchTransition(cls, props)) continue
    if (matchFilter(cls, props)) continue
    if (matchBgImage(cls, props)) continue
    if (matchMisc(cls, props)) continue

    unrecognized.push(cls)
  }

  // Assemble padding if any sides were set
  if (Object.keys(padding).length > 0) {
    const zero: DesignValue<number> = { mode: 'custom', value: 0 }
    props.padding = {
      top: padding.top || zero,
      right: padding.right || zero,
      bottom: padding.bottom || zero,
      left: padding.left || zero,
    }
  }

  // Assemble margin if any sides were set
  if (Object.keys(margin).length > 0) {
    const zero: DesignValue<number> = { mode: 'custom', value: 0 }
    props.margin = {
      top: margin.top || zero,
      right: margin.right || zero,
      bottom: margin.bottom || zero,
      left: margin.left || zero,
    }
  }

  // Assemble border if any fields were set
  if (Object.keys(border).length > 0) {
    const zero: DesignValue<number> = { mode: 'custom', value: 0 }
    props.border = {
      top: border.top || zero,
      right: border.right || zero,
      bottom: border.bottom || zero,
      left: border.left || zero,
      color: border.color || { mode: 'custom', value: '' },
      style: border.style || 'none',
    }
  }

  // Assemble borderRadius: per-corner overrides win over uniform
  if (borderRadius.uniform || Object.keys(borderRadius.corners).length > 0) {
    const base = borderRadius.uniform || { mode: 'custom' as const, value: 0 }
    props.borderRadius = {
      topLeft: borderRadius.corners.topLeft || { ...base },
      topRight: borderRadius.corners.topRight || { ...base },
      bottomRight: borderRadius.corners.bottomRight || { ...base },
      bottomLeft: borderRadius.corners.bottomLeft || { ...base },
    }
  }

  // Assemble inset if any sides were set
  const hasInset = '_insetAll' in props || '_insetTop' in props || '_insetRight' in props || '_insetBottom' in props || '_insetLeft' in props
  if (hasInset) {
    const zero: DesignValue<number> = { mode: 'custom', value: 0 }
    const autoDV: DesignValue<number> = { mode: 'token', token: 'auto', value: 0 }
    const resolveInsetSide = (side: unknown, all: unknown): DesignValue<number> => {
      if (side === 'auto') return { ...autoDV }
      if (side && typeof side === 'object') return side as DesignValue<number>
      if (all === 'auto') return { ...autoDV }
      if (all && typeof all === 'object') return { ...(all as DesignValue<number>) }
      return zero
    }
    props.inset = {
      top: resolveInsetSide(props._insetTop, props._insetAll),
      right: resolveInsetSide(props._insetRight, props._insetAll),
      bottom: resolveInsetSide(props._insetBottom, props._insetAll),
      left: resolveInsetSide(props._insetLeft, props._insetAll),
    }
    delete props._insetAll; delete props._insetTop; delete props._insetRight; delete props._insetBottom; delete props._insetLeft
  }

  return {
    properties: props,
    tailwindClasses: unrecognized.join(' '),
  }
}
