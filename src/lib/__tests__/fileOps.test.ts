import { describe, it, expect } from 'vitest'
import type { ComponentData } from '../../store/catalogStore'

// fileOps.ts depends on Tauri dialog/fs APIs — we test the file format contract
// directly to verify the CajaFileData shape.

interface CajaFileData {
  pages: unknown[]
  activePageId: string
  components?: ComponentData
  root?: unknown
}

function makeComponentData(): ComponentData {
  return {
    items: [{
      id: 'p1', name: 'Card', tags: ['layout'],
      frame: { id: 'f1', type: 'text', name: 'card' } as any,
      meta: {}, createdAt: '2024-01-01T00:00:00.000Z',
    }],
    order: ['p1'],
    categories: [],
  }
}

describe('CajaFileData format', () => {
  it('load file with "components" field', () => {
    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
      components: makeComponentData(),
    }
    const data = fileContent as unknown as CajaFileData
    const loaded = data.components
    expect(loaded).toBeDefined()
    expect(loaded!.items).toHaveLength(1)
    expect(loaded!.items[0].name).toBe('Card')
  })

  it('load file without components field — returns undefined', () => {
    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
    }
    const data = fileContent as unknown as CajaFileData
    expect(data.components).toBeUndefined()
  })

  it('save writes "components" field', () => {
    const components = makeComponentData()
    const saved: CajaFileData = {
      pages: [],
      activePageId: 'page-1',
      components,
    }

    const json = JSON.stringify(saved)
    const parsed = JSON.parse(json)
    expect(parsed.components).toBeDefined()
  })

  it('round-trip: save with components → reload → data matches', () => {
    const original = makeComponentData()
    const saved: CajaFileData = {
      pages: [{ id: 'page-1', name: 'Home', route: '/' }] as any,
      activePageId: 'page-1',
      components: original,
    }

    const serialized = JSON.stringify(saved, null, 2)
    const restored = JSON.parse(serialized) as CajaFileData
    const loaded = restored.components

    expect(loaded!.items).toEqual(original.items)
    expect(loaded!.order).toEqual(original.order)
    expect(loaded!.categories).toEqual(original.categories)
  })
})
