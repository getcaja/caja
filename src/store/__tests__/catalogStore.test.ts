import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before importing the store (it subscribes at module level)
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
})

import { useCatalogStore, type ComponentData } from '../catalogStore'
import type { Component } from '../../types/component'
import type { Frame, TextElement } from '../../types/frame'

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

function makeComponent(overrides?: Partial<Component>): Component {
  return {
    id: crypto.randomUUID(),
    name: 'Test Component',
    tags: [],
    frame: makeFrame(),
    meta: {},
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function resetStore() {
  useCatalogStore.getState().loadComponents(undefined)
}

// --- Tests ---

describe('catalogStore', () => {
  beforeEach(() => {
    storage.clear()
    resetStore()
  })

  describe('CRUD operations', () => {
    it('saveComponent creates a component and updates state', () => {
      const store = useCatalogStore.getState()
      const comp = store.saveComponent('Card', ['layout'], makeFrame())

      expect(comp.name).toBe('Card')
      expect(comp.tags).toEqual(['layout'])
      expect(comp.id).toBeTruthy()
      expect(comp.createdAt).toBeTruthy()

      const all = store.allComponents()
      expect(all).toHaveLength(1)
      expect(all[0].id).toBe(comp.id)
    })

    it('deleteComponent removes a component', () => {
      const store = useCatalogStore.getState()
      const p = store.saveComponent('Card', [], makeFrame())
      expect(store.allComponents()).toHaveLength(1)

      store.deleteComponent(p.id)
      expect(useCatalogStore.getState().allComponents()).toHaveLength(0)
    })

    it('renameComponent updates the name', () => {
      const store = useCatalogStore.getState()
      const p = store.saveComponent('Old Name', [], makeFrame())
      store.renameComponent(p.id, 'New Name')

      const updated = useCatalogStore.getState().getComponent(p.id)
      expect(updated?.name).toBe('New Name')
    })

    it('updateComponentTags updates tags', () => {
      const store = useCatalogStore.getState()
      const p = store.saveComponent('Card', ['layout'], makeFrame())
      store.updateComponentTags(p.id, ['form', 'input'])

      const updated = useCatalogStore.getState().getComponent(p.id)
      expect(updated?.tags).toEqual(['form', 'input'])
    })

    it('getComponent returns undefined for non-existent id', () => {
      const store = useCatalogStore.getState()
      expect(store.getComponent('nonexistent')).toBeUndefined()
    })
  })

  describe('ordering', () => {
    it('allComponents returns components in order', () => {
      const store = useCatalogStore.getState()
      const a = store.saveComponent('A', [], makeFrame())
      const b = store.saveComponent('B', [], makeFrame())
      const c = store.saveComponent('C', [], makeFrame())

      const all = useCatalogStore.getState().allComponents()
      expect(all.map((p) => p.id)).toEqual([a.id, b.id, c.id])
    })

    it('moveComponent reorders within the list', () => {
      const store = useCatalogStore.getState()
      const a = store.saveComponent('A', [], makeFrame())
      const b = store.saveComponent('B', [], makeFrame())
      const c = store.saveComponent('C', [], makeFrame())

      // Move C before A
      useCatalogStore.getState().moveComponent(c.id, a.id, 'before')
      const order = useCatalogStore.getState().allComponents().map((p) => p.name)
      expect(order).toEqual(['C', 'A', 'B'])
    })

    it('moveComponent after target', () => {
      const store = useCatalogStore.getState()
      const a = store.saveComponent('A', [], makeFrame())
      const b = store.saveComponent('B', [], makeFrame())
      const c = store.saveComponent('C', [], makeFrame())

      useCatalogStore.getState().moveComponent(a.id, c.id, 'after')
      const order = useCatalogStore.getState().allComponents().map((p) => p.name)
      expect(order).toEqual(['B', 'C', 'A'])
    })

    it('moveCategory reorders category groups', () => {
      const store = useCatalogStore.getState()
      store.saveComponent('A1', ['alpha'], makeFrame())
      store.saveComponent('A2', ['alpha'], makeFrame())
      store.saveComponent('B1', ['beta'], makeFrame())

      useCatalogStore.getState().moveCategory('beta', 'alpha', 'before')
      const all = useCatalogStore.getState().allComponents()
      expect(all.map((p) => p.name)).toEqual(['B1', 'A1', 'A2'])
    })
  })

  describe('load and reset', () => {
    it('loadComponents with valid data', () => {
      const p1 = makeComponent({ name: 'Hero' })
      const p2 = makeComponent({ name: 'Footer' })
      const data: ComponentData = {
        items: [p1, p2],
        order: [p2.id, p1.id],
        categories: ['layout'],
      }

      useCatalogStore.getState().loadComponents(data)
      const store = useCatalogStore.getState()
      expect(store.components).toHaveLength(2)
      const all = store.allComponents()
      expect(all[0].name).toBe('Footer')
      expect(all[1].name).toBe('Hero')
    })

    it('loadComponents with undefined resets state', () => {
      const store = useCatalogStore.getState()
      store.saveComponent('Card', [], makeFrame())
      expect(store.allComponents()).toHaveLength(1)

      useCatalogStore.getState().loadComponents(undefined)
      expect(useCatalogStore.getState().allComponents()).toHaveLength(0)
    })

    it('loadComponents handles empty order array', () => {
      const p = makeComponent()
      useCatalogStore.getState().loadComponents({
        items: [p],
        order: [],
        categories: [],
      })
      // Should still return the component (ensureOrder adds missing)
      expect(useCatalogStore.getState().allComponents()).toHaveLength(1)
    })

    it('resetComponents clears state and localStorage', () => {
      const store = useCatalogStore.getState()
      store.saveComponent('Card', [], makeFrame())
      storage.set('caja-components-state', '{"items":[]}')

      useCatalogStore.getState().resetComponents()
      expect(useCatalogStore.getState().allComponents()).toHaveLength(0)
      expect(storage.has('caja-components-state')).toBe(false)
    })
  })

  describe('getComponentData round-trip', () => {
    it('save → getComponentData → loadComponents preserves data', () => {
      const store = useCatalogStore.getState()
      store.saveComponent('Hero', ['layout'], makeFrame())
      store.saveComponent('Card', ['content'], makeFrame())
      store.addEmptyCategory('forms')

      const data = useCatalogStore.getState().getComponentData()
      expect(data.items).toHaveLength(2)
      expect(data.order).toHaveLength(2)
      expect(data.categories).toEqual(['forms'])

      // Reset and reload
      useCatalogStore.getState().loadComponents(undefined)
      expect(useCatalogStore.getState().allComponents()).toHaveLength(0)

      useCatalogStore.getState().loadComponents(data)
      const reloaded = useCatalogStore.getState()
      expect(reloaded.allComponents()).toHaveLength(2)
      expect(reloaded.allComponents()[0].name).toBe('Hero')
      expect(reloaded.allComponents()[1].name).toBe('Card')
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

  describe('importComponents', () => {
    it('imports novel components and skips duplicates', () => {
      const store = useCatalogStore.getState()
      const existing = store.saveComponent('Existing', [], makeFrame())
      const incoming = [
        existing, // duplicate
        makeComponent({ name: 'New' }),
      ]

      useCatalogStore.getState().importComponents(incoming)
      expect(useCatalogStore.getState().allComponents()).toHaveLength(2)
      expect(useCatalogStore.getState().allComponents().map((p) => p.name)).toContain('New')
    })
  })
})
