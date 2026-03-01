import { create } from 'zustand'
import type { Component, LibraryMeta, ComponentData } from '../types/component'
import type { Frame } from '../types/frame'

const STORAGE_KEY = 'caja-snippets-state' // keep legacy key for backward compat

/** @deprecated Use ComponentData */
export type PatternData = ComponentData
export type { ComponentData }

interface CatalogStore {
  // --- Internal components (per-file, read-write) ---
  components: Component[]
  /** @deprecated Use components */
  patterns: Component[]
  order: string[] // ordered component IDs — controls display order
  emptyCategories: string[] // manually created categories with no components yet
  highlightId: string | null // selected/highlighted component in the panel

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
  importComponents: (components: Component[]) => void
  addEmptyCategory: (name: string) => void
  removeEmptyCategory: (name: string) => void
  moveCategory: (tag: string, targetTag: string, position: 'before' | 'after') => void
  setHighlightId: (id: string | null) => void
  resetComponents: () => void
  loadComponents: (data: ComponentData | undefined) => void
  getComponentData: () => ComponentData

  // Backward-compatible aliases
  /** @deprecated Use allComponents */
  allPatterns: () => Component[]
  /** @deprecated Use getComponent */
  getPattern: (id: string) => Component | undefined
  /** @deprecated Use saveComponent */
  savePattern: (name: string, tags: string[], frame: Frame) => Component
  /** @deprecated Use deleteComponent */
  deletePattern: (id: string) => boolean
  /** @deprecated Use renameComponent */
  renamePattern: (id: string, name: string) => void
  /** @deprecated Use updateComponentTags */
  updatePatternTags: (id: string, tags: string[]) => void
  /** @deprecated Use moveComponent */
  movePattern: (componentId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void
  /** @deprecated Use importComponents */
  importPatterns: (components: Component[]) => void
  /** @deprecated Use resetComponents */
  resetPatterns: () => void
  /** @deprecated Use loadComponents */
  loadPatterns: (data: ComponentData | undefined) => void
  /** @deprecated Use getComponentData */
  getPatternData: () => ComponentData

  // --- Export memory (per-session, no persistence) ---
  lastExport: { path: string; name: string; author: string; description: string; version: string } | null
  setLastExport: (config: { path: string; name: string; author: string; description: string; version: string }) => void

  // --- Library operations ---
  setActiveLibraryId: (id: string | null) => void
  installLibrary: (meta: LibraryMeta, data: ComponentData) => void
  removeLibrary: (id: string) => void
  getLibraryComponents: (libraryId: string) => Component[]
  getLibraryComponent: (libraryId: string, componentId: string) => Component | undefined
  /** @deprecated Use getLibraryComponents */
  getLibraryPatterns: (libraryId: string) => Component[]
  /** @deprecated Use getLibraryComponent */
  getLibraryPattern: (libraryId: string, componentId: string) => Component | undefined
  setLibraryIndex: (index: LibraryMeta[]) => void
  setLibraryData: (libraryId: string, data: ComponentData) => void
}

export const useCatalogStore = create<CatalogStore>((_set, get) => {
  // Auto-sync: whenever `components` is written, mirror it to `patterns` (backward-compat alias)
  const set: typeof _set = (partial, replace) => {
    _set((state) => {
      const next = typeof partial === 'function' ? partial(state) : partial
      if (next && typeof next === 'object' && 'components' in next) {
        return { ...next, patterns: (next as { components: Component[] }).components }
      }
      return next
    }, replace)
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
      return { components: next, order: nextOrder, highlightId: component.id }
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
      return { components: next, order: nextOrder, highlightId: component.id }
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
    set({ components: [], order: [], emptyCategories: [], highlightId: null })
  }

  function loadComponentsImpl(data: ComponentData | undefined): void {
    if (!data) {
      set({ components: [], order: [], emptyCategories: [], highlightId: null })
      return
    }
    const items = data.items || []
    const order = ensureOrder(data.order || [], items)
    const categories = data.categories || []
    set({ components: items, order, emptyCategories: categories, highlightId: null })
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
    patterns: [],
    order: [],
    emptyCategories: [],
    highlightId: null,

    // Library state
    libraryIndex: [],
    libraries: new Map(),
    activeLibraryId: null,

    // Export memory
    lastExport: null,
    setLastExport: (config) => set({ lastExport: config }),

    // New names
    allComponents: allComponentsImpl,
    getComponent: (id) => get().components.find((s) => s.id === id),
    saveComponent: saveComponentImpl,
    registerComponent: registerComponentImpl,
    deleteComponent: deleteComponentImpl,
    renameComponent: renameComponentImpl,
    updateComponentTags: updateComponentTagsImpl,
    moveComponent: moveComponentImpl,
    importComponents: importComponentsImpl,
    resetComponents: resetComponentsImpl,
    loadComponents: loadComponentsImpl,
    getComponentData: getComponentDataImpl,

    // Backward-compatible aliases
    allPatterns: allComponentsImpl,
    getPattern: (id) => get().components.find((s) => s.id === id),
    savePattern: saveComponentImpl,
    deletePattern: deleteComponentImpl,
    renamePattern: renameComponentImpl,
    updatePatternTags: updateComponentTagsImpl,
    movePattern: moveComponentImpl,
    importPatterns: importComponentsImpl,
    resetPatterns: resetComponentsImpl,
    loadPatterns: loadComponentsImpl,
    getPatternData: getComponentDataImpl,

    addEmptyCategory: (name) => {
      set((state) => {
        if (state.emptyCategories.includes(name)) return {}
        return { emptyCategories: [...state.emptyCategories, name] }
      })
    },

    removeEmptyCategory: (name) => {
      set((state) => {
        const next = state.emptyCategories.filter((c) => c !== name)
        if (next.length === state.emptyCategories.length) return {}
        return { emptyCategories: next }
      })
    },

    moveCategory: (tag, targetTag, position) => {
      if (tag === targetTag) return
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

    setHighlightId: (id) => set({ highlightId: id }),

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
    // Backward-compatible aliases
    getLibraryPatterns: getLibraryComponentsImpl,
    getLibraryPattern: getLibraryComponentImpl,

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

/** @deprecated Use loadComponentsFromStorage */
export const loadPatternsFromStorage = loadComponentsFromStorage
