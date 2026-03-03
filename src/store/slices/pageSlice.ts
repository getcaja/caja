import type { StateCreator } from 'zustand'
import type { BoxElement, Page } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import { generatePageId, rootIdForPage, cloneWithNewIds } from '../treeHelpers'
import { createInternalRoot, cloneTree } from '../frameFactories'
import { COMPONENT_PAGE_ID } from './componentSlice'

export interface PageSlice {
  addPage: (name?: string, route?: string) => void
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
  setPageRoute: (id: string, route: string) => void
  setActivePage: (id: string) => void
  duplicatePage: (id: string) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
}

export const createPageSlice: StateCreator<FrameStore, [], [], PageSlice> = (set) => ({
  addPage: (name, route) => set((state) => {
    const id = generatePageId()
    const regularPages = state.pages.filter((p) => !p.isComponentPage)
    const pageName = name || `Page ${regularPages.length + 1}`
    const pageRoute = route || `/${pageName.toLowerCase().replace(/\s+/g, '-')}`
    const newRoot = createInternalRoot(id)
    const page: Page = { id, name: pageName, route: pageRoute, root: newRoot }
    return {
      pages: [...state.pages, page],
      activePageId: id,
      root: newRoot,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
      past: state.past,
      future: state.future,
      dirty: true,
    }
  }),

  removePage: (id) => set((state) => {
    if (id === COMPONENT_PAGE_ID) return {} // never remove components page
    const regularPages = state.pages.filter((p) => !p.isComponentPage)
    if (regularPages.length <= 1) return {} // min 1 regular page
    const idx = regularPages.findIndex((p) => p.id === id)
    const pages = state.pages.filter((p) => p.id !== id)
    const wasActive = state.activePageId === id
    if (wasActive) {
      // Pick the previous sibling, or the next if deleting the first
      const neighbor = idx > 0 ? regularPages[idx - 1] : regularPages[idx + 1]
      const newActive = neighbor || pages.find((p) => !p.isComponentPage) || pages[0]
      // Clean up undo stacks for removed page
      const { [id]: _pastRemoved, ...pastRest } = state.past
      const { [id]: _futureRemoved, ...futureRest } = state.future
      return {
        pages,
        activePageId: newActive.id,
        root: newActive.root,
        selectedId: null,
        selectedIds: new Set(),
        hoveredId: null,
        pageSelected: true,
        past: pastRest,
        future: futureRest,
        dirty: true,
      }
    }
    const { [id]: _pastRemoved, ...pastRest } = state.past
    const { [id]: _futureRemoved, ...futureRest } = state.future
    return { pages, past: pastRest, future: futureRest, dirty: true }
  }),

  renamePage: (id, name) => set((state) => ({
    pages: state.pages.map((p) => p.id === id ? { ...p, name } : p),
    dirty: true,
  })),

  setPageRoute: (id, route) => set((state) => ({
    pages: state.pages.map((p) => p.id === id ? { ...p, route } : p),
    dirty: true,
  })),

  setActivePage: (id) => set((state) => {
    if (state.activePageId === id) return {}
    const page = state.pages.find((p) => p.id === id)
    if (!page) return {}
    return {
      activePageId: id,
      root: page.root,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
    }
  }),

  duplicatePage: (id) => set((state) => {
    const source = state.pages.find((p) => p.id === id)
    if (!source) return {}
    const newId = generatePageId()
    const newRoot = cloneTree(source.root) as BoxElement
    // Assign new IDs to all frames in the cloned tree
    const clonedRoot = cloneWithNewIds(newRoot) as BoxElement
    // Keep the internal root ID
    ;(clonedRoot as BoxElement).id = rootIdForPage(newId)
    const page: Page = { id: newId, name: `${source.name} (Copy)`, route: `${source.route}-copy`, root: clonedRoot }
    const idx = state.pages.findIndex((p) => p.id === id)
    const pages = [...state.pages]
    pages.splice(idx + 1, 0, page)
    return {
      pages,
      activePageId: newId,
      root: clonedRoot,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
      dirty: true,
    }
  }),

  reorderPages: (fromIndex, toIndex) => set((state) => {
    const pages = [...state.pages]
    const [moved] = pages.splice(fromIndex, 1)
    pages.splice(toIndex, 0, moved)
    return { pages, dirty: true }
  }),
})
