// Tool executor — maps MCP tool calls to frameStore actions
// This is the single entry point for both the built-in chat and the external MCP server.

import { useFrameStore } from '../store/frameStore'
import type { Frame, Spacing, SizeValue } from '../types/frame'
import type { ToolName } from './schema'

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

// Strip children from a frame for compact responses
function frameSnapshot(frame: Frame): Record<string, unknown> {
  if (frame.type === 'box') {
    const { children, ...rest } = frame
    return { ...rest, childCount: children.length, childIds: children.map((c) => c.id) }
  }
  return { ...frame }
}

type ToolHandler = (params: ToolParams) => ToolResult | Promise<ToolResult>

const handlers: Record<string, ToolHandler> = {
  add_frame(params) {
    const { parent_id, element_type, properties } = params as {
      parent_id: string
      element_type: 'box' | 'text' | 'image' | 'button' | 'input'
      properties?: Record<string, unknown>
    }

    const store = getStore()
    const parent = findInTree(store.root, parent_id)
    if (!parent || parent.type !== 'box') {
      return { success: false, error: `Parent ${parent_id} not found or is not a box` }
    }

    // Pass all properties (including optional id) as overrides to addChild
    store.addChild(parent_id, element_type, properties as Partial<Frame>)

    // The new child is the last child of the parent after addChild
    const updatedParent = findInTree(getStore().root, parent_id)
    if (updatedParent && updatedParent.type === 'box') {
      const newChild = updatedParent.children[updatedParent.children.length - 1]
      const finalChild = findInTree(getStore().root, newChild.id)
      return { success: true, data: finalChild ? frameSnapshot(finalChild) : { id: newChild.id } }
    }

    return { success: true }
  },

  update_frame(params) {
    const { id, properties } = params as { id: string; properties: Record<string, unknown> }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    store.updateFrame(id, properties as Partial<Frame>)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? frameSnapshot(updated) : undefined }
  },

  update_spacing(params) {
    const { id, field, values } = params as {
      id: string
      field: 'padding' | 'margin'
      values: Partial<Spacing>
    }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    store.updateSpacing(id, field, values)
    const updated = findInTree(getStore().root, id)
    return { success: true, data: updated ? { [field]: updated[field] } : undefined }
  },

  update_size(params) {
    const { id, dimension, size } = params as {
      id: string
      dimension: 'width' | 'height'
      size: Partial<SizeValue>
    }
    const store = getStore()
    const frame = findInTree(store.root, id)
    if (!frame) return { success: false, error: `Frame ${id} not found` }

    store.updateSize(id, dimension, size)
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
    return { success: true, data: updated ? frameSnapshot(updated) : undefined }
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

  get_tree() {
    const root = getStore().root
    return { success: true, data: root }
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

    // Wait for React to re-render without selection outlines
    await new Promise((r) => setTimeout(r, 50))

    try {
      const dataUrl = await toPng(el, { cacheBust: true })
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
      return { success: true, data: { image: base64, mimeType: 'image/png' } }
    } finally {
      // Restore selection
      if (prevSelected) store.select(prevSelected)
    }
  },

  async batch_update(params) {
    const { operations } = params as {
      operations: Array<{ tool: string; params: Record<string, unknown> }>
    }

    const results: ToolResult[] = []
    for (const op of operations) {
      if (op.tool === 'batch_update') {
        results.push({ success: false, error: 'Cannot nest batch_update' })
        continue
      }
      const result = await executeTool(op.tool as ToolName, op.params)
      results.push(result)
      if (!result.success) break // stop on first error
    }

    return { success: results.every((r) => r.success), data: { results } }
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
