// Tool executor — maps MCP tool calls to frameStore actions
// This is the single entry point for both the built-in chat and the external MCP server.

import { useFrameStore, findInTree, cloneWithNewIds, normalizeFrame } from '../store/frameStore'
import { useCatalogStore } from '../store/catalogStore'
import type { Frame, SizeValue, Breakpoint, ResponsiveOverrides } from '../types/frame'
import type { ToolName } from './schema'
import { parseTailwindClasses } from '../utils/parseTailwindClasses'
import { exportLibrary } from '../lib/libraryOps'
import { saveFile } from '../lib/fileOps'
import { downloadAsset, isExternalUrl } from '../lib/assetOps'
import {
  sanitizeDVNum, sanitizeSpacingValues,
  sanitizeFrameProperties, SIZE_CONSTRAINT_LOOKUP,
} from './sanitize'
import { resolveRefs, extractResultId } from './batchRefs'

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
export function compactSnapshot(frame: Frame): Record<string, unknown> {
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


// Lightweight tree representation for LLM context — strips all styling, keeps structure.
export function summaryTree(frame: Frame): Record<string, unknown> {
  const node: Record<string, unknown> = { id: frame.id, type: frame.type, name: frame.name }
  if (frame.type === 'text' || frame.type === 'button') node.content = (frame as { content: string }).content
  if (frame.type === 'box') {
    node.display = frame.display
    node.childCount = frame.children.length
    node.children = frame.children.map(summaryTree)
  }
  // Flag frames with responsive overrides so agents know they exist
  if (frame.responsive) {
    const bps = Object.keys(frame.responsive).filter((k) => frame.responsive?.[k as 'md' | 'xl'])
    if (bps.length > 0) node.responsive = bps
  }
  return node
}

type ToolHandler = (params: ToolParams) => ToolResult | Promise<ToolResult>

const handlers: Record<string, ToolHandler> = {
  async add_frame(params) {
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

    // Build result with optional component hint when parent has repeated same-type children
    const buildAddResult = (child: Frame, parentFrame: Frame): ToolResult => {
      const finalChild = findInTree(getStore().root, child.id)
      const result: ToolResult = { success: true, data: finalChild ? compactSnapshot(finalChild) : { id: child.id } }
      if (parentFrame.type === 'box') {
        const sameTypeCount = parentFrame.children.filter(c => c.type === element_type).length
        if (sameTypeCount >= 3) {
          result.hint = `Parent has ${sameTypeCount} ${element_type} children. Consider save_component + insert_component with overrides for repeated structures.`
        }
      }
      return result
    }

    // Auto-download external image src to local assets (stores persistent localPath)
    const autoDownloadSrc = async (childId: string) => {
      if (element_type !== 'image') return
      const frame = findInTree(getStore().root, childId)
      if (!frame || frame.type !== 'image' || !isExternalUrl(frame.src)) return
      try {
        const { localPath } = await downloadAsset(frame.src, getStore().filePath)
        getStore().updateFrame(childId, { src: localPath })
      } catch { /* expected: keep original URL if download fails */ }
    }

    // MCP frames are fully styled by the caller — never apply auto-style
    const prevStyle = getStore().styleNewFrames
    if (prevStyle) useFrameStore.setState({ styleNewFrames: false })
    try {

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
        const result = buildAddResult(newChild, updatedParent as Frame & { type: 'box' })
        // Fire-and-forget: download image in background
        autoDownloadSrc(newChild.id)
        return result
      }
    } else {
      store.addChild(parent_id, element_type, sanitized as Partial<Frame>)
      // The new child is the last child of the parent after addChild
      const updatedParent = findInTree(getStore().root, parent_id)
      if (updatedParent && updatedParent.type === 'box') {
        const newChild = updatedParent.children[updatedParent.children.length - 1]
        const result = buildAddResult(newChild, updatedParent)
        autoDownloadSrc(newChild.id)
        return result
      }
    }

    return { success: true }

    } finally {
      if (prevStyle) useFrameStore.setState({ styleNewFrames: true })
    }
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

    // Deep-merge responsive: merge per-breakpoint instead of replacing the whole object
    if (sanitized.responsive && typeof sanitized.responsive === 'object' && frame.responsive) {
      const incoming = sanitized.responsive as Record<string, ResponsiveOverrides | undefined>
      const merged: Frame['responsive'] = { ...frame.responsive }
      for (const bp of ['md', 'xl'] as const) {
        if (incoming[bp]) {
          merged[bp] = { ...(merged[bp] ?? {}), ...incoming[bp] }
        }
      }
      sanitized.responsive = merged
    }

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
      hint: 'Use idMap to update cloned children directly: batch_update with update_frame for each idMap value. For repeated structures, consider save_component + insert_component with overrides instead.',
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
    const { domToPng } = await import('modern-screenshot')
    const el = document.getElementById('caja-canvas')
    if (!el) return { success: false, error: 'Canvas element not found' }

    // Temporarily deselect to remove editor outlines
    const store = getStore()
    const prevSelected = store.selectedId
    store.select(null)
    store.hover(null)

    // Wait for React re-render + layout reflow (double rAF ensures paint completion)
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const fullWidth = el.scrollWidth
    const fullHeight = el.scrollHeight

    try {
      const dataUrl = await domToPng(el, {
        width: fullWidth,
        height: fullHeight,
        style: { transform: 'none', transformOrigin: 'top left' },
      })
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      return { success: true, data: { image: base64, mimeType: 'image/png' } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
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
      // Include full results for read-only operations so data isn't lost
      const READ_TOOLS = new Set(['list_components', 'get_tree', 'get_selected'])
      const readResults: Record<number, unknown> = {}
      for (let i = 0; i < operations.length; i++) {
        if (READ_TOOLS.has(operations[i].tool) && results[i]?.data != null) {
          readResults[i] = results[i].data
        }
      }
      if (Object.keys(readResults).length > 0) {
        (response.data as Record<string, unknown>).results = readResults
      }
      // Nudge about components when building many similar structures
      if (results.length >= 8) {
        const addCount = operations.filter((op) => op.tool === 'add_frame').length
        if (addCount >= 6) {
          response.hint = 'Building a complex structure? Save it as a component with save_component, then reuse with insert_component + overrides to avoid rebuilding.'
        }
      }
      return response
    }
    const failedIdx = results.findIndex((r) => !r.success)
    const completedIds = resultIds.slice(0, failedIdx).filter(Boolean)
    return { success: false, error: results[failedIdx]?.error, data: { failedAt: failedIdx, completedCount: failedIdx, completedIds, totalRequested: operations.length } }
  },

  // --- Component tools ---

  list_components(params) {
    const { tag } = params as { tag?: string }
    const catalogStore = useCatalogStore.getState()
    let all = catalogStore.allComponents()
    if (tag) all = all.filter((c) => c.tags.includes(tag))
    return {
      success: true,
      data: all.map(({ id, name, tags, meta, createdAt }) => ({ id, name, tags, meta, createdAt })),
    }
  },

  insert_component(params) {
    const { component_id, parent_id, index, overrides } = params as {
      component_id: string
      parent_id: string
      index?: number
      overrides?: Record<string, { properties?: Record<string, unknown>; classes?: string }>
    }
    if (!component_id) return { success: false, error: 'component_id is required' }

    const catalogStore = useCatalogStore.getState()
    const component = catalogStore.getComponent(component_id)
    if (!component) return { success: false, error: `Component ${component_id} not found` }

    const store = getStore()
    const parent = findInTree(store.root, parent_id)
    if (!parent || parent.type !== 'box') {
      return { success: false, error: `Parent ${parent_id} not found or is not a box` }
    }

    const origin = { libraryId: 'internal', componentId: component.id }
    const normalizedFrame = normalizeFrame(component.frame)
    if (index !== undefined) {
      store.insertFrameAt(parent_id, normalizedFrame, index, origin)
    } else {
      store.insertFrameAt(parent_id, normalizedFrame, parent.children.length, origin)
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

    const result: ToolResult = { success: true, data: { id: newId, component: component.name } }
    if (!overrides) {
      result.hint = 'Tip: use overrides param to customize content by name without extra update_frame calls. Example: overrides: { "title": { properties: { content: "New title" } } }'
    }
    return result
  },

  save_component(params) {
    const { frame_id, name, tags } = params as { frame_id: string; name: string; tags?: string[] }
    const store = getStore()
    const frame = findInTree(store.root, frame_id)
    if (!frame) return { success: false, error: `Frame ${frame_id} not found` }

    // Clone frame as master, add to components page (enables edit mode)
    const master = cloneWithNewIds(frame)
    master.name = name
    store.addComponentMaster(master)

    // Register in catalog with the master's ID (matches component page frame)
    const catalogStore = useCatalogStore.getState()
    catalogStore.registerComponent({
      id: master.id,
      name,
      tags: tags || [],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })

    // Collect named slots for the hint
    const slots: string[] = []
    const walkSlots = (f: Frame) => {
      slots.push(f.name)
      if (f.type === 'box') f.children.forEach(walkSlots)
    }
    walkSlots(frame)

    return {
      success: true,
      data: { id: master.id, name, slots },
      hint: `Reuse with: insert_component({ component_id: "${master.id}", parent_id: "...", overrides: { "${slots[1] || slots[0]}": { properties: { content: "..." } } } }). Override any slot by name.`,
    }
  },

  delete_component(params) {
    const { component_id } = params as { component_id: string }
    if (!component_id) return { success: false, error: 'component_id is required' }

    const catalogStore = useCatalogStore.getState()
    const component = catalogStore.getComponent(component_id)
    if (!component) return { success: false, error: `Component ${component_id} not found` }

    catalogStore.deleteComponent(component_id)
    return { success: true, data: { deleted: component_id } }
  },

  // --- Library tools ---

  async export_library(params) {
    const { name, author, description, version } = params as {
      name: string; author?: string; description?: string; version?: string
    }
    if (!name) return { success: false, error: 'name is required' }

    const catalogStore = useCatalogStore.getState()
    const componentData = catalogStore.getComponentData()

    if (!componentData.items.length) {
      return { success: false, error: 'No internal components to export. Save components first with save_component.' }
    }

    const path = await exportLibrary(componentData, { name, author, description, version })
    if (!path) return { success: false, error: 'Export cancelled' }

    return {
      success: true,
      data: { path, name, componentCount: componentData.items.length },
    }
  },

  // --- File tools ---

  async new_file() {
    const store = getStore()

    // Guard: if there are unsaved changes, show a native dialog in Caja's UI.
    // The user must respond in the app — not in the agent's terminal.
    if (store.dirty) {
      const { askUnsavedChanges } = await import('../lib/unsavedDialog')
      const choice = await askUnsavedChanges(store.projectName || 'Untitled')
      if (choice === 'cancel') {
        return { success: false, error: 'New file cancelled by user' }
      }
      if (choice === 'save') {
        try {
          const componentData = useCatalogStore.getState().getComponentData()
          const path = await saveFile(store.pages, store.activePageId, componentData, store.filePath)
          if (!path) {
            return { success: false, error: 'Save cancelled by user — new file aborted' }
          }
          store.setFilePath(path)
          store.markClean()
          // Update recent files (fire-and-forget)
          import('@tauri-apps/api/core').then(({ invoke }) =>
            invoke('add_recent_file', { path }).catch(() => {})
          )
        } catch (err) {
          return { success: false, error: `Save failed: ${err instanceof Error ? err.message : err}` }
        }
      }
    }

    store.newFile()
    return { success: true, data: { message: 'Project reset to blank state' } }
  },

  // --- Page tools ---

  list_pages() {
    const store = getStore()
    return {
      success: true,
      data: store.pages.filter((p) => !p.isComponentPage).map((p) => ({
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

  edit_component(params) {
    const { component_id } = params as { component_id: string }
    const store = getStore()
    if (store.editingComponentId) {
      return { success: false, error: `Already editing component "${store.editingComponentId}". Call exit_component_edit first.` }
    }
    const comp = useCatalogStore.getState().getComponent(component_id)
    if (!comp) return { success: false, error: `Component "${component_id}" not found` }
    store.enterComponentEditMode(component_id)
    const updated = getStore()
    const master = updated.root.children?.find((c: Frame) => c.id === component_id)
    return {
      success: true,
      data: {
        component_id,
        name: comp.name,
        tree: master ? summaryTree(master) : summaryTree(updated.root),
      },
    }
  },

  exit_component_edit() {
    const store = getStore()
    if (!store.editingComponentId) {
      return { success: false, error: 'Not currently in component edit mode' }
    }
    const exitedId = store.editingComponentId
    const comp = useCatalogStore.getState().getComponent(exitedId)
    store.exitComponentEditMode()
    const updated = getStore()
    const page = updated.pages.find((p) => p.id === updated.activePageId)
    return {
      success: true,
      data: {
        exited_component: exitedId,
        name: comp?.name,
        page: page ? { id: page.id, name: page.name, route: page.route } : null,
      },
    }
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
    const regularPages = store.pages.filter((p) => !p.isComponentPage)
    if (regularPages.length <= 1) return { success: false, error: 'Cannot remove the last page' }
    const page = store.pages.find((p) => p.id === id)
    if (!page) return { success: false, error: `Page ${id} not found` }
    store.removePage(id)
    return { success: true, data: { removed: id } }
  },

  // --- Responsive tools ---

  set_breakpoint(params) {
    const { breakpoint } = params as { breakpoint: Breakpoint }
    const valid: Breakpoint[] = ['base', 'md', 'xl']
    if (!valid.includes(breakpoint)) {
      return { success: false, error: `Invalid breakpoint "${breakpoint}". Must be one of: base, md, xl` }
    }
    const store = getStore()
    // Sync canvas width to match preview presets: xl=Fluid(null), base=1024, md=375
    const widthMap: Record<string, number | null> = { xl: null, base: 1024, md: 375 }
    store.setCanvasWidth(widthMap[breakpoint])
    return {
      success: true,
      data: { breakpoint, canvasWidth: widthMap[breakpoint] },
      hint: breakpoint === 'base'
        ? 'Editing default properties (768–1280px). All update_frame/update_spacing/update_size calls write to the base frame.'
        : `Editing ${breakpoint} overrides (${breakpoint === 'md' ? '≤768px small' : '≥1280px large'}). All update_frame/update_spacing/update_size calls now write to the ${breakpoint} breakpoint. Only changed properties are stored as overrides. Call set_breakpoint({ breakpoint: "base" }) when done.`,
    }
  },

  get_breakpoint() {
    const store = getStore()
    return {
      success: true,
      data: { breakpoint: store.activeBreakpoint, canvasWidth: store.canvasWidth },
    }
  },

  get_responsive_overrides(params) {
    const { id } = params as { id: string }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }
    return {
      success: true,
      data: {
        id: frame.id,
        name: frame.name,
        responsive: frame.responsive ?? null,
      },
    }
  },

  clear_responsive_overrides(params) {
    const { id, breakpoint, keys } = params as { id: string; breakpoint: 'md' | 'xl'; keys?: string[] }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }
    if (breakpoint !== 'md' && breakpoint !== 'xl') {
      return { success: false, error: `Invalid breakpoint "${breakpoint}". Must be "md" or "xl"` }
    }
    if (keys && keys.length > 0) {
      store.removeResponsiveKeys(id, breakpoint, keys)
    } else {
      store.clearResponsiveOverrides(id, breakpoint)
    }
    const updated = findInTree(getStore().root, id)
    return {
      success: true,
      data: {
        id,
        breakpoint,
        cleared: keys || 'all',
        responsive: updated?.responsive ?? null,
      },
    }
  },

  async upload_asset(params) {
    const { url } = params as { url: string }
    if (!url || !isExternalUrl(url)) {
      return { success: false, error: 'url must be an http:// or https:// URL' }
    }
    const filePath = getStore().filePath
    const result = await downloadAsset(url, filePath)
    return {
      success: true,
      data: { localPath: result.localPath },
      hint: 'Use localPath as the src value for image frames. It resolves to a renderable blob URL automatically.',
    }
  },
}

// Tools that visually modify frames — trigger MCP highlight on success
const HIGHLIGHT_TOOLS = new Set([
  'add_frame', 'update_frame', 'update_spacing', 'update_size',
  'move_frame', 'duplicate_frame', 'wrap_frame', 'rename_frame',
  'insert_component',
])

export async function executeTool(name: string, params: ToolParams = {}): Promise<ToolResult> {
  const handler = handlers[name]
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` }
  }
  try {
    const result = await handler(params)
    // Flash the affected element so the user sees the agent's work
    if (result.success && HIGHLIGHT_TOOLS.has(name)) {
      const id = extractResultId(result)
      if (id) useFrameStore.getState().addMcpHighlight(id)
    }
    return result
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export function getToolNames(): string[] {
  return Object.keys(handlers)
}
