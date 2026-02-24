// Tool executor — maps MCP tool calls to frameStore actions
// This is the single entry point for both the built-in chat and the external MCP server.

import { useFrameStore, findInTree, cloneWithNewIds } from '../store/frameStore'
import { useCatalogStore } from '../store/catalogStore'
import type { Frame, Spacing, SizeValue, DesignValue, Border, BorderRadius } from '../types/frame'
import type { ToolName } from './schema'
import { parseTailwindClasses } from '../utils/parseTailwindClasses'
import type { ScaleOption } from '../data/scales'
import {
  SPACING_SCALE, FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE,
  BORDER_WIDTH_SCALE, BORDER_RADIUS_SCALE, SIZE_CONSTRAINT_SCALE, OPACITY_SCALE,
  GROW_SCALE, SHRINK_SCALE,
  Z_INDEX_SCALE, GRID_COLS_SCALE, GRID_ROWS_SCALE, COL_SPAN_SCALE, ROW_SPAN_SCALE,
  ROTATE_SCALE, SCALE_SCALE, DURATION_SCALE, BLUR_SCALE,
} from '../data/scales'
import { COLOR_GRID, SPECIAL_COLORS } from '../data/colors'

// 1×1 transparent PNG — fallback for CORS-blocked images during screenshot
const IMG_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualHQAAAABJRU5ErkJggg=='

interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  hint?: string
}

type ToolParams = Record<string, unknown>

function getStore() {
  return useFrameStore.getState()
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
const Z_INDEX_LOOKUP = buildNumLookup(Z_INDEX_SCALE)
const GRID_COLS_LOOKUP = buildNumLookup(GRID_COLS_SCALE)
const GRID_ROWS_LOOKUP = buildNumLookup(GRID_ROWS_SCALE)
const COL_SPAN_LOOKUP = buildNumLookup(COL_SPAN_SCALE)
const ROW_SPAN_LOOKUP = buildNumLookup(ROW_SPAN_SCALE)
const ROTATE_LOOKUP = buildNumLookup(ROTATE_SCALE)
const SCALE_LOOKUP = buildNumLookup(SCALE_SCALE)
const DURATION_LOOKUP = buildNumLookup(DURATION_SCALE)
const BLUR_LOOKUP = buildNumLookup(BLUR_SCALE)
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

  return sanitized
}

// --- Batch variable substitution ---
// Replaces "$prev", "$0", "$1", etc. ONLY in known ID-reference fields to avoid
// corrupting content text like "$0" (a price) into a frame ID.
const ID_FIELDS = new Set(['parent_id', 'id', 'new_parent_id', 'snippet_id', 'pattern_id', 'frame_id'])

function resolveRefs(params: Record<string, unknown>, resultIds: string[]): Record<string, unknown> {
  const resolve = (val: unknown, key?: string): unknown => {
    if (typeof val === 'string' && key && ID_FIELDS.has(key)) {
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
    if (Array.isArray(val)) return val.map((v) => resolve(v))
    if (val !== null && typeof val === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) out[k] = resolve(v, k)
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
  if (typeof d.wrapper === 'string') return d.wrapper      // wrap_frame (return wrapper, not wrapped)
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
    const { parent_id, element_type, properties, classes, index } = params as {
      parent_id: string
      element_type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'
      properties?: Record<string, unknown>
      classes?: string
      index?: number
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

    // Sanitize properties before passing to store (no existing frame for border fallback)
    const sanitized = Object.keys(mergedProps).length > 0 ? sanitizeFrameProperties(mergedProps) : undefined

    // Build result with optional pattern hint when parent has repeated same-type children
    const buildAddResult = (child: Frame, parentFrame: Frame): ToolResult => {
      const finalChild = findInTree(getStore().root, child.id)
      const result: ToolResult = { success: true, data: finalChild ? compactSnapshot(finalChild) : { id: child.id } }
      if (parentFrame.type === 'box') {
        const sameTypeCount = parentFrame.children.filter(c => c.type === element_type).length
        if (sameTypeCount >= 3) {
          result.hint = `Parent has ${sameTypeCount} ${element_type} children. Consider save_pattern + insert_pattern with overrides for repeated patterns.`
        }
      }
      return result
    }

    if (index !== undefined) {
      // Insert at specific position — use addChild then move to index
      store.addChild(parent_id, element_type, sanitized as Partial<Frame>)
      const updatedParent = findInTree(getStore().root, parent_id)
      if (updatedParent && updatedParent.type === 'box') {
        const newChild = updatedParent.children[updatedParent.children.length - 1]
        // Move from end to requested index
        if (index < updatedParent.children.length - 1) {
          store.moveFrame(newChild.id, parent_id, index)
        }
        return buildAddResult(newChild, findInTree(getStore().root, parent_id)! as Frame & { type: 'box' })
      }
    } else {
      store.addChild(parent_id, element_type, sanitized as Partial<Frame>)
      // The new child is the last child of the parent after addChild
      const updatedParent = findInTree(getStore().root, parent_id)
      if (updatedParent && updatedParent.type === 'box') {
        const newChild = updatedParent.children[updatedParent.children.length - 1]
        return buildAddResult(newChild, updatedParent)
      }
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
      field: 'padding' | 'margin' | 'inset'
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
    const wrapperId = getStore().selectedId
    return { success: true, data: { wrapped: id, wrapper: wrapperId } }
  },

  duplicate_frame(params) {
    const { id } = params as { id: string }
    const store = getStore()
    store.duplicateFrame(id)
    // After duplicate, the selected ID is the new clone
    const updated = getStore()
    const newId = updated.selectedId
    const idMap = updated._lastDuplicateMap || {}
    return {
      success: true,
      data: { original: id, duplicate: newId, idMap },
      hint: 'Use idMap to update cloned children directly: batch_update with update_frame for each idMap value. For repeated patterns, consider save_pattern + insert_pattern with overrides instead.',
    }
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
    const iframeWin = getStore().iframeWindow
    const el = iframeWin?.document.getElementById('caja-root')
    if (!el) return { success: false, error: 'Canvas element not found' }

    // Temporarily deselect to remove editor outlines
    const store = getStore()
    const prevSelected = store.selectedId
    store.select(null)
    store.hover(null)

    // Wait for React re-render + layout reflow
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)))

    const fullWidth = el.scrollWidth
    const fullHeight = el.scrollHeight

    try {
      const dataUrl = await toPng(el, { cacheBust: true, width: fullWidth, height: fullHeight, imagePlaceholder: IMG_PLACEHOLDER })
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      return { success: true, data: { image: base64, mimeType: 'image/png' } }
    } finally {
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
      const response: ToolResult = { success: true, data: { count: results.length, ids } }
      // Nudge about snippets when building many similar structures
      if (results.length >= 8) {
        const addCount = operations.filter((op) => op.tool === 'add_frame').length
        if (addCount >= 6) {
          response.hint = 'Building a complex structure? Save it as a pattern with save_pattern, then reuse with insert_pattern + overrides to avoid rebuilding.'
        }
      }
      return response
    }
    const failedIdx = results.findIndex((r) => !r.success)
    const completedIds = resultIds.slice(0, failedIdx).filter(Boolean)
    return { success: false, error: results[failedIdx]?.error, data: { failedAt: failedIdx, completedCount: failedIdx, completedIds, totalRequested: operations.length } }
  },

  // --- Pattern tools (with backward-compat snippet aliases) ---

  list_patterns(params) {
    const { tag } = params as { tag?: string }
    const catalogStore = useCatalogStore.getState()
    let all = catalogStore.allPatterns()
    if (tag) all = all.filter((s) => s.tags.includes(tag))
    return {
      success: true,
      data: all.map(({ id, name, tags, meta, createdAt }) => ({ id, name, tags, meta, createdAt })),
    }
  },

  insert_pattern(params) {
    const { pattern_id, snippet_id, parent_id, index, overrides, library_id } = params as {
      pattern_id?: string
      snippet_id?: string // backward compat alias
      parent_id: string
      index?: number
      overrides?: Record<string, { properties?: Record<string, unknown>; classes?: string }>
      library_id?: string // optional: insert from an external library
    }
    const resolvedId = pattern_id || snippet_id
    if (!resolvedId) return { success: false, error: 'pattern_id is required' }

    const catalogStore = useCatalogStore.getState()
    // Look up pattern from library or internal catalog
    const pattern = library_id
      ? catalogStore.getLibraryPattern(library_id, resolvedId)
      : catalogStore.getPattern(resolvedId)
    if (!pattern) return { success: false, error: `Pattern ${resolvedId} not found${library_id ? ` in library ${library_id}` : ''}` }

    const store = getStore()
    const parent = findInTree(store.root, parent_id)
    if (!parent || parent.type !== 'box') {
      return { success: false, error: `Parent ${parent_id} not found or is not a box` }
    }

    const origin = { libraryId: library_id || 'internal', patternId: pattern.id }
    if (index !== undefined) {
      store.insertFrameAt(parent_id, pattern.frame, index, origin)
    } else {
      // Default: append at end (most natural for MCP sequential building)
      store.insertFrameAt(parent_id, pattern.frame, parent.children.length, origin)
    }
    const newId = getStore().selectedId

    // Apply overrides by matching frame names in the cloned tree
    if (overrides && newId) {
      const insertedRoot = findInTree(getStore().root, newId)
      if (insertedRoot) {
        const nameToId = new Map<string, string>()
        const collectNames = (frame: Frame) => {
          nameToId.set(frame.name, frame.id)
          if (frame.type === 'box') frame.children.forEach(collectNames)
        }
        collectNames(insertedRoot)

        for (const [name, patch] of Object.entries(overrides)) {
          const frameId = nameToId.get(name)
          if (!frameId) continue
          const target = findInTree(getStore().root, frameId)
          if (!target) continue

          let mergedProps = patch.properties || {}
          if (patch.classes) {
            const parsed = parseTailwindClasses(patch.classes)
            mergedProps = { ...parsed.properties, ...mergedProps }
            if (parsed.tailwindClasses) {
              const existing = (mergedProps.tailwindClasses as string) || ''
              mergedProps.tailwindClasses = existing ? `${existing} ${parsed.tailwindClasses}` : parsed.tailwindClasses
            }
          }
          if (Object.keys(mergedProps).length > 0) {
            const sanitized = sanitizeFrameProperties(mergedProps, target)
            getStore().updateFrame(frameId, sanitized as Partial<Frame>)
          }
        }
      }
    }

    const result: ToolResult = { success: true, data: { id: newId, pattern: pattern.name } }
    if (!overrides) {
      result.hint = 'Tip: use overrides param to customize content by name without extra update_frame calls. Example: overrides: { "title": { properties: { content: "New title" } } }'
    }
    return result
  },

  save_pattern(params) {
    const { frame_id, name, tags } = params as { frame_id: string; name: string; tags?: string[] }
    const store = getStore()
    const frame = findInTree(store.root, frame_id)
    if (!frame) return { success: false, error: `Frame ${frame_id} not found` }

    const catalogStore = useCatalogStore.getState()
    const cloned = cloneWithNewIds(frame)
    const pattern = catalogStore.savePattern(name, tags || [], cloned)

    // Collect named slots for the hint
    const slots: string[] = []
    const walkSlots = (f: Frame) => {
      slots.push(f.name)
      if (f.type === 'box') f.children.forEach(walkSlots)
    }
    walkSlots(frame)

    return {
      success: true,
      data: { id: pattern.id, name: pattern.name, slots },
      hint: `Reuse with: insert_pattern({ pattern_id: "${pattern.id}", parent_id: "...", overrides: { "${slots[1] || slots[0]}": { properties: { content: "..." } } } }). Override any slot by name.`,
    }
  },

  delete_pattern(params) {
    const { pattern_id, snippet_id } = params as { pattern_id?: string; snippet_id?: string }
    const resolvedId = pattern_id || snippet_id
    if (!resolvedId) return { success: false, error: 'pattern_id is required' }

    const catalogStore = useCatalogStore.getState()
    const pattern = catalogStore.getPattern(resolvedId)
    if (!pattern) return { success: false, error: `Pattern ${resolvedId} not found` }

    catalogStore.deletePattern(resolvedId)
    return { success: true, data: { deleted: resolvedId } }
  },

  // --- Library tools ---

  list_libraries() {
    const catalogStore = useCatalogStore.getState()
    return {
      success: true,
      data: catalogStore.libraryIndex.map(({ id, name, author, version, description, importedAt }) => ({
        id, name, author, version, description, importedAt,
      })),
    }
  },

  list_library_patterns(params) {
    const { library_id } = params as { library_id: string }
    if (!library_id) return { success: false, error: 'library_id is required' }

    const catalogStore = useCatalogStore.getState()
    const meta = catalogStore.libraryIndex.find((m) => m.id === library_id)
    if (!meta) return { success: false, error: `Library ${library_id} not found` }

    const patterns = catalogStore.getLibraryPatterns(library_id)
    return {
      success: true,
      data: patterns.map(({ id, name, tags, meta, createdAt }) => ({ id, name, tags, meta, createdAt })),
    }
  },

  // --- Page tools ---

  list_pages() {
    const store = getStore()
    return {
      success: true,
      data: store.pages.map((p) => ({
        id: p.id,
        name: p.name,
        route: p.route,
        active: p.id === store.activePageId,
      })),
    }
  },

  switch_page(params) {
    const { id } = params as { id: string }
    const store = getStore()
    const page = store.pages.find((p) => p.id === id)
    if (!page) return { success: false, error: `Page ${id} not found` }
    store.setActivePage(id)
    const newRoot = getStore().root
    return { success: true, data: { id, name: page.name, route: page.route, tree: summaryTree(newRoot) } }
  },

  add_page(params) {
    const { name, route } = params as { name?: string; route?: string }
    const store = getStore()
    store.addPage(name, route)
    const updated = getStore()
    const newPage = updated.pages.find((p) => p.id === updated.activePageId)
    return { success: true, data: newPage ? { id: newPage.id, name: newPage.name, route: newPage.route } : undefined }
  },

  remove_page(params) {
    const { id } = params as { id: string }
    const store = getStore()
    if (store.pages.length <= 1) return { success: false, error: 'Cannot remove the last page' }
    const page = store.pages.find((p) => p.id === id)
    if (!page) return { success: false, error: `Page ${id} not found` }
    store.removePage(id)
    return { success: true, data: { removed: id } }
  },
}

// Backward-compat aliases: old snippet names → new pattern names
handlers.list_snippets = handlers.list_patterns
handlers.insert_snippet = handlers.insert_pattern
handlers.save_snippet = handlers.save_pattern
handlers.delete_snippet = handlers.delete_pattern

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
