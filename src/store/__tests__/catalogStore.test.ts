import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before importing the store (it subscribes at module level)
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
})

import { useCatalogStore, type PatternData } from '../catalogStore'
import type { Pattern, LibraryMeta } from '../../types/pattern'
import type { Frame, BoxElement, TextElement } from '../../types/frame'

// --- Helpers ---

function makeFrame(name = 'test'): Frame {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    name,
    content: 'Hello',
    fontSize: { mode: 'token', token: '4', value: 16 },
    fontWeight: { mode: 'token', token: '400', value: 400 },
    lineHeight: { mode: 'token', token: '6', value: 24 },
    letterSpacing: { mode: 'token', token: '0', value: 0 },
    color: { mode: 'token', token: 'gray-900', value: '#111827' },
    textAlign: 'left',
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none',
    whiteSpace: 'normal',
    opacity: { mode: 'token', token: '100', value: 1 },
  } as TextElement
}

function makePattern(overrides?: Partial<Pattern>): Pattern {
  return {
    id: crypto.randomUUID(),
    name: 'Test Pattern',
    tags: [],
    frame: makeFrame(),
    meta: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeLibraryMeta(overrides?: Partial<LibraryMeta>): LibraryMeta {
  return {
    id: crypto.randomUUID(),
    name: 'Test Library',
    importedAt: new Date().toISOString(),
    filePath: 'test-lib.cjl',
    ...overrides,
  }
}

function makePatternData(patterns: Pattern[]): PatternData {
  return {
    items: patterns,
    order: patterns.map((p) => p.id),
    categories: [],
  }
}

function resetStore() {
  const store = useCatalogStore.getState()
  store.loadPatterns(undefined)
  store.setActiveLibraryId(null)
  // Clear libraries
  for (const meta of store.libraryIndex) {
    store.removeLibrary(meta.id)
  }
}

// --- Tests ---

describe('catalogStore', () => {
  beforeEach(() => {
    storage.clear()
    resetStore()
  })

  describe('CRUD operations', () => {
    it('savePattern creates a pattern and updates state', () => {
      const store = useCatalogStore.getState()
      const pattern = store.savePattern('Card', ['layout'], makeFrame())

      expect(pattern.name).toBe('Card')
      expect(pattern.tags).toEqual(['layout'])
      expect(pattern.id).toBeTruthy()
      expect(pattern.createdAt).toBeTruthy()

      const all = store.allPatterns()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(pattern.id)
    })

    it('deletePattern removes a pattern', () => {
      const store = useCatalogStore.getState()
      const p = store.savePattern('Card', [], makeFrame())
      expect(store.allPatterns()).toHaveLength(1)

      store.deletePattern(p.id)
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(0)
    })

    it('renamePattern updates the name', () => {
      const store = useCatalogStore.getState()
      const p = store.savePattern('Old Name', [], makeFrame())
      store.renamePattern(p.id, 'New Name')

      const updated = useCatalogStore.getState().getPattern(p.id)
      expect(updated?.name).toBe('New Name')
    })

    it('updatePatternTags updates tags', () => {
      const store = useCatalogStore.getState()
      const p = store.savePattern('Card', ['layout'], makeFrame())
      store.updatePatternTags(p.id, ['form', 'input'])

      const updated = useCatalogStore.getState().getPattern(p.id)
      expect(updated?.tags).toEqual(['form', 'input'])
    })

    it('getPattern returns undefined for non-existent id', () => {
      const store = useCatalogStore.getState()
      expect(store.getPattern('nonexistent')).toBeUndefined()
    })
  })

  describe('ordering', () => {
    it('allPatterns returns patterns in order', () => {
      const store = useCatalogStore.getState()
      const a = store.savePattern('A', [], makeFrame())
      const b = store.savePattern('B', [], makeFrame())
      const c = store.savePattern('C', [], makeFrame())

      const all = useCatalogStore.getState().allPatterns()
      expect(all.map((p) => p.id)).toEqual([a.id, b.id, c.id])
    })

    it('movePattern reorders within the list', () => {
      const store = useCatalogStore.getState()
      const a = store.savePattern('A', [], makeFrame())
      const b = store.savePattern('B', [], makeFrame())
      const c = store.savePattern('C', [], makeFrame())

      // Move C before A
      useCatalogStore.getState().movePattern(c.id, a.id, 'before')
      const order = useCatalogStore.getState().allPatterns().map((p) => p.name)
      expect(order).toEqual(['C', 'A', 'B'])
    })

    it('movePattern after target', () => {
      const store = useCatalogStore.getState()
      const a = store.savePattern('A', [], makeFrame())
      const b = store.savePattern('B', [], makeFrame())
      const c = store.savePattern('C', [], makeFrame())

      useCatalogStore.getState().movePattern(a.id, c.id, 'after')
      const order = useCatalogStore.getState().allPatterns().map((p) => p.name)
      expect(order).toEqual(['B', 'C', 'A'])
    })

    it('moveCategory reorders category groups', () => {
      const store = useCatalogStore.getState()
      store.savePattern('A1', ['alpha'], makeFrame())
      store.savePattern('A2', ['alpha'], makeFrame())
      store.savePattern('B1', ['beta'], makeFrame())

      useCatalogStore.getState().moveCategory('beta', 'alpha', 'before')
      const all = useCatalogStore.getState().allPatterns()
      expect(all.map((p) => p.name)).toEqual(['B1', 'A1', 'A2'])
    })
  })

  describe('load and reset', () => {
    it('loadPatterns with valid data', () => {
      const p1 = makePattern({ name: 'Hero' })
      const p2 = makePattern({ name: 'Footer' })
      const data: PatternData = {
        items: [p1, p2],
        order: [p2.id, p1.id],
        categories: ['layout'],
      }

      useCatalogStore.getState().loadPatterns(data)
      const store = useCatalogStore.getState()
      expect(store.patterns).toHaveLength(2)
      const all = store.allPatterns()
      expect(all[0].name).toBe('Footer')
      expect(all[1].name).toBe('Hero')
    })

    it('loadPatterns with undefined resets state', () => {
      const store = useCatalogStore.getState()
      store.savePattern('Card', [], makeFrame())
      expect(store.allPatterns()).toHaveLength(1)

      useCatalogStore.getState().loadPatterns(undefined)
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(0)
    })

    it('loadPatterns handles empty order array', () => {
      const p = makePattern()
      useCatalogStore.getState().loadPatterns({
        items: [p],
        order: [],
        categories: [],
      })
      // Should still return the pattern (ensureOrder adds missing)
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(1)
    })

    it('resetPatterns clears state and localStorage', () => {
      const store = useCatalogStore.getState()
      store.savePattern('Card', [], makeFrame())
      storage.set('caja-snippets-state', '{"items":[]}')

      useCatalogStore.getState().resetPatterns()
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(0)
      expect(storage.has('caja-snippets-state')).toBe(false)
    })
  })

  describe('getPatternData round-trip', () => {
    it('save → getPatternData → loadPatterns preserves data', () => {
      const store = useCatalogStore.getState()
      store.savePattern('Hero', ['layout'], makeFrame())
      store.savePattern('Card', ['content'], makeFrame())
      store.addEmptyCategory('forms')

      const data = useCatalogStore.getState().getPatternData()
      expect(data.items).toHaveLength(2)
      expect(data.order).toHaveLength(2)
      expect(data.categories).toEqual(['forms'])

      // Reset and reload
      useCatalogStore.getState().loadPatterns(undefined)
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(0)

      useCatalogStore.getState().loadPatterns(data)
      const reloaded = useCatalogStore.getState()
      expect(reloaded.allPatterns()).toHaveLength(2)
      expect(reloaded.allPatterns()[0].name).toBe('Hero')
      expect(reloaded.allPatterns()[1].name).toBe('Card')
    })
  })

  describe('categories', () => {
    it('addEmptyCategory and removeEmptyCategory', () => {
      const store = useCatalogStore.getState()
      store.addEmptyCategory('forms')
      expect(useCatalogStore.getState().emptyCategories).toEqual(['forms'])

      store.addEmptyCategory('forms') // duplicate, should not add
      expect(useCatalogStore.getState().emptyCategories).toEqual(['forms'])

      useCatalogStore.getState().removeEmptyCategory('forms')
      expect(useCatalogStore.getState().emptyCategories).toEqual([])
    })

    it('removeEmptyCategory no-op for non-existent', () => {
      useCatalogStore.getState().removeEmptyCategory('nonexistent')
      expect(useCatalogStore.getState().emptyCategories).toEqual([])
    })
  })

  describe('library operations', () => {
    it('installLibrary adds library to index and data', () => {
      const meta = makeLibraryMeta({ name: 'UI Kit' })
      const patterns = [makePattern({ name: 'Button' })]
      const data = makePatternData(patterns)

      useCatalogStore.getState().installLibrary(meta, data)
      const store = useCatalogStore.getState()

      expect(store.libraryIndex).toHaveLength(1)
      expect(store.libraryIndex[0].name).toBe('UI Kit')
      expect(store.libraries.get(meta.id)).toBe(data)
    })

    it('installLibrary replaces existing library with same id', () => {
      const meta = makeLibraryMeta({ name: 'UI Kit v1' })
      const data1 = makePatternData([makePattern({ name: 'Button v1' })])
      const data2 = makePatternData([makePattern({ name: 'Button v2' })])

      useCatalogStore.getState().installLibrary(meta, data1)
      useCatalogStore.getState().installLibrary(meta, data2)

      const store = useCatalogStore.getState()
      expect(store.libraryIndex).toHaveLength(1)
      expect(store.libraries.get(meta.id)!.items[0].name).toBe('Button v2')
    })

    it('removeLibrary removes from index and data', () => {
      const meta = makeLibraryMeta()
      useCatalogStore.getState().installLibrary(meta, makePatternData([]))

      useCatalogStore.getState().removeLibrary(meta.id)
      const store = useCatalogStore.getState()
      expect(store.libraryIndex).toHaveLength(0)
      expect(store.libraries.has(meta.id)).toBe(false)
    })

    it('removeLibrary switches to next library if viewing removed library', () => {
      const meta1 = makeLibraryMeta({ name: 'Lib 1' })
      const meta2 = makeLibraryMeta({ name: 'Lib 2' })
      useCatalogStore.getState().installLibrary(meta1, makePatternData([]))
      useCatalogStore.getState().installLibrary(meta2, makePatternData([]))
      useCatalogStore.getState().setActiveLibraryId(meta1.id)
      expect(useCatalogStore.getState().activeLibraryId).toBe(meta1.id)

      useCatalogStore.getState().removeLibrary(meta1.id)
      expect(useCatalogStore.getState().activeLibraryId).toBe(meta2.id)
    })

    it('removeLibrary sets null when no libraries remain', () => {
      const meta = makeLibraryMeta()
      useCatalogStore.getState().installLibrary(meta, makePatternData([]))
      useCatalogStore.getState().setActiveLibraryId(meta.id)

      useCatalogStore.getState().removeLibrary(meta.id)
      expect(useCatalogStore.getState().activeLibraryId).toBeNull()
    })

    it('setActiveLibraryId changes active library', () => {
      useCatalogStore.getState().setActiveLibraryId('lib-123')
      expect(useCatalogStore.getState().activeLibraryId).toBe('lib-123')
    })

    it('setActiveLibraryId accepts null', () => {
      useCatalogStore.getState().setActiveLibraryId('lib-123')
      useCatalogStore.getState().setActiveLibraryId(null)
      expect(useCatalogStore.getState().activeLibraryId).toBeNull()
    })

    it('getLibraryPatterns returns patterns for a specific library', () => {
      const meta = makeLibraryMeta()
      const patterns = [makePattern({ name: 'A' }), makePattern({ name: 'B' })]
      useCatalogStore.getState().installLibrary(meta, makePatternData(patterns))

      const result = useCatalogStore.getState().getLibraryPatterns(meta.id)
      expect(result).toHaveLength(2)
    })

    it('getLibraryPatterns returns empty for missing library', () => {
      expect(useCatalogStore.getState().getLibraryPatterns('nope')).toEqual([])
    })

    it('getLibraryPattern finds a specific pattern in a library', () => {
      const meta = makeLibraryMeta()
      const p = makePattern({ name: 'Target' })
      useCatalogStore.getState().installLibrary(meta, makePatternData([p]))

      const result = useCatalogStore.getState().getLibraryPattern(meta.id, p.id)
      expect(result?.name).toBe('Target')
    })

    it('getLibraryPattern returns undefined for missing pattern', () => {
      const meta = makeLibraryMeta()
      useCatalogStore.getState().installLibrary(meta, makePatternData([]))
      expect(useCatalogStore.getState().getLibraryPattern(meta.id, 'nope')).toBeUndefined()
    })
  })

  describe('isolation — CRUD does not affect libraries', () => {
    it('savePattern does not modify library data', () => {
      const meta = makeLibraryMeta()
      const libData = makePatternData([makePattern({ name: 'Lib Item' })])
      useCatalogStore.getState().installLibrary(meta, libData)

      useCatalogStore.getState().savePattern('Internal', [], makeFrame())

      const lib = useCatalogStore.getState().libraries.get(meta.id)
      expect(lib!.items).toHaveLength(1)
      expect(lib!.items[0].name).toBe('Lib Item')
    })

    it('deletePattern does not affect library data', () => {
      const meta = makeLibraryMeta()
      const libPattern = makePattern({ name: 'Lib' })
      useCatalogStore.getState().installLibrary(meta, makePatternData([libPattern]))

      const internal = useCatalogStore.getState().savePattern('Internal', [], makeFrame())
      useCatalogStore.getState().deletePattern(internal.id)

      expect(useCatalogStore.getState().getLibraryPatterns(meta.id)).toHaveLength(1)
    })

    it('resetPatterns does not affect library data', () => {
      const meta = makeLibraryMeta()
      useCatalogStore.getState().installLibrary(meta, makePatternData([makePattern()]))
      useCatalogStore.getState().savePattern('Card', [], makeFrame())

      useCatalogStore.getState().resetPatterns()
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(0)
      expect(useCatalogStore.getState().getLibraryPatterns(meta.id)).toHaveLength(1)
    })
  })

  describe('importPatterns', () => {
    it('imports novel patterns and skips duplicates', () => {
      const store = useCatalogStore.getState()
      const existing = store.savePattern('Existing', [], makeFrame())
      const incoming = [
        existing, // duplicate
        makePattern({ name: 'New' }),
      ]

      useCatalogStore.getState().importPatterns(incoming)
      expect(useCatalogStore.getState().allPatterns()).toHaveLength(2)
      expect(useCatalogStore.getState().allPatterns().map((p) => p.name)).toContain('New')
    })
  })

  describe('setLibraryIndex / setLibraryData', () => {
    it('setLibraryIndex replaces the index', () => {
      const index = [makeLibraryMeta({ name: 'A' }), makeLibraryMeta({ name: 'B' })]
      useCatalogStore.getState().setLibraryIndex(index)
      expect(useCatalogStore.getState().libraryIndex).toHaveLength(2)
    })

    it('setLibraryData adds or replaces library data', () => {
      const id = 'lib-1'
      const data = makePatternData([makePattern({ name: 'X' })])
      useCatalogStore.getState().setLibraryData(id, data)
      expect(useCatalogStore.getState().libraries.get(id)!.items[0].name).toBe('X')

      const data2 = makePatternData([makePattern({ name: 'Y' })])
      useCatalogStore.getState().setLibraryData(id, data2)
      expect(useCatalogStore.getState().libraries.get(id)!.items[0].name).toBe('Y')
    })
  })
})
