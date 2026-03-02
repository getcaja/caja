// Sanitization helpers for MCP inputs — wraps raw number/string values into
// DesignValue objects, auto-matching to Tailwind tokens when possible.

import type { Frame, Spacing, Border, BorderRadius, DesignValue } from '../types/frame'
import type { ScaleOption } from '../data/scales'
import {
  SPACING_SCALE, FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE,
  BORDER_WIDTH_SCALE, BORDER_RADIUS_SCALE, SIZE_CONSTRAINT_SCALE, OPACITY_SCALE,
  GROW_SCALE, SHRINK_SCALE,
  Z_INDEX_SCALE, GRID_COLS_SCALE, GRID_ROWS_SCALE, COL_SPAN_SCALE, ROW_SPAN_SCALE,
  ROTATE_SCALE, SCALE_SCALE, DURATION_SCALE, BLUR_SCALE,
} from '../data/scales'
import { COLOR_GRID, SPECIAL_COLORS } from '../data/colors'

// --- Token lookup maps (value → token) for auto-matching raw MCP inputs ---

export function buildNumLookup(scale: ScaleOption[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const { token, value } of scale) map.set(value, token)
  return map
}

export function buildColorLookup(): Map<string, string> {
  const map = new Map<string, string>()
  for (const { token, value } of SPECIAL_COLORS) map.set(value.toLowerCase(), token)
  for (const family of COLOR_GRID) {
    for (const { token, value } of family.shades) map.set(value.toLowerCase(), token)
  }
  return map
}

export const SPACING_LOOKUP = buildNumLookup(SPACING_SCALE)
export const FONT_SIZE_LOOKUP = buildNumLookup(FONT_SIZE_SCALE)
export const FONT_WEIGHT_LOOKUP = buildNumLookup(FONT_WEIGHT_SCALE)
export const GROW_LOOKUP = buildNumLookup(GROW_SCALE)
export const SHRINK_LOOKUP = buildNumLookup(SHRINK_SCALE)
export const LINE_HEIGHT_LOOKUP = buildNumLookup(LINE_HEIGHT_SCALE)
export const LETTER_SPACING_LOOKUP = buildNumLookup(LETTER_SPACING_SCALE)
export const BORDER_WIDTH_LOOKUP = buildNumLookup(BORDER_WIDTH_SCALE)
export const BORDER_RADIUS_LOOKUP = buildNumLookup(BORDER_RADIUS_SCALE)
export const SIZE_CONSTRAINT_LOOKUP = buildNumLookup(SIZE_CONSTRAINT_SCALE)
export const OPACITY_LOOKUP = buildNumLookup(OPACITY_SCALE)
export const Z_INDEX_LOOKUP = buildNumLookup(Z_INDEX_SCALE)
export const GRID_COLS_LOOKUP = buildNumLookup(GRID_COLS_SCALE)
export const GRID_ROWS_LOOKUP = buildNumLookup(GRID_ROWS_SCALE)
export const COL_SPAN_LOOKUP = buildNumLookup(COL_SPAN_SCALE)
export const ROW_SPAN_LOOKUP = buildNumLookup(ROW_SPAN_SCALE)
export const ROTATE_LOOKUP = buildNumLookup(ROTATE_SCALE)
export const SCALE_LOOKUP = buildNumLookup(SCALE_SCALE)
export const DURATION_LOOKUP = buildNumLookup(DURATION_SCALE)
export const BLUR_LOOKUP = buildNumLookup(BLUR_SCALE)
export const COLOR_LOOKUP = buildColorLookup()

// --- Sanitization functions ---

export function sanitizeDVNum(raw: unknown, lookup?: Map<number, string>): DesignValue<number> | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number') {
    if (lookup) {
      const token = lookup.get(raw)
      if (token !== undefined) return { mode: 'token', token, value: raw }
    }
    return { mode: 'custom', value: raw }
  }
  if (typeof raw === 'object' && raw !== null && 'mode' in raw) return raw as DesignValue<number>
  return undefined
}

export function sanitizeDVStr(raw: unknown, colorLookup?: Map<string, string>): DesignValue<string> | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'string') {
    if (colorLookup) {
      const token = colorLookup.get(raw.toLowerCase())
      if (token) return { mode: 'token', token, value: raw }
    }
    return { mode: 'custom', value: raw }
  }
  if (typeof raw === 'object' && raw !== null && 'mode' in raw) return raw as DesignValue<string>
  return undefined
}

export function sanitizeSpacingValues(values: Record<string, unknown>): Partial<Spacing> {
  const result: Partial<Spacing> = {}
  if ('top' in values) { const v = sanitizeDVNum(values.top, SPACING_LOOKUP); if (v) result.top = v }
  if ('right' in values) { const v = sanitizeDVNum(values.right, SPACING_LOOKUP); if (v) result.right = v }
  if ('bottom' in values) { const v = sanitizeDVNum(values.bottom, SPACING_LOOKUP); if (v) result.bottom = v }
  if ('left' in values) { const v = sanitizeDVNum(values.left, SPACING_LOOKUP); if (v) result.left = v }
  return result
}

export function sanitizeBorderRadius(raw: unknown): BorderRadius | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number') {
    const dv = sanitizeDVNum(raw, BORDER_RADIUS_LOOKUP) || { mode: 'custom' as const, value: raw }
    return { topLeft: dv, topRight: { ...dv }, bottomRight: { ...dv }, bottomLeft: { ...dv } }
  }
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>
    if (r.topLeft !== undefined && typeof r.topLeft === 'object') return raw as BorderRadius
    return {
      topLeft: sanitizeDVNum(r.topLeft, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      topRight: sanitizeDVNum(r.topRight, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      bottomRight: sanitizeDVNum(r.bottomRight, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      bottomLeft: sanitizeDVNum(r.bottomLeft, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
    }
  }
  return undefined
}

export function sanitizeBorder(raw: unknown, existing: Border): Border | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  if ('width' in r && !('top' in r)) {
    const w = sanitizeDVNum(r.width, BORDER_WIDTH_LOOKUP) || existing.top
    return {
      top: w, right: { ...w }, bottom: { ...w }, left: { ...w },
      color: sanitizeDVStr(r.color, COLOR_LOOKUP) || existing.color,
      style: (r.style as Border['style']) || existing.style,
    }
  }
  return {
    top: sanitizeDVNum(r.top, BORDER_WIDTH_LOOKUP) || existing.top,
    right: sanitizeDVNum(r.right, BORDER_WIDTH_LOOKUP) || existing.right,
    bottom: sanitizeDVNum(r.bottom, BORDER_WIDTH_LOOKUP) || existing.bottom,
    left: sanitizeDVNum(r.left, BORDER_WIDTH_LOOKUP) || existing.left,
    color: sanitizeDVStr(r.color, COLOR_LOOKUP) || existing.color,
    style: (r.style as Border['style']) || existing.style,
  }
}

export function sanitizeFrameProperties(props: Record<string, unknown>, existingFrame?: Frame): Record<string, unknown> {
  const sanitized = { ...props }

  // label → content alias for backwards MCP compat
  if ('label' in sanitized && !('content' in sanitized)) {
    sanitized.content = sanitized.label
    delete sanitized.label
  }

  // options: must be SelectOption[], coerce from string or reject
  if ('options' in sanitized) {
    const raw = sanitized.options
    if (typeof raw === 'string') {
      sanitized.options = raw.split('\n').filter(Boolean).map((line: string) => {
        const trimmed = line.trim()
        return { value: trimmed.toLowerCase().replace(/\s+/g, '-'), label: trimmed }
      })
    }
  }

  // DesignValue<number> fields — coerce number → DesignValue, auto-match tokens
  const numFieldLookup: Record<string, Map<number, string>> = {
    fontSize: FONT_SIZE_LOOKUP,
    fontWeight: FONT_WEIGHT_LOOKUP,
    lineHeight: LINE_HEIGHT_LOOKUP,
    letterSpacing: LETTER_SPACING_LOOKUP,
    gap: SPACING_LOOKUP,
    opacity: OPACITY_LOOKUP,
    grow: GROW_LOOKUP,
    shrink: SHRINK_LOOKUP,
    minWidth: SIZE_CONSTRAINT_LOOKUP,
    maxWidth: SIZE_CONSTRAINT_LOOKUP,
    minHeight: SIZE_CONSTRAINT_LOOKUP,
    maxHeight: SIZE_CONSTRAINT_LOOKUP,
    zIndex: Z_INDEX_LOOKUP,
    gridCols: GRID_COLS_LOOKUP,
    gridRows: GRID_ROWS_LOOKUP,
    colSpan: COL_SPAN_LOOKUP,
    rowSpan: ROW_SPAN_LOOKUP,
    rotate: ROTATE_LOOKUP,
    scaleVal: SCALE_LOOKUP,
    translateX: SPACING_LOOKUP,
    translateY: SPACING_LOOKUP,
    duration: DURATION_LOOKUP,
    blur: BLUR_LOOKUP,
    backdropBlur: BLUR_LOOKUP,
  }
  for (const key of Object.keys(numFieldLookup)) {
    if (key in sanitized) {
      const v = sanitizeDVNum(sanitized[key], numFieldLookup[key])
      if (v) sanitized[key] = v
    }
  }

  // DesignValue<string> fields — coerce string → DesignValue, auto-match color tokens
  for (const key of ['bg', 'color'] as const) {
    if (key in sanitized) {
      const v = sanitizeDVStr(sanitized[key], COLOR_LOOKUP)
      if (v) sanitized[key] = v
    }
  }

  // borderRadius: coerce number → uniform DV object
  if ('borderRadius' in sanitized) {
    const v = sanitizeBorderRadius(sanitized.borderRadius)
    if (v) sanitized.borderRadius = v
  }

  // bgImage: pass through as trimmed string
  if ('bgImage' in sanitized) {
    sanitized.bgImage = typeof sanitized.bgImage === 'string' ? sanitized.bgImage.trim() : ''
  }

  // [Experimental] fontFamily: pass through as trimmed string
  if ('fontFamily' in sanitized) {
    sanitized.fontFamily = typeof sanitized.fontFamily === 'string' ? sanitized.fontFamily.trim() : ''
  }

  // border: coerce primitive fields
  if ('border' in sanitized && existingFrame) {
    const v = sanitizeBorder(sanitized.border, existingFrame.border)
    if (v) sanitized.border = v
  }

  // responsive: sanitize each breakpoint's overrides
  if ('responsive' in sanitized && sanitized.responsive && typeof sanitized.responsive === 'object') {
    const resp = sanitized.responsive as Record<string, unknown>
    for (const bp of ['md', 'sm'] as const) {
      if (resp[bp] && typeof resp[bp] === 'object') {
        resp[bp] = sanitizeFrameProperties(resp[bp] as Record<string, unknown>, existingFrame)
      }
    }
    sanitized.responsive = resp
  }

  return sanitized
}
