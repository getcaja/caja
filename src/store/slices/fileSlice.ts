import type { StateCreator } from 'zustand'
import type { BoxElement, Page } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import { resetIdCounters, maxIdInTree, rootIdForPage } from '../treeHelpers'
import { createInternalRoot } from '../frameFactories'
import { migrateToInternalRoot } from '../frameMigration'
import { useCatalogStore } from '../catalogStore'
import { saveViewPrefs } from './uiSlice'
import { COMPONENT_PAGE_ID, syncCatalogFromComponentsPage } from './componentSlice'
import playgroundData from '../../data/playground.caja'

export interface FileSlice {
  filePath: string | null
  projectName: string | null

  newFile: () => void
  loadFromStorage: () => boolean
  loadSampleProject: () => void
  loadFromFile: (root: BoxElement, filePath: string) => void
  loadFromFileMulti: (pages: Page[], activePageId: string, filePath: string) => void
  setFilePath: (path: string | null) => void
  markClean: () => void
}

let _didLoadFromStorage = false
/** @internal — for tests only */
export function _resetLoadGuard() { _didLoadFromStorage = false }

export const createFileSlice: StateCreator<FrameStore, [], [], FileSlice> = (set) => ({
  filePath: null,
  projectName: null,

  newFile: () => {
    const pageId = 'page-1'
    const root = createInternalRoot(pageId)
    const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
    resetIdCounters(1, 2)
    localStorage.removeItem('caja-state')
    localStorage.removeItem('caja-components-state')
    saveViewPrefs({ collapsedIds: [] })
    set({
      pages, activePageId: pageId, root, filePath: null, projectName: null, dirty: false,
      selectedId: root.id, selectedIds: new Set([root.id]), past: {}, future: {},
      collapsedIds: new Set(), hoveredId: null,
      canvasTool: 'pointer' as const, pendingImageSrc: null,
      editingComponentId: null, _beforeEditState: null,
    })
    useCatalogStore.getState().resetComponents()
  },

  loadFromStorage: () => {
    // Guard against React Strict Mode double-invoke
    if (_didLoadFromStorage) return false
    _didLoadFromStorage = true

    try {
      const saved = localStorage.getItem('caja-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.pages && Array.isArray(parsed.pages)) {
          // New multi-page format
          const pages: Page[] = parsed.pages.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            route: p.route as string,
            root: migrateToInternalRoot(p.root as Record<string, unknown>, p.id as string),
            // Detect component page by flag OR by well-known ID (handles old data)
            ...((p.isComponentPage || p.id === COMPONENT_PAGE_ID) ? { isComponentPage: true } : {}),
          }))
          // Never activate the Components page on startup — always start on a regular page
          const savedPageId = (parsed.activePageId as string) || pages[0].id
          const regularPages = pages.filter((p) => !p.isComponentPage)
          const activePage = regularPages.find((p) => p.id === savedPageId) || regularPages[0] || pages[0]
          let maxId = 0
          for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
          const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
          resetIdCounters(maxId + 1, maxPid + 1)
          const projectName = (parsed.projectName as string) || null
          set({ pages, activePageId: activePage.id, root: activePage.root, projectName, selectedId: activePage.root.id, selectedIds: new Set([activePage.root.id]), past: {}, future: {} })
          syncCatalogFromComponentsPage(pages)
        } else if (parsed.root) {
          // Legacy single-root format → wrap in one page
          const pageId = 'page-1'
          const root = migrateToInternalRoot(parsed.root, pageId)
          resetIdCounters(maxIdInTree(root) + 1, 2)
          const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
          set({ pages, activePageId: pageId, root, projectName: null, selectedId: root.id, selectedIds: new Set([root.id]), past: {}, future: {} })
        }
        return true
      }
      return false
    } catch (err) {
      console.error('[loadFromStorage] CATCH:', err)
      localStorage.removeItem('caja-state')
      return false
    }
  },

  loadSampleProject: () => {
    const data = playgroundData as Record<string, unknown>
    const rawPages = data.pages as Array<Record<string, unknown>>
    const pages: Page[] = rawPages.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      route: p.route as string,
      root: migrateToInternalRoot(p.root as Record<string, unknown>, p.id as string),
    }))
    let maxId = 0
    for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
    const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
    resetIdCounters(maxId + 1, maxPid + 1)
    const activePage = pages[0]
    set({ pages, activePageId: activePage.id, root: activePage.root, selectedId: activePage.root.id, selectedIds: new Set([activePage.root.id]), past: {}, future: {}, projectName: 'Playground', dirty: false })
  },

  loadFromFile: (root, filePath) => {
    // This is now called for legacy single-root files. Multi-page files use loadFromFileMulti.
    const pageId = 'page-1'
    root.id = rootIdForPage(pageId)
    resetIdCounters(maxIdInTree(root) + 1, 2)
    const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
    set({ pages, activePageId: pageId, root, filePath, projectName: null, dirty: false, selectedId: root.id, selectedIds: new Set([root.id]), past: {}, future: {} })
  },

  loadFromFileMulti: (pages, activePageId, filePath) => {
    // Ensure each page root has a unique ID
    for (const p of pages) p.root.id = rootIdForPage(p.id)
    let maxId = 0
    for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
    const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
    resetIdCounters(maxId + 1, maxPid + 1)
    // Never activate the Components page on load — always start on a regular page
    const regularPages = pages.filter((p) => !p.isComponentPage)
    const activePage = regularPages.find((p) => p.id === activePageId) || regularPages[0] || pages[0]
    set({ pages, activePageId: activePage.id, root: activePage.root, filePath, projectName: null, dirty: false, selectedId: activePage.root.id, selectedIds: new Set([activePage.root.id]), past: {}, future: {} })
    syncCatalogFromComponentsPage(pages)
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ dirty: false }),
})
