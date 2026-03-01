import { create } from 'zustand'
import type { Component, LibraryMeta, ComponentData } from '../types/component'
import type { Frame } from '../types/frame'

const STORAGE_KEY = 'caja-components-state'

export type { ComponentData }

type CatalogSnapshot = { components: Component[]; order: string[]; emptyCategories: string[] }

interface CatalogStore {
  // --- Internal components (per-file, read-write) ---
  components: Component[]
  order: string[] // ordered component IDs — controls display order
  emptyCategories: string[] // manually created categories with no components yet
  highlightId: string | null // anchor for range select
  highlightIds: Set<string>  // all highlighted (multi-select)

  // --- Undo / redo ---
  _past: CatalogSnapshot[]
  _future: CatalogSnapshot[]
  undo: () => void
  redo: () => void

  // --- Library system (app-level, read-only) ---
  libraryIndex: LibraryMeta[]           // lightweight metadata for installed libs
  libraries: Map<string, ComponentData>   // loaded library data (lazy-loaded)
  activeLibraryId: string | null         // null = no library selected; libraryId when viewing a library

  // --- Internal component operations ---
  allComponents: () => Component[]
  getComponent: (id: string) => Component | undefined
  saveComponent: (name: string, tags: string[], frame: Frame) => Component
  registerComponent: (component: Component) => void
  deleteComponent: (id: string) => boolean
  renameComponent: (id: string, name: string) => void
  updateComponentTags: (id: string, tags: string[]) => void
  moveComponent: (componentId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void
  moveComponents: (componentIds: string[], targetId: string | null, position: 'before' | 'after' | 'inside') => void
  importComponents: (components: Component[]) => void
  groupComponents: (componentIds: string[], categoryName: string) => void
  addEmptyCategory: (name: string) => void
  removeEmptyCategory: (name: string) => void
  moveCategory: (tag: string, targetTag: string, position: 'before' | 'after') => void
  setHighlightId: (id: string | null) => void
  highlightMulti: (id: string) => void
  highlightRange: (targetId: string, visibleOrder: string[]) => void
  resetComponents: () => void
  loadComponents: (data: ComponentData | undefined) => void
  getComponentData: () => ComponentData

  // --- Export memory (per-session, no persistence) ---
  lastExport: { path: string; name: string; author: string; description: string; version: string } | null
  setLastExport: (config: { path: string; name: string; author: string; description: string; version: string }) => void

  // --- Library operations ---
  setActiveLibraryId: (id: string | null) => void
  installLibrary: (meta: LibraryMeta, data: ComponentData) => void
  removeLibrary: (id: string) => void
  getLibraryComponents: (libraryId: string) => Component[]
  getLibraryComponent: (libraryId: string, componentId: string) => Component | undefined
  setLibraryIndex: (index: LibraryMeta[]) => void
  setLibraryData: (libraryId: string, data: ComponentData) => void
}

const MAX_CATALOG_HISTORY = 50

export const useCatalogStore = create<CatalogStore>((_set, get) => {
  const set = _set

  function snapshot(): CatalogSnapshot {
    const { components, order, emptyCategories } = get()
    return { components: [...components], order: [...order], emptyCategories: [...emptyCategories] }
  }

  function pushCatalogHistory() {
    const s = get()
    const past = [...s._past.slice(-(MAX_CATALOG_HISTORY - 1)), snapshot()]
    set({ _past: past, _future: [] })
  }

  function ensureOrder(order: string[], all: Component[]): string[] {
    const existing = new Set(order)
    const allIds = all.map((s) => s.id)
    const missing = allIds.filter((id) => !existing.has(id))
    const valid = order.filter((id) => allIds.includes(id))
    return [...valid, ...missing]
  }

  // --- Core implementations ---
  function allComponentsImpl(): Component[] {
    const { components, order } = get()
    const map = new Map(components.map((s) => [s.id, s]))
    const ordered: Component[] = []
    for (const id of order) {
      const s = map.get(id)
      if (s) ordered.push(s)
    }
    for (const s of components) {
      if (!order.includes(s.id)) ordered.push(s)
    }
    return ordered
  }

  function saveComponentImpl(name: string, tags: string[], frame: Frame): Component {
    const component: Component = {
      id: crypto.randomUUID(),
      name,
      tags,
      frame,
      meta: {},
      createdAt: new Date().toISOString(),
    }
    set((state) => {
      const next = [...state.components, component]
      const nextOrder = [...state.order, component.id]
      return { components: next, order: nextOrder, highlightId: component.id, highlightIds: new Set([component.id]) }
    })
    return component
  }

  function registerComponentImpl(component: Component): void {
    set((state) => {
      const existing = state.components.findIndex((c) => c.id === component.id)
      if (existing >= 0) {
        // Update existing entry (e.g. when master is edited and propagated)
        const next = [...state.components]
        next[existing] = component
        return { components: next }
      }
      const next = [...state.components, component]
      const nextOrder = [...state.order, component.id]
      return { components: next, order: nextOrder, highlightId: component.id, highlightIds: new Set([component.id]) }
    })
  }

  function deleteComponentImpl(id: string): boolean {
    set((state) => {
      const next = state.components.filter((s) => s.id !== id)
      const nextOrder = state.order.filter((oid) => oid !== id)
      return { components: next, order: nextOrder }
    })
    return true
  }

  function renameComponentImpl(id: string, name: string): void {
    set((state) => ({
      components: state.components.map((s) => s.id === id ? { ...s, name } : s),
    }))
  }

  function updateComponentTagsImpl(id: string, tags: string[]): void {
    set((state) => ({
      components: state.components.map((s) => s.id === id ? { ...s, tags } : s),
    }))
  }

  function moveComponentImpl(componentId: string, targetId: string | null, position: 'before' | 'after' | 'inside'): void {
    const all = allComponentsImpl()
    const component = all.find((s) => s.id === componentId)
    if (!component) return

    let newTag: string | null = null
    if (position === 'inside' && targetId) {
      const target = all.find((s) => s.id === targetId)
      if (target) newTag = target.tags[0] || null
    } else if (targetId) {
      const target = all.find((s) => s.id === targetId)
      if (target) newTag = target.tags[0] || null
    }

    const currentTag = component.tags[0] || null
    if (newTag !== currentTag) {
      updateComponentTagsImpl(componentId, newTag ? [newTag] : [])
    }

    set((state) => {
      const order = state.order.filter((id) => id !== componentId)
      if (!targetId) {
        order.push(componentId)
      } else {
        const targetIdx = order.indexOf(targetId)
        if (targetIdx === -1) {
          order.push(componentId)
        } else if (position === 'before') {
          order.splice(targetIdx, 0, componentId)
        } else {
          order.splice(targetIdx + 1, 0, componentId)
        }
      }
      return { order }
    })
  }

  function moveComponentsImpl(componentIds: string[], targetId: string | null, position: 'before' | 'after' | 'inside'): void {
    const all = allComponentsImpl()
    const idSet = new Set(componentIds)

    // Determine target tag
    let newTag: string | null = null
    if (targetId) {
      const target = all.find((s) => s.id === targetId)
      if (target) newTag = target.tags[0] || null
    }

    // Update tags for all dragged items
    for (const cid of componentIds) {
      const component = all.find((s) => s.id === cid)
      if (!component) continue
      const currentTag = component.tags[0] || null
      if (newTag !== currentTag) {
        updateComponentTagsImpl(cid, newTag ? [newTag] : [])
      }
    }

    set((state) => {
      // Preserve relative order of dragged items
      const draggedInOrder = state.order.filter((id) => idSet.has(id))
      const order = state.order.filter((id) => !idSet.has(id))
      if (!targetId) {
        order.push(...draggedInOrder)
      } else {
        const targetIdx = order.indexOf(targetId)
        if (targetIdx === -1) {
          order.push(...draggedInOrder)
        } else if (position === 'before') {
          order.splice(targetIdx, 0, ...draggedInOrder)
        } else {
          order.splice(targetIdx + 1, 0, ...draggedInOrder)
        }
      }
      return { order }
    })
  }

  function importComponentsImpl(incoming: Component[]): void {
    set((state) => {
      const existingIds = new Set(state.components.map((s) => s.id))
      const novel = incoming.filter((s) => !existingIds.has(s.id))
      const next = [...state.components, ...novel]
      const nextOrder = [...state.order, ...novel.map((s) => s.id)]
      return { components: next, order: nextOrder }
    })
  }

  function resetComponentsImpl(): void {
    localStorage.removeItem(STORAGE_KEY)
    set({ components: [], order: [], emptyCategories: [], highlightId: null, highlightIds: new Set() })
  }

  function loadComponentsImpl(data: ComponentData | undefined): void {
    if (!data) {
      set({ components: [], order: [], emptyCategories: [], highlightId: null, highlightIds: new Set() })
      return
    }
    const items = data.items || []
    const order = ensureOrder(data.order || [], items)
    const categories = data.categories || []
    set({ components: items, order, emptyCategories: categories, highlightId: null, highlightIds: new Set() })
  }

  function getComponentDataImpl(): ComponentData {
    return {
      items: get().components,
      order: get().order,
      categories: get().emptyCategories,
    }
  }

  function getLibraryComponentsImpl(libraryId: string): Component[] {
    const libData = get().libraries.get(libraryId)
    if (!libData) return []
    return libData.items || []
  }

  function getLibraryComponentImpl(libraryId: string, componentId: string): Component | undefined {
    const libData = get().libraries.get(libraryId)
    if (!libData) return undefined
    return (libData.items || []).find((p) => p.id === componentId)
  }

  return {
    components: [],
    order: [],
    emptyCategories: [],
    highlightId: null,
    highlightIds: new Set(),

    // Library state
    libraryIndex: [],
    libraries: new Map(),
    activeLibraryId: null,

    // Export memory
    lastExport: null,
    setLastExport: (config) => set({ lastExport: config }),

    // Undo / redo
    _past: [],
    _future: [],
    undo: () => {
      const { _past, components, order, emptyCategories } = get()
      if (_past.length === 0) return
      const prev = _past[_past.length - 1]
      const current: CatalogSnapshot = { components: [...components], order: [...order], emptyCategories: [...emptyCategories] }
      set({
        components: prev.components,
        order: prev.order,
        emptyCategories: prev.emptyCategories,
        _past: _past.slice(0, -1),
        _future: [...get()._future, current],
      })
    },
    redo: () => {
      const { _future, components, order, emptyCategories } = get()
      if (_future.length === 0) return
      const next = _future[_future.length - 1]
      const current: CatalogSnapshot = { components: [...components], order: [...order], emptyCategories: [...emptyCategories] }
      set({
        components: next.components,
        order: next.order,
        emptyCategories: next.emptyCategories,
        _future: _future.slice(0, -1),
        _past: [...get()._past, current],
      })
    },

    // New names
    allComponents: allComponentsImpl,
    getComponent: (id) => get().components.find((s) => s.id === id),
    saveComponent: (...args) => { pushCatalogHistory(); return saveComponentImpl(...args) },
    registerComponent: registerComponentImpl,
    deleteComponent: (id) => { pushCatalogHistory(); return deleteComponentImpl(id) },
    renameComponent: (id, name) => { pushCatalogHistory(); renameComponentImpl(id, name) },
    updateComponentTags: (id, tags) => { pushCatalogHistory(); updateComponentTagsImpl(id, tags) },
    moveComponent: (cid, tid, pos) => { pushCatalogHistory(); moveComponentImpl(cid, tid, pos) },
    moveComponents: (ids, tid, pos) => { pushCatalogHistory(); moveComponentsImpl(ids, tid, pos) },
    importComponents: importComponentsImpl,
    resetComponents: resetComponentsImpl,
    loadComponents: loadComponentsImpl,
    getComponentData: getComponentDataImpl,

    groupComponents: (componentIds, categoryName) => {
      pushCatalogHistory()
      set((state) => {
        const idSet = new Set(componentIds)
        const components = state.components.map((s) =>
          idSet.has(s.id) ? { ...s, tags: [categoryName, ...s.tags.slice(1)] } : s,
        )
        const emptyCategories = state.emptyCategories.includes(categoryName)
          ? state.emptyCategories
          : [...state.emptyCategories, categoryName]
        return { components, emptyCategories }
      })
    },

    addEmptyCategory: (name) => {
      pushCatalogHistory()
      set((state) => {
        if (state.emptyCategories.includes(name)) return {}
        return { emptyCategories: [...state.emptyCategories, name] }
      })
    },

    removeEmptyCategory: (name) => {
      pushCatalogHistory()
      set((state) => {
        const next = state.emptyCategories.filter((c) => c !== name)
        if (next.length === state.emptyCategories.length) return {}
        return { emptyCategories: next }
      })
    },

    moveCategory: (tag, targetTag, position) => {
      if (tag === targetTag) return
      pushCatalogHistory()
      const all = allComponentsImpl()

      const dragIds = all.filter((s) => s.tags[0] === tag).map((s) => s.id)
      const targetIds = all.filter((s) => s.tags[0] === targetTag).map((s) => s.id)

      set((state) => {
        const order = state.order.filter((id) => !dragIds.includes(id))
        if (targetIds.length > 0) {
          const anchor = position === 'before'
            ? order.indexOf(targetIds[0])
            : order.indexOf(targetIds[targetIds.length - 1]) + 1
          if (anchor !== -1) {
            order.splice(anchor < 0 ? order.length : anchor, 0, ...dragIds)
          }
        }

        const ec = state.emptyCategories.filter((c) => c !== tag)
        const targetIdx = ec.indexOf(targetTag)
        if (targetIdx !== -1) {
          ec.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, ...(state.emptyCategories.includes(tag) ? [tag] : []))
        } else if (state.emptyCategories.includes(tag)) {
          ec.push(tag)
        }

        return { order, emptyCategories: ec }
      })
    },

    setHighlightId: (id) => set({ highlightId: id, highlightIds: new Set(id ? [id] : []) }),

    highlightMulti: (id) => set((state) => {
      const next = new Set(state.highlightIds)
      if (next.has(id)) {
        next.delete(id)
        const newPrimary = next.size > 0 ? [...next][next.size - 1] : null
        return { highlightIds: next, highlightId: state.highlightId === id ? newPrimary : state.highlightId }
      } else {
        next.add(id)
        return { highlightIds: next, highlightId: id }
      }
    }),

    highlightRange: (targetId, visibleOrder) => set((state) => {
      const anchorId = state.highlightId
      if (!anchorId) return { highlightId: targetId, highlightIds: new Set([targetId]) }
      if (anchorId === targetId) return {}

      const anchorIdx = visibleOrder.indexOf(anchorId)
      const targetIdx = visibleOrder.indexOf(targetId)
      if (anchorIdx < 0 || targetIdx < 0) return {}

      const start = Math.min(anchorIdx, targetIdx)
      const end = Math.max(anchorIdx, targetIdx)
      return { highlightIds: new Set(visibleOrder.slice(start, end + 1)) }
    }),

    // --- Library operations ---

    setActiveLibraryId: (id) => set({ activeLibraryId: id }),

    installLibrary: (meta, data) => {
      set((state) => {
        const newIndex = [...state.libraryIndex.filter((m) => m.id !== meta.id), meta]
        const newLibraries = new Map(state.libraries)
        newLibraries.set(meta.id, data)
        return { libraryIndex: newIndex, libraries: newLibraries }
      })
    },

    removeLibrary: (id) => {
      set((state) => {
        const newIndex = state.libraryIndex.filter((m) => m.id !== id)
        const newLibraries = new Map(state.libraries)
        newLibraries.delete(id)
        let newActiveLibraryId = state.activeLibraryId
        if (state.activeLibraryId === id) {
          newActiveLibraryId = newIndex.length > 0 ? newIndex[0].id : null
        }
        return { libraryIndex: newIndex, libraries: newLibraries, activeLibraryId: newActiveLibraryId }
      })
    },

    getLibraryComponents: getLibraryComponentsImpl,
    getLibraryComponent: getLibraryComponentImpl,

    setLibraryIndex: (index) => set({ libraryIndex: index }),

    setLibraryData: (libraryId, data) => {
      set((state) => {
        const newLibraries = new Map(state.libraries)
        newLibraries.set(libraryId, data)
        return { libraries: newLibraries }
      })
    },
  }
})

// Auto-save components + libraryIndex to localStorage
let componentSaveTimeout: ReturnType<typeof setTimeout>
useCatalogStore.subscribe((state) => {
  clearTimeout(componentSaveTimeout)
  componentSaveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.components,
      order: state.order,
      categories: state.emptyCategories,
      libraryIndex: state.libraryIndex,
    }))
  }, 500)
})

// Load components + libraryIndex from localStorage on startup (called from App.tsx loadFromStorage flow)
export function loadComponentsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      useCatalogStore.getState().loadComponents(data)
      if (Array.isArray(data.libraryIndex) && data.libraryIndex.length > 0) {
        useCatalogStore.getState().setLibraryIndex(data.libraryIndex)
      }
    }
  } catch (err) {
    console.warn('Failed to load components from storage, resetting:', err)
    localStorage.removeItem(STORAGE_KEY)
  }
}

