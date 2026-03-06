import { create } from 'zustand'
import type { BoxElement } from '../types/frame'

import { createCoreTreeSlice } from './slices/coreTreeSlice'
import type { CoreTreeSlice } from './slices/coreTreeSlice'
import { createSelectionSlice } from './slices/selectionSlice'
import type { SelectionSlice } from './slices/selectionSlice'
import { createUiSlice } from './slices/uiSlice'
import type { UiSlice } from './slices/uiSlice'
import { createPageSlice } from './slices/pageSlice'
import type { PageSlice } from './slices/pageSlice'
import { createFileSlice } from './slices/fileSlice'
import type { FileSlice } from './slices/fileSlice'
import { createComponentSlice } from './slices/componentSlice'
import type { ComponentSlice } from './slices/componentSlice'
import { createCanvasDragSlice } from './slices/canvasDragSlice'
import type { CanvasDragSlice } from './slices/canvasDragSlice'

// Combined store type — intersection of all slices
export type FrameStore =
  CoreTreeSlice &
  SelectionSlice &
  UiSlice &
  PageSlice &
  FileSlice &
  ComponentSlice &
  CanvasDragSlice

export const useFrameStore = create<FrameStore>()((...a) => ({
  ...createCoreTreeSlice(...a),
  ...createSelectionSlice(...a),
  ...createUiSlice(...a),
  ...createPageSlice(...a),
  ...createFileSlice(...a),
  ...createComponentSlice(...a),
  ...createCanvasDragSlice(...a),
}))

// --- Subscribers ---

// Auto-select root when selection is empty (keeps tree + canvas + properties in sync)
useFrameStore.subscribe((state, prev) => {
  if (
    state.selectedId === null &&
    prev.selectedId !== null &&
    !state.previewMode &&
    !state.pageSelected
  ) {
    useFrameStore.setState({
      selectedId: state.root.id,
      selectedIds: new Set([state.root.id]),
    })
  }
})

// Auto-save
let saveTimeout: ReturnType<typeof setTimeout>
useFrameStore.subscribe((state) => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('caja-state', JSON.stringify({ pages: state.pages, activePageId: state.activePageId, projectName: state.projectName, filePath: state.filePath }))
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err)
    }
  }, 500)
})

// Auto-propagate: when editing masters on the Components page, sync all instances
let propagateTimer: ReturnType<typeof setTimeout> | null = null
let lastCompPageRoot: BoxElement | null = null
useFrameStore.subscribe((state) => {
  const compPage = state.pages.find((p) => p.isComponentPage)
  if (!compPage) { lastCompPageRoot = null; return }

  // Only propagate when the Components page root actually changed
  if (compPage.root === lastCompPageRoot) return
  const prevRoot = lastCompPageRoot
  lastCompPageRoot = compPage.root

  // Skip the first time (initialization)
  if (!prevRoot) return

  // Debounce propagation to avoid redundant work during rapid edits
  if (propagateTimer) clearTimeout(propagateTimer)
  propagateTimer = setTimeout(() => {
    propagateTimer = null
    const s = useFrameStore.getState()
    const cp = s.pages.find((p) => p.isComponentPage)
    if (!cp || cp.root.type !== 'box') return
    for (const master of cp.root.children) {
      s.propagateComponent(master.id)
    }
  }, 0)
})

// --- Re-exports for backward compatibility ---

export {
  createBox, createText, createImage, createButton, createInput,
  createTextarea, createSelect, createLink, normalizeFrame,
} from './frameFactories'
export { migrateToInternalRoot } from './frameMigration'
export { generateId, isRootId, findInTree, findParent, findTopLevelAncestor, cloneWithNewIds } from './treeHelpers'
export { COMPONENT_PAGE_ID } from './slices/componentSlice'
