import type { StateCreator } from 'zustand'
import type { Frame, BoxElement, Page } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import {
  findInTree, isRootId, cloneWithNewIds, updateInTree,
  addChildInTree, insertChildInTree, updatePageRoot, updateActiveRoot,
} from '../treeHelpers'
import { createInternalRoot, normalizeFrame, cloneTree } from '../frameFactories'
import { useCatalogStore } from '../catalogStore'

export const COMPONENT_PAGE_ID = '__components__'

// Sync catalogStore from the Components page (call after loading data)
export function syncCatalogFromComponentsPage(pages: Page[]) {
  const compPage = pages.find((p) => p.isComponentPage)
  if (!compPage || compPage.root.type !== 'box') return
  const catalog = useCatalogStore.getState()
  for (const master of compPage.root.children) {
    catalog.registerComponent({
      id: master.id,
      name: master.name || 'Component',
      tags: [],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })
  }
}

// Collect all instances of a component across all pages (except the component page)
function collectInstances(pages: Page[], componentId: string): { pageId: string; frameId: string }[] {
  const results: { pageId: string; frameId: string }[] = []
  function walk(frame: Frame, pageId: string) {
    if (frame._componentId === componentId) {
      results.push({ pageId, frameId: frame.id })
    }
    if (frame.type === 'box') {
      for (const child of frame.children) walk(child, pageId)
    }
  }
  for (const page of pages) {
    if (page.isComponentPage) continue
    walk(page.root, page.id)
  }
  return results
}

// Override-related props to diff when detecting user edits on instances.
const OVERRIDE_KEYS = [
  'content', 'src', 'alt', 'href', 'placeholder', 'disabled', 'checked',
  'inputType', 'inputName', 'inputValue', 'rows', 'tag',
] as const

function collectUserOverrides(
  instance: Frame,
  original: Frame,
  path = '',
): Map<string, Record<string, unknown>> {
  const overrides = new Map<string, Record<string, unknown>>()
  const diff: Record<string, unknown> = {}

  for (const key of OVERRIDE_KEYS) {
    if (key in instance && key in original) {
      const instVal = (instance as unknown as Record<string, unknown>)[key]
      const origVal = (original as unknown as Record<string, unknown>)[key]
      if (instVal !== origVal) diff[key] = instVal
    }
  }

  if ('bg' in instance && 'bg' in original) {
    const iBg = (instance as unknown as Record<string, unknown>).bg
    const oBg = (original as unknown as Record<string, unknown>).bg
    if (JSON.stringify(iBg) !== JSON.stringify(oBg)) diff.bg = iBg
  }
  if ('color' in instance && 'color' in original) {
    const iColor = (instance as unknown as Record<string, unknown>).color
    const oColor = (original as unknown as Record<string, unknown>).color
    if (JSON.stringify(iColor) !== JSON.stringify(oColor)) diff.color = iColor
  }

  if (Object.keys(diff).length > 0) {
    overrides.set(path, diff)
  }

  if (instance.type === 'box' && original.type === 'box') {
    const len = Math.min(instance.children.length, original.children.length)
    for (let i = 0; i < len; i++) {
      const childOverrides = collectUserOverrides(instance.children[i], original.children[i], `${path}/${i}`)
      for (const [k, v] of childOverrides) {
        overrides.set(k, v)
      }
    }
  }

  return overrides
}

function applyUserOverrides(
  frame: Frame,
  overrides: Map<string, Record<string, unknown>>,
  path: string,
) {
  const myOverrides = overrides.get(path)
  if (myOverrides) {
    Object.assign(frame, myOverrides)
  }

  if (frame.type === 'box') {
    for (let i = 0; i < frame.children.length; i++) {
      applyUserOverrides(frame.children[i], overrides, `${path}/${i}`)
    }
  }
}

export interface ComponentSlice {
  editingComponentId: string | null
  _beforeEditState: { pageId: string; tab: 'layers' | 'components' } | null

  enterComponentEditMode: (componentId: string) => void
  exitComponentEditMode: () => void
  getComponentPage: () => Page | undefined
  ensureComponentPage: () => Page
  addComponentMaster: (master: Frame) => void
  createComponent: (frameId: string) => string | null
  insertInstance: (componentId: string, parentId: string, index?: number) => string | null
  detachInstance: (frameId: string) => void
  resetInstance: (frameId: string) => void
  propagateComponent: (componentId: string) => void
}

export const createComponentSlice: StateCreator<FrameStore, [], [], ComponentSlice> = (set, get) => ({
  editingComponentId: null,
  _beforeEditState: null,

  enterComponentEditMode: (componentId) => {
    const state = get()

    // Look for master on the component page
    let compPage = state.pages.find((p) => p.isComponentPage)
    let master = compPage?.root.type === 'box'
      ? compPage.root.children.find((c) => c.id === componentId)
      : null

    // If master not on component page, check catalog and create it there
    if (!master) {
      const catalogComp = useCatalogStore.getState().getComponent(componentId)
      if (!catalogComp) return // component doesn't exist anywhere
      const masterFrame = normalizeFrame(cloneTree(catalogComp.frame))
      masterFrame.id = componentId
      get().addComponentMaster(masterFrame)
      // Re-read state after addComponentMaster
      compPage = get().pages.find((p) => p.isComponentPage)
      master = compPage?.root.type === 'box'
        ? compPage.root.children.find((c) => c.id === componentId)
        : null
      if (!master || !compPage) return
    }

    if (!compPage) return

    set({
      _beforeEditState: { pageId: state.activePageId, tab: state.treePanelTab },
      activePageId: compPage.id,
      root: compPage.root,
      editingComponentId: componentId,
      treePanelTab: 'components',
      selectedId: componentId,
      selectedIds: new Set([componentId]),
    })
  },

  exitComponentEditMode: () => {
    const state = get()
    if (!state.editingComponentId) return
    const restore = state._beforeEditState
    const restorePage = restore ? state.pages.find((p) => p.id === restore.pageId) : null

    if (restorePage) {
      set({
        editingComponentId: null,
        _beforeEditState: null,
        activePageId: restorePage.id,
        root: restorePage.root,
        treePanelTab: restore!.tab,
        selectedId: null,
        selectedIds: new Set(),
        })
    } else {
      // Fallback: just exit edit mode, stay on first regular page
      const regularPage = state.pages.find((p) => !p.isComponentPage) || state.pages[0]
      set({
        editingComponentId: null,
        _beforeEditState: null,
        activePageId: regularPage.id,
        root: regularPage.root,
        treePanelTab: 'layers',
        selectedId: null,
        selectedIds: new Set(),
        })
    }
  },

  getComponentPage: () => {
    return get().pages.find((p) => p.isComponentPage)
  },

  ensureComponentPage: () => {
    const state = get()
    const existing = state.pages.find((p) => p.isComponentPage)
    if (existing) return existing

    const root = createInternalRoot(COMPONENT_PAGE_ID)
    const page: Page = {
      id: COMPONENT_PAGE_ID,
      name: 'Components',
      route: '/__components__',
      root,
      isComponentPage: true,
    }
    set({ pages: [...state.pages, page] })
    return page
  },

  addComponentMaster: (master) => {
    get().ensureComponentPage()
    const compPageRoot = get().pages.find((p) => p.isComponentPage)!.root
    const newCompRoot = addChildInTree(compPageRoot, compPageRoot.id, master) as BoxElement
    const pages = updatePageRoot(get().pages, COMPONENT_PAGE_ID, newCompRoot)
    set({ pages, dirty: true })
  },

  createComponent: (frameId) => {
    const state = get()
    const frame = findInTree(state.root, frameId)
    if (!frame || isRootId(frameId)) return null

    // Ensure components page exists
    get().ensureComponentPage()

    // Clone frame as master (gets new IDs)
    const master = cloneWithNewIds(normalizeFrame(frame))
    const componentId = master.id

    // Add master to components page root
    const compPageRoot = get().pages.find((p) => p.isComponentPage)!.root
    const newCompRoot = addChildInTree(compPageRoot, compPageRoot.id, master) as BoxElement

    // Replace original frame with a minimal instance (just _componentId + layout props)
    const history = pushHistory(state)
    const instance: Frame = {
      ...cloneTree(frame),
      _componentId: componentId,
      _overrides: {},
    }
    const newRoot = updateInTree(state.root, frameId, () => instance) as BoxElement

    const pages = updatePageRoot(
      updatePageRoot(get().pages, COMPONENT_PAGE_ID, newCompRoot),
      state.activePageId, newRoot,
    )

    set({
      root: newRoot,
      pages,
      ...history,
    })

    // Register in catalogStore so it shows in Components panel
    useCatalogStore.getState().registerComponent({
      id: componentId,
      name: master.name || frame.name || 'Component',
      tags: [],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })

    return componentId
  },

  insertInstance: (componentId, parentId, index) => {
    const state = get()

    // Find master in components page
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (!compPage) return null
    const master = findInTree(compPage.root, componentId)
    if (!master) return null

    // Clone master and mark as instance
    const cloned = cloneWithNewIds(normalizeFrame(master))
    cloned._componentId = componentId
    cloned._overrides = {}

    const history = pushHistory(state)
    const parent = findInTree(state.root, parentId)
    if (!parent || parent.type !== 'box') return null

    const insertIdx = index ?? (parent as BoxElement).children.length
    const newRoot = insertChildInTree(state.root, parentId, cloned, insertIdx) as BoxElement

    set({
      ...updateActiveRoot(state, newRoot),
      selectedId: cloned.id,
      selectedIds: new Set([cloned.id]),
      ...history,
    })

    return cloned.id
  },

  detachInstance: (frameId) => set((state) => {
    const frame = findInTree(state.root, frameId)
    if (!frame || !frame._componentId) return {}

    const history = pushHistory(state)
    const newRoot = updateInTree(state.root, frameId, (f) => {
      const detached = { ...f }
      delete detached._componentId
      delete detached._overrides
      return detached as Frame
    }) as BoxElement

    return { ...updateActiveRoot(state, newRoot), ...history }
  }),

  resetInstance: (frameId) => set((state) => {
    const frame = findInTree(state.root, frameId)
    if (!frame || !frame._componentId) return {}

    // Look up master: Components page first, then catalogStore fallback
    let master: Frame | null = null
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (compPage) {
      master = findInTree(compPage.root, frame._componentId)
    }
    if (!master) {
      const catalog = useCatalogStore.getState()
      const comp = catalog.getComponent(frame._componentId)
      if (comp) master = comp.frame
    }
    if (!master) return {} // master deleted

    // Re-clone master tree
    const freshClone = cloneWithNewIds(normalizeFrame(master))

    // Preserve instance's own identity and component link
    freshClone.id = frame.id
    freshClone.name = frame.name
    freshClone._componentId = frame._componentId
    freshClone._overrides = {}

    const history = pushHistory(state)
    const newRoot = updateInTree(state.root, frameId, () => freshClone) as BoxElement

    return { ...updateActiveRoot(state, newRoot), ...history }
  }),

  propagateComponent: (componentId) => {
    // Find new master (just edited on Components page)
    const state = get()
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (!compPage) return

    const newMaster = findInTree(compPage.root, componentId)
    if (!newMaster) return

    // Get original master from catalog (baseline for diffing user overrides)
    const catalogComp = useCatalogStore.getState().getComponent(componentId)
    const originalMaster = catalogComp?.frame ?? null

    // Find all instances across all pages
    const instances = collectInstances(state.pages, componentId)
    if (instances.length === 0) return

    // For each instance, detect user overrides, then apply new master + overrides
    let pages = [...state.pages]
    let currentRoot = state.root

    for (const { pageId, frameId } of instances) {
      const page = pages.find((p) => p.id === pageId)
      if (!page) continue

      const instanceFrame = findInTree(page.root, frameId)
      if (!instanceFrame) continue

      // Detect user overrides by diffing instance vs original master (by structural position)
      const userOverrides = originalMaster
        ? collectUserOverrides(instanceFrame, originalMaster)
        : new Map<string, Record<string, unknown>>()

      // Re-clone new master with new IDs
      const freshClone = cloneWithNewIds(normalizeFrame(newMaster))

      // Preserve instance's own identity and component link
      freshClone.id = instanceFrame.id
      freshClone.name = instanceFrame.name
      freshClone._componentId = componentId
      freshClone._overrides = instanceFrame._overrides || {}

      // Apply user overrides to the fresh clone (by structural position)
      if (userOverrides.size > 0) {
        applyUserOverrides(freshClone, userOverrides, '')
      }

      const newPageRoot = updateInTree(page.root, frameId, () => freshClone) as BoxElement
      pages = updatePageRoot(pages, pageId, newPageRoot)

      if (pageId === state.activePageId) {
        currentRoot = newPageRoot
      }
    }

    // Also update catalog entry with the new master frame
    const catalog = useCatalogStore.getState()
    const comp = catalog.getComponent(componentId)
    if (comp) {
      catalog.registerComponent({ ...comp, frame: cloneTree(newMaster) })
    }

    set({ pages, root: currentRoot, dirty: true })
  },
})

// pushHistory is defined inline to avoid circular deps with coreTreeSlice — same logic
const MAX_HISTORY = 50
type HistoryEntry = { root: BoxElement; selectedId: string | null; selectedIds: string[] }

function pushHistory(state: { root: BoxElement; selectedId: string | null; selectedIds: Set<string>; past: Record<string, HistoryEntry[]>; future: Record<string, HistoryEntry[]>; activePageId: string; _previewSnapshot: BoxElement | null }): { past: Record<string, HistoryEntry[]>; future: Record<string, HistoryEntry[]>; dirty: boolean } {
  if (state._previewSnapshot) return { past: state.past, future: state.future, dirty: true }
  const pageId = state.activePageId
  const pagePast = state.past[pageId] || []
  const entry: HistoryEntry = { root: cloneTree(state.root) as BoxElement, selectedId: state.selectedId, selectedIds: [...state.selectedIds] }
  return {
    past: { ...state.past, [pageId]: [...pagePast.slice(-(MAX_HISTORY - 1)), entry] },
    future: { ...state.future, [pageId]: [] as HistoryEntry[] },
    dirty: true,
  }
}
