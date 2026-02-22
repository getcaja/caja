// Tool executor — maps MCP tool calls to frameStore actions
// This is the single entry point for both the built-in chat and the external MCP server.

import { useFrameStore } from '../store/frameStore'
import type { Frame, Spacing, SizeValue, DesignValue, Border, BorderRadius } from '../types/frame'
import type { ToolName } from './schema'
import { parseTailwindClasses } from '../utils/parseTailwindClasses'
import type { ScaleOption } from '../data/scales'
import {
  SPACING_SCALE, FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE,
  BORDER_WIDTH_SCALE, BORDER_RADIUS_SCALE, SIZE_CONSTRAINT_SCALE, OPACITY_SCALE,
  GROW_SCALE, SHRINK_SCALE,
} from '../data/scales'
import { COLOR_GRID, SPECIAL_COLORS } from '../data/colors'

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

type ToolParams = Record<string, unknown>

function getStore() {
  return useFrameStore.getState()
}

function findInTree(root: Frame, id: string): Frame | null {
  if (root.id === id) return root
  if (root.type === 'box') {
    for (const child of root.children) {
      const found = findInTree(child, id)
      if (found) return found
    }
  }
  return null
}

// Compact snapshot for mutation responses — only essential fields
function compactSnapshot(frame: Frame): Record<string, unknown> {
  const snap: Record<string, unknown> = { id: frame.id, type: frame.type, name: frame.name }
  if (frame.type === 'box') {
    snap.childCount = frame.children.length
    snap.childIds = frame.children.map((c) => c.id)
  }
  return snap
}

// Full snapshot for read tools (strips children array but keeps all properties)
function frameSnapshot(frame: Frame): Record<string, unknown> {
  if (frame.type === 'box') {
    const { children, ...rest } = frame
    return { ...rest, childCount: children.length, childIds: children.map((c) => c.id) }
  }
  return { ...frame }
}

// --- Token lookup maps (value → token) for auto-matching raw MCP inputs ---

function buildNumLookup(scale: ScaleOption[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const { token, value } of scale) map.set(value, token)
  return map
}

function buildColorLookup(): Map<string, string> {
  const map = new Map<string, string>()
  for (const { token, value } of SPECIAL_COLORS) map.set(value.toLowerCase(), token)
  for (const family of COLOR_GRID) {
    for (const { token, value } of family.shades) map.set(value.toLowerCase(), token)
  }
  return map
}

const SPACING_LOOKUP = buildNumLookup(SPACING_SCALE)
const FONT_SIZE_LOOKUP = buildNumLookup(FONT_SIZE_SCALE)
const FONT_WEIGHT_LOOKUP = buildNumLookup(FONT_WEIGHT_SCALE)
const GROW_LOOKUP = buildNumLookup(GROW_SCALE)
const SHRINK_LOOKUP = buildNumLookup(SHRINK_SCALE)
const LINE_HEIGHT_LOOKUP = buildNumLookup(LINE_HEIGHT_SCALE)
const LETTER_SPACING_LOOKUP = buildNumLookup(LETTER_SPACING_SCALE)
const BORDER_WIDTH_LOOKUP = buildNumLookup(BORDER_WIDTH_SCALE)
const BORDER_RADIUS_LOOKUP = buildNumLookup(BORDER_RADIUS_SCALE)
const SIZE_CONSTRAINT_LOOKUP = buildNumLookup(SIZE_CONSTRAINT_SCALE)
const OPACITY_LOOKUP = buildNumLookup(OPACITY_SCALE)
const COLOR_LOOKUP = buildColorLookup()

// --- Sanitization helpers for MCP inputs ---
// Wrap raw number/string values into DesignValue objects,
// auto-matching to Tailwind tokens when possible.

function sanitizeDVNum(raw: unknown, lookup?: Map<number, string>): DesignValue<number> | undefined {
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

function sanitizeDVStr(raw: unknown, colorLookup?: Map<string, string>): DesignValue<string> | undefined {
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

function sanitizeSpacingValues(values: Record<string, unknown>): Partial<Spacing> {
  const result: Partial<Spacing> = {}
  if ('top' in values) { const v = sanitizeDVNum(values.top, SPACING_LOOKUP); if (v) result.top = v }
  if ('right' in values) { const v = sanitizeDVNum(values.right, SPACING_LOOKUP); if (v) result.right = v }
  if ('bottom' in values) { const v = sanitizeDVNum(values.bottom, SPACING_LOOKUP); if (v) result.bottom = v }
  if ('left' in values) { const v = sanitizeDVNum(values.left, SPACING_LOOKUP); if (v) result.left = v }
  return result
}

function sanitizeBorderRadius(raw: unknown): BorderRadius | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw === 'number') {
    const dv = sanitizeDVNum(raw, BORDER_RADIUS_LOOKUP) || { mode: 'custom' as const, value: raw }
    return { topLeft: dv, topRight: { ...dv }, bottomRight: { ...dv }, bottomLeft: { ...dv } }
  }
  if (typeof raw === 'object' && raw !== null) {
    const r = raw as Record<string, unknown>
    // Check if it's already migrated (has DesignValue sub-fields)
    if (r.topLeft !== undefined && typeof r.topLeft === 'object') return raw as BorderRadius
    // Old format: { topLeft: number, ... }
    return {
      topLeft: sanitizeDVNum(r.topLeft, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      topRight: sanitizeDVNum(r.topRight, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      bottomRight: sanitizeDVNum(r.bottomRight, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
      bottomLeft: sanitizeDVNum(r.bottomLeft, BORDER_RADIUS_LOOKUP) || { mode: 'custom', value: 0 },
    }
  }
  return undefined
}

function sanitizeBorder(raw: unknown, existing: Border): Border | undefined {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return {
    width: sanitizeDVNum(r.width, BORDER_WIDTH_LOOKUP) || existing.width,
    color: sanitizeDVStr(r.color, COLOR_LOOKUP) || existing.color,
    style: (r.style as Border['style']) || existing.style,
  }
}

// Sanitize raw MCP property values → DesignValue objects expected by the store.
// Used by both add_frame and update_frame to prevent crashes from raw numbers/strings.
function sanitizeFrameProperties(props: Record<string, unknown>, existingFrame?: Frame): Record<string, unknown> {
  const sanitized = { ...props }

  // label → content alias for backwards MCP compat (button)
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

  // [Experimental] fontFamily: pass through as trimmed string
  if ('fontFamily' in sanitized) {
    sanitized.fontFamily = typeof sanitized.fontFamily === 'string' ? sanitized.fontFamily.trim() : ''
  }

  // border: coerce primitive fields
  if ('border' in sanitized && existingFrame) {
    const v = sanitizeBorder(sanitized.border, existingFrame.border)
    if (v) sanitized.border = v
  }

  return sanitized
}

// --- Batch variable substitution ---
// Replaces "$prev", "$0", "$1", etc. in string values with resolved IDs from earlier operations.
function resolveRefs(params: Record<string, unknown>, resultIds: string[]): Record<string, unknown> {
  const resolve = (val: unknown): unknown => {
    if (typeof val === 'string') {
      if (val === '$prev') {
        for (let i = resultIds.length - 1; i >= 0; i--) {
          if (resultIds[i]) return resultIds[i]
        }
        return val
      }
      const m = val.match(/^\$(\d+)$/)
      if (m) {
        const idx = parseInt(m[1])
        return (idx < resultIds.length && resultIds[idx]) ? resultIds[idx] : val
      }
      return val
    }
    if (Array.isArray(val)) return val.map(resolve)
    if (val !== null && typeof val === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) out[k] = resolve(v)
      return out
    }
    return val
  }
  return resolve(params) as Record<string, unknown>
}

// Extracts the result ID from any tool result shape.
function extractResultId(result: ToolResult): string {
  if (!result.data || typeof result.data !== 'object') return ''
  const d = result.data as Record<string, unknown>
  if (typeof d.id === 'string') return d.id               // add/update/move/rename
  if (typeof d.duplicate === 'string') return d.duplicate  // duplicate_frame
  if (typeof d.removed === 'string') return d.removed      // remove_frame
  if (typeof d.wrapped === 'string') return d.wrapped      // wrap_frame
  return ''
}

// Lightweight tree representation for LLM context — strips all styling, keeps structure.
function summaryTree(frame: Frame): Record<string, unknown> {
  const node: Record<string, unknown> = { id: frame.id, type: frame.type, name: frame.name }
  if (frame.type === 'text' || frame.type === 'button') node.content = (frame as { content: string }).content
  if (frame.type === 'box') {
    node.display = frame.display
    node.childCount = frame.children.length
    node.children = frame.children.map(summaryTree)
  }
  return node
}

type ToolHandler = (params: ToolParams) => ToolResult | Promise<ToolResult>

const handlers: Record<string, ToolHandler> = {
  add_frame(params) {
    const { parent_id, element_type, properties, classes } = params as {
      parent_id: string
      element_type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'
      properties?: Record<string, unknown>
      classes?: string
    }

    const store = getStore()
    const parent = findInTree(store.root, parent_id)
    if (!parent || parent.type !== 'box') {
      return { success: false, error: `Parent ${parent_id} not found or is not a box` }
    }

    // Merge classes (parsed) + explicit properties (wins)
    let mergedProps = properties || {}
    if (classes) {
      const parsed = parseTailwindClasses(classes)
      mergedProps = { ...parsed.properties, ...mergedProps }
      if (parsed.tailwindClasses) {
        // Append unrecognized classes to tailwindClasses
        const existing = (mergedProps.tailwindClasses as string) || ''
        mergedProps.tailwindClasses = existing ? `${existing} ${parsed.tailwindClasses}` : parsed.tailwindClasses
      }
    }

    // Sanitize properties before passing to addChild (no existing frame for border fallback)
    const sanitized = Object.keys(mergedProps).length > 0 ? sanitizeFrameProperties(mergedProps) : undefined
    store.addChild(parent_id, element_type, sanitized as Partial<Frame>)

    // The new child is the last child of the parent after addChild
    const updatedParent = findInTree(getStore().root, parent_id)
    if (updatedParent && updatedParent.type === 'box') {
      const newChild = updatedParent.children[updatedParent.children.length - 1]
      const finalChild = findInTree(getStore().root, newChild.id)
      return { success: true, data: finalChild ? compactSnapshot(finalChild) : { id: newChild.id } }
    }

    return { success: true }
  },

  update_frame(params) {
    const { id, properties, classes } = params as { id: string; properties?: Record<string, unknown>; classes?: string }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    // Merge classes (parsed) + explicit properties (wins)
    let mergedProps = properties || {}
    if (classes) {
      const parsed = parseTailwindClasses(classes)
      mergedProps = { ...parsed.properties, ...mergedProps }
      if (parsed.tailwindClasses) {
        const existing = (mergedProps.tailwindClasses as string) || ''
        mergedProps.tailwindClasses = existing ? `${existing} ${parsed.tailwindClasses}` : parsed.tailwindClasses
      }
    }

    if (Object.keys(mergedProps).length === 0) {
      return { success: false, error: 'Either properties or classes must be provided' }
    }

    // Validate options format before sanitizing
    if ('options' in mergedProps) {
      const raw = mergedProps.options
      if (typeof raw !== 'string' && !Array.isArray(raw)) {
        return { success: false, error: 'options must be an array of {value, label} objects or a newline-separated string' }
      }
    }

    const sanitized = sanitizeFrameProperties(mergedProps, frame)
    store.updateFrame(id, sanitized as Partial<Frame>)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? compactSnapshot(updated) : undefined }
  },

  update_spacing(params) {
    const { id, field, values } = params as {
      id: string
      field: 'padding' | 'margin'
      values: Record<string, unknown>
    }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    // Sanitize each side: number → DesignValue<number>
    const sanitized = sanitizeSpacingValues(values)
    store.updateSpacing(id, field, sanitized)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? { [field]: updated[field] } : undefined }
  },

  update_size(params) {
    const { id, dimension, size } = params as {
      id: string
      dimension: 'width' | 'height'
      size: Record<string, unknown>
    }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    // Sanitize value: number → DesignValue<number>
    const sanitized: Partial<SizeValue> = {}
    if ('mode' in size) sanitized.mode = size.mode as SizeValue['mode']
    if ('value' in size) {
      const v = sanitizeDVNum(size.value, SIZE_CONSTRAINT_LOOKUP)
      if (v) sanitized.value = v
    }

    store.updateSize(id, dimension, sanitized)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? { [dimension]: updated[dimension] } : undefined }
  },

  remove_frame(params) {
    const { id } = params as { id: string }
    const store = getStore()
    if (id === store.getRootId()) {
      return { success: false, error: 'Cannot remove the root' }
    }
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    store.removeFrame(id)
    return { success: true, data: { removed: id } }
  },

  move_frame(params) {
    const { id, new_parent_id, index } = params as {
      id: string
      new_parent_id: string
      index: number
    }
    const store = getStore()
    store.moveFrame(id, new_parent_id, index)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? compactSnapshot(updated) : undefined }
  },

  wrap_frame(params) {
    const { id } = params as { id: string }
    const store = getStore()
    store.wrapInFrame(id)
    return { success: true, data: { wrapped: id } }
  },

  duplicate_frame(params) {
    const { id } = params as { id: string }
    const store = getStore()
    store.duplicateFrame(id)
    // After duplicate, the selected ID is the new clone
    const newId = getStore().selectedId
    return { success: true, data: { original: id, duplicate: newId } }
  },

  rename_frame(params) {
    const { id, name } = params as { id: string; name: string }
    const store = getStore()
    store.renameFrame(id, name)
    return { success: true, data: { id, name } }
  },

  select_frame(params) {
    const { id } = params as { id: string | null }
    getStore().select(id)
    return { success: true, data: { selected: id } }
  },

  get_tree(params) {
    const { summary } = params as { summary?: boolean }
    const root = getStore().root
    return { success: true, data: summary ? summaryTree(root) : root }
  },

  get_selected() {
    const selected = getStore().getSelected()
    return { success: true, data: selected ? frameSnapshot(selected) : null }
  },

  async screenshot() {
    const { toPng } = await import('html-to-image')
    const el = document.getElementById('caja-canvas')
    if (!el) return { success: false, error: 'Canvas element not found' }

    // Temporarily deselect to remove editor outlines
    const store = getStore()
    const prevSelected = store.selectedId
    store.select(null)
    store.hover(null)

    // Read the full scroll dimensions before modifying layout
    const fullHeight = el.scrollHeight
    const fullWidth = el.offsetWidth

    // Break out of flex layout so the element renders at full content height
    const saved = el.style.cssText
    el.style.cssText = `position:absolute;top:0;left:0;width:${fullWidth}px;height:${fullHeight}px;overflow:visible;z-index:-1;`

    // Wait for React re-render + layout reflow
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)))

    try {
      const dataUrl = await toPng(el, { cacheBust: true, width: fullWidth, height: fullHeight })
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      return { success: true, data: { image: base64, mimeType: 'image/png' } }
    } finally {
      // Restore
      el.style.cssText = saved
      if (prevSelected) store.select(prevSelected)
    }
  },

  async batch_update(params) {
    const { operations } = params as {
      operations: Array<{ tool: string; params: Record<string, unknown> }>
    }

    const results: ToolResult[] = []
    const resultIds: string[] = []  // tracks every op's ID (or '' if none) for $N indexing
    for (const op of operations) {
      if (op.tool === 'batch_update') {
        results.push({ success: false, error: 'Cannot nest batch_update' })
        resultIds.push('')
        continue
      }
      const resolved = resolveRefs(op.params, resultIds)
      const result = await executeTool(op.tool as ToolName, resolved)
      results.push(result)
      resultIds.push(extractResultId(result))
      if (!result.success) break // stop on first error
    }

    const allSuccess = results.every((r) => r.success)
    const ids = resultIds.filter(Boolean)
    if (allSuccess) {
      return { success: true, data: { count: results.length, ids } }
    }
    const failedIdx = results.findIndex((r) => !r.success)
    return { success: false, error: results[failedIdx]?.error, data: { failedAt: failedIdx, count: results.length } }
  },
}

export async function executeTool(name: string, params: ToolParams = {}): Promise<ToolResult> {
  const handler = handlers[name]
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` }
  }
  try {
    return await handler(params)
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function getToolNames(): string[] {
  return Object.keys(handlers)
}
