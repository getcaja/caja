import { create } from 'zustand'
import type { Pattern, LibraryMeta } from '../types/pattern'
import type { Frame } from '../types/frame'

const STORAGE_KEY = 'caja-snippets-state' // keep legacy key for backward compat

export interface PatternData {
  items: Pattern[]
  order: string[]
  categories: string[]
}

interface CatalogStore {
  // --- Internal patterns (per-file, read-write) ---
  patterns: Pattern[]
  order: string[] // ordered pattern IDs — controls display order
  emptyCategories: string[] // manually created categories with no patterns yet
  highlightId: string | null // selected/highlighted pattern in the panel

  // --- Library system (app-level, read-only) ---
  libraryIndex: LibraryMeta[]           // lightweight metadata for installed libs
  libraries: Map<string, PatternData>   // loaded library data (lazy-loaded)
  activeLibraryId: string | null         // null = no library selected; libraryId when viewing a library

  // --- Internal pattern operations ---
  allPatterns: () => Pattern[]
  getPattern: (id: string) => Pattern | undefined
  savePattern: (name: string, tags: string[], frame: Frame) => Pattern
  deletePattern: (id: string) => boolean
  renamePattern: (id: string, name: string) => void
  updatePatternTags: (id: string, tags: string[]) => void
  movePattern: (patternId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void
  importPatterns: (patterns: Pattern[]) => void
  addEmptyCategory: (name: string) => void
  removeEmptyCategory: (name: string) => void
  moveCategory: (tag: string, targetTag: string, position: 'before' | 'after') => void
  setHighlightId: (id: string | null) => void
  resetPatterns: () => void
  loadPatterns: (data: PatternData | undefined) => void
  getPatternData: () => PatternData

  // --- Export memory (per-session, no persistence) ---
  lastExport: { path: string; name: string; author: string; description: string; version: string } | null
  setLastExport: (config: { path: string; name: string; author: string; description: string; version: string }) => void

  // --- Library operations ---
  setActiveLibraryId: (id: string | null) => void
  installLibrary: (meta: LibraryMeta, data: PatternData) => void
  removeLibrary: (id: string) => void
  getLibraryPatterns: (libraryId: string) => Pattern[]
  getLibraryPattern: (libraryId: string, patternId: string) => Pattern | undefined
  setLibraryIndex: (index: LibraryMeta[]) => void
  setLibraryData: (libraryId: string, data: PatternData) => void
}

export const useCatalogStore = create<CatalogStore>((set, get) => {
  function ensureOrder(order: string[], all: Pattern[]): string[] {
    const existing = new Set(order)
    const allIds = all.map((s) => s.id)
    const missing = allIds.filter((id) => !existing.has(id))
    const valid = order.filter((id) => allIds.includes(id))
    return [...valid, ...missing]
  }

  return {
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

    allPatterns: () => {
      const { patterns, order } = get()
      const map = new Map(patterns.map((s) => [s.id, s]))
      const ordered: Pattern[] = []
      for (const id of order) {
        const s = map.get(id)
        if (s) ordered.push(s)
      }
      // Append any not in order (safety)
      for (const s of patterns) {
        if (!order.includes(s.id)) ordered.push(s)
      }
      return ordered
    },

    getPattern: (id) => get().patterns.find((s) => s.id === id),

    savePattern: (name, tags, frame) => {
      const pattern: Pattern = {
        id: crypto.randomUUID(),
        name,
        tags,
        frame,
        meta: {},
        createdAt: new Date().toISOString(),
      }
      set((state) => {
        const next = [...state.patterns, pattern]
        const nextOrder = [...state.order, pattern.id]
        return { patterns: next, order: nextOrder, highlightId: pattern.id }
      })
      return pattern
    },

    deletePattern: (id) => {
      set((state) => {
        const next = state.patterns.filter((s) => s.id !== id)
        const nextOrder = state.order.filter((oid) => oid !== id)
        return { patterns: next, order: nextOrder }
      })
      return true
    },

    renamePattern: (id, name) => {
      set((state) => ({
        patterns: state.patterns.map((s) => s.id === id ? { ...s, name } : s),
      }))
    },

    updatePatternTags: (id, tags) => {
      set((state) => ({
        patterns: state.patterns.map((s) => s.id === id ? { ...s, tags } : s),
      }))
    },

    movePattern: (patternId, targetId, position) => {
      const all = get().allPatterns()
      const pattern = all.find((s) => s.id === patternId)
      if (!pattern) return

      // Determine new tag
      let newTag: string | null = null
      if (position === 'inside' && targetId) {
        const target = all.find((s) => s.id === targetId)
        if (target) newTag = target.tags[0] || null
      } else if (targetId) {
        const target = all.find((s) => s.id === targetId)
        if (target) newTag = target.tags[0] || null
      }

      // Update tag if changed
      const currentTag = pattern.tags[0] || null
      if (newTag !== currentTag) {
        get().updatePatternTags(patternId, newTag ? [newTag] : [])
      }

      // Reorder
      set((state) => {
        const order = state.order.filter((id) => id !== patternId)
        if (!targetId) {
          order.push(patternId)
        } else {
          const targetIdx = order.indexOf(targetId)
          if (targetIdx === -1) {
            order.push(patternId)
          } else if (position === 'before') {
            order.splice(targetIdx, 0, patternId)
          } else {
            order.splice(targetIdx + 1, 0, patternId)
          }
        }
        return { order }
      })
    },

    importPatterns: (incoming) => {
      set((state) => {
        const existingIds = new Set(state.patterns.map((s) => s.id))
        const novel = incoming.filter((s) => !existingIds.has(s.id))
        const next = [...state.patterns, ...novel]
        const nextOrder = [...state.order, ...novel.map((s) => s.id)]
        return { patterns: next, order: nextOrder }
      })
    },

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
      const all = get().allPatterns()

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

    resetPatterns: () => {
      localStorage.removeItem(STORAGE_KEY)
      set({ patterns: [], order: [], emptyCategories: [], highlightId: null })
    },

    loadPatterns: (data) => {
      if (!data) {
        set({ patterns: [], order: [], emptyCategories: [], highlightId: null })
        return
      }
      const items = data.items || []
      const order = ensureOrder(data.order || [], items)
      const categories = data.categories || []
      set({ patterns: items, order, emptyCategories: categories, highlightId: null })
    },

    getPatternData: () => ({
      items: get().patterns,
      order: get().order,
      categories: get().emptyCategories,
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
        // If we were viewing the removed library, switch to next available or null
        let newActiveLibraryId = state.activeLibraryId
        if (state.activeLibraryId === id) {
          newActiveLibraryId = newIndex.length > 0 ? newIndex[0].id : null
        }
        return { libraryIndex: newIndex, libraries: newLibraries, activeLibraryId: newActiveLibraryId }
      })
    },

    getLibraryPatterns: (libraryId) => {
      const libData = get().libraries.get(libraryId)
      if (!libData) return []
      return libData.items || []
    },

    getLibraryPattern: (libraryId, patternId) => {
      const libData = get().libraries.get(libraryId)
      if (!libData) return undefined
      return (libData.items || []).find((p) => p.id === patternId)
    },

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

// Auto-save patterns + libraryIndex to localStorage
let patternSaveTimeout: ReturnType<typeof setTimeout>
useCatalogStore.subscribe((state) => {
  clearTimeout(patternSaveTimeout)
  patternSaveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.patterns,
      order: state.order,
      categories: state.emptyCategories,
      libraryIndex: state.libraryIndex,
    }))
  }, 500)
})

// Load patterns + libraryIndex from localStorage on startup (called from App.tsx loadFromStorage flow)
export function loadPatternsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      useCatalogStore.getState().loadPatterns(data)
      // Restore libraryIndex cache — gives instant display while Tauri disk load happens async
      if (Array.isArray(data.libraryIndex) && data.libraryIndex.length > 0) {
        useCatalogStore.getState().setLibraryIndex(data.libraryIndex)
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}
