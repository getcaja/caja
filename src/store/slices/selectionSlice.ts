import type { StateCreator } from 'zustand'
import type { Frame, BoxElement } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import { findInTree, findParent } from '../treeHelpers'

export interface SelectionSlice {
  selectedId: string | null
  selectedIds: Set<string>
  pageSelected: boolean
  clipboard: Frame[]

  select: (id: string | null) => void
  selectMulti: (id: string) => void
  selectRange: (targetId: string) => void
  selectAllSiblings: () => void
  getSelected: () => Frame | null
  getParentDirection: (id: string) => BoxElement['direction']
  getParentDisplay: (id: string) => BoxElement['display'] | null
  getRootId: () => string
}

export const createSelectionSlice: StateCreator<FrameStore, [], [], SelectionSlice> = (set, get) => ({
  selectedId: null, // Will be overridden by coreTreeSlice's initial state
  selectedIds: new Set<string>(),
  pageSelected: false,
  clipboard: [] as Frame[],

  select: (id) => set({ selectedId: id, selectedIds: new Set(id ? [id] : []), pageSelected: false, showMarginOverlay: false, showPaddingOverlay: false, showGapOverlay: false }),

  selectMulti: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) {
      next.delete(id)
      const newPrimary = next.size > 0 ? [...next][next.size - 1] : null
      return { selectedIds: next, selectedId: state.selectedId === id ? newPrimary : state.selectedId }
    } else {
      next.add(id)
      return { selectedIds: next, selectedId: id }
    }
  }),

  selectRange: (targetId) => set((state) => {
    const anchorId = state.selectedId
    if (!anchorId) return { selectedId: targetId, selectedIds: new Set([targetId]) }
    if (anchorId === targetId) return {}

    // Flatten visible tree order (DFS, skip hidden, respect collapsed)
    const order: string[] = []
    function walk(frame: Frame) {
      if (frame.hidden) return
      order.push(frame.id)
      if (frame.type === 'box' && !state.collapsedIds.has(frame.id)) {
        for (const child of frame.children) walk(child)
      }
    }
    walk(state.root)

    const anchorIdx = order.indexOf(anchorId)
    const targetIdx = order.indexOf(targetId)
    if (anchorIdx < 0 || targetIdx < 0) return {}

    const start = Math.min(anchorIdx, targetIdx)
    const end = Math.max(anchorIdx, targetIdx)
    const ids = new Set(order.slice(start, end + 1))

    // Keep selectedId as anchor so subsequent shift+clicks extend from the same point
    return { selectedIds: ids }
  }),

  selectAllSiblings: () => set((state) => {
    const id = state.selectedId
    if (!id) return {}
    const parent = findParent(state.root, id)
    if (!parent) return {}
    const ids = new Set(parent.children.map((c) => c.id))
    return { selectedIds: ids, selectedId: id }
  }),

  getSelected: () => {
    const { root, selectedId } = get()
    if (!selectedId) return null
    return findInTree(root, selectedId)
  },

  getParentDirection: (id) => {
    const parent = findParent(get().root, id)
    return parent?.direction ?? 'column'
  },

  getParentDisplay: (id) => {
    const parent = findParent(get().root, id)
    return parent?.display ?? null
  },

  getRootId: () => get().root.id,
})
