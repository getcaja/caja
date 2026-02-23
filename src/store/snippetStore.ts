import { create } from 'zustand'
import type { Snippet } from '../types/snippet'
import type { Frame } from '../types/frame'

const STORAGE_KEY = 'caja-snippets-state'

interface SnippetData {
  items: Snippet[]
  order: string[]
  categories: string[]
}

interface SnippetStore {
  snippets: Snippet[]
  order: string[] // ordered snippet IDs — controls display order
  emptyCategories: string[] // manually created categories with no snippets yet
  highlightId: string | null // selected/highlighted snippet in the panel

  allSnippets: () => Snippet[]
  getSnippet: (id: string) => Snippet | undefined
  saveSnippet: (name: string, tags: string[], frame: Frame) => Snippet
  deleteSnippet: (id: string) => boolean
  renameSnippet: (id: string, name: string) => void
  updateSnippetTags: (id: string, tags: string[]) => void
  moveSnippet: (snippetId: string, targetId: string | null, position: 'before' | 'after' | 'inside') => void
  importSnippets: (snippets: Snippet[]) => void
  addEmptyCategory: (name: string) => void
  removeEmptyCategory: (name: string) => void
  moveCategory: (tag: string, targetTag: string, position: 'before' | 'after') => void
  setHighlightId: (id: string | null) => void
  resetSnippets: () => void
  loadSnippets: (data: SnippetData | undefined) => void
  getSnippetData: () => SnippetData
}

export type { SnippetData }

export const useSnippetStore = create<SnippetStore>((set, get) => {
  function ensureOrder(order: string[], all: Snippet[]): string[] {
    const existing = new Set(order)
    const allIds = all.map((s) => s.id)
    const missing = allIds.filter((id) => !existing.has(id))
    const valid = order.filter((id) => allIds.includes(id))
    return [...valid, ...missing]
  }

  return {
    snippets: [],
    order: [],
    emptyCategories: [],
    highlightId: null,

    allSnippets: () => {
      const { snippets, order } = get()
      const map = new Map(snippets.map((s) => [s.id, s]))
      const ordered: Snippet[] = []
      for (const id of order) {
        const s = map.get(id)
        if (s) ordered.push(s)
      }
      // Append any not in order (safety)
      for (const s of snippets) {
        if (!order.includes(s.id)) ordered.push(s)
      }
      return ordered
    },

    getSnippet: (id) => get().snippets.find((s) => s.id === id),

    saveSnippet: (name, tags, frame) => {
      const snippet: Snippet = {
        id: crypto.randomUUID(),
        name,
        tags,
        frame,
        meta: {},
        createdAt: new Date().toISOString(),
      }
      set((state) => {
        const next = [...state.snippets, snippet]
        const nextOrder = [...state.order, snippet.id]
        return { snippets: next, order: nextOrder, highlightId: snippet.id }
      })
      return snippet
    },

    deleteSnippet: (id) => {
      set((state) => {
        const next = state.snippets.filter((s) => s.id !== id)
        const nextOrder = state.order.filter((oid) => oid !== id)
        return { snippets: next, order: nextOrder }
      })
      return true
    },

    renameSnippet: (id, name) => {
      set((state) => ({
        snippets: state.snippets.map((s) => s.id === id ? { ...s, name } : s),
      }))
    },

    updateSnippetTags: (id, tags) => {
      set((state) => ({
        snippets: state.snippets.map((s) => s.id === id ? { ...s, tags } : s),
      }))
    },

    moveSnippet: (snippetId, targetId, position) => {
      const all = get().allSnippets()
      const snippet = all.find((s) => s.id === snippetId)
      if (!snippet) return

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
      const currentTag = snippet.tags[0] || null
      if (newTag !== currentTag) {
        get().updateSnippetTags(snippetId, newTag ? [newTag] : [])
      }

      // Reorder
      set((state) => {
        const order = state.order.filter((id) => id !== snippetId)
        if (!targetId) {
          order.push(snippetId)
        } else {
          const targetIdx = order.indexOf(targetId)
          if (targetIdx === -1) {
            order.push(snippetId)
          } else if (position === 'before') {
            order.splice(targetIdx, 0, snippetId)
          } else {
            order.splice(targetIdx + 1, 0, snippetId)
          }
        }
        return { order }
      })
    },

    importSnippets: (incoming) => {
      set((state) => {
        const existingIds = new Set(state.snippets.map((s) => s.id))
        const novel = incoming.filter((s) => !existingIds.has(s.id))
        const next = [...state.snippets, ...novel]
        const nextOrder = [...state.order, ...novel.map((s) => s.id)]
        return { snippets: next, order: nextOrder }
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
      const all = get().allSnippets()

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

    resetSnippets: () => {
      localStorage.removeItem(STORAGE_KEY)
      set({ snippets: [], order: [], emptyCategories: [], highlightId: null })
    },

    loadSnippets: (data) => {
      if (!data) {
        set({ snippets: [], order: [], emptyCategories: [], highlightId: null })
        return
      }
      const items = data.items || []
      const order = ensureOrder(data.order || [], items)
      const categories = data.categories || []
      set({ snippets: items, order, emptyCategories: categories, highlightId: null })
    },

    getSnippetData: () => ({
      items: get().snippets,
      order: get().order,
      categories: get().emptyCategories,
    }),
  }
})

// Auto-save snippets to localStorage (parallel to caja-state for root)
let snippetSaveTimeout: ReturnType<typeof setTimeout>
useSnippetStore.subscribe((state) => {
  clearTimeout(snippetSaveTimeout)
  snippetSaveTimeout = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.snippets,
      order: state.order,
      categories: state.emptyCategories,
    }))
  }, 500)
})

// Load snippets from localStorage on startup (called from App.tsx loadFromStorage flow)
export function loadSnippetsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      useSnippetStore.getState().loadSnippets(data)
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}
