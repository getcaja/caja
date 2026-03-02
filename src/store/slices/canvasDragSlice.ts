import type { StateCreator } from 'zustand'
import type { Frame } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import { findParent } from '../treeHelpers'

export interface CanvasDragSlice {
  canvasDragId: string | null
  canvasDragOver: { parentId: string; index: number } | null
  componentDragFrame: Frame | null
  componentDragOrigin: { libraryId?: string; componentId?: string } | null
  mcpConnected: boolean
  mcpBusy: boolean
  mcpHighlightIds: Set<string>

  setCanvasDrag: (id: string | null) => void
  setCanvasDragOver: (over: { parentId: string; index: number } | null) => void
  setComponentDragFrame: (frame: Frame | null, origin?: { libraryId?: string; componentId?: string } | null) => void
  addMcpHighlight: (id: string) => void
}

export const createCanvasDragSlice: StateCreator<FrameStore, [], [], CanvasDragSlice> = (set, get) => ({
  canvasDragId: null,
  canvasDragOver: null,
  componentDragFrame: null,
  componentDragOrigin: null,
  mcpConnected: false,
  mcpBusy: false,
  mcpHighlightIds: new Set<string>(),

  setCanvasDrag: (id) => set({ canvasDragId: id }),
  setCanvasDragOver: (over) => set((state) => {
    const prev = state.canvasDragOver
    if (prev === over) return {}
    if (prev && over && prev.parentId === over.parentId && prev.index === over.index) return {}
    return { canvasDragOver: over }
  }),
  setComponentDragFrame: (frame, origin) => set({ componentDragFrame: frame, componentDragOrigin: origin ?? null }),

  addMcpHighlight: (() => {
    let pending: string[] = []
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    return (id: string) => {
      pending.push(id)
      if (flushTimer) return
      // Microtask batch: accumulate all IDs from a single batch_update, flush once
      flushTimer = setTimeout(() => {
        const ids = pending
        pending = []
        flushTimer = null
        // Dedupe to top-level ancestors: skip any ID whose parent is also in the batch
        // Also skip the root — animating the full-page element is wasteful
        const idSet = new Set(ids)
        const root = get().root
        idSet.delete(root.id)
        const roots: string[] = []
        for (const hid of idSet) {
          let ancestor = findParent(root, hid)
          let hasAncestorInBatch = false
          while (ancestor) {
            if (idSet.has(ancestor.id)) { hasAncestorInBatch = true; break }
            ancestor = findParent(root, ancestor.id)
          }
          if (!hasAncestorInBatch) roots.push(hid)
        }
        const next = new Set(get().mcpHighlightIds)
        for (const hid of roots) next.add(hid)
        set({ mcpHighlightIds: next })
        setTimeout(() => {
          const curr = get().mcpHighlightIds
          const after = new Set(curr)
          for (const hid of roots) after.delete(hid)
          if (after.size !== curr.size) set({ mcpHighlightIds: after })
        }, 800)
      }, 0)
    }
  })(),
})
