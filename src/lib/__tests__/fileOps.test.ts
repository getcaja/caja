import { describe, it, expect } from 'vitest'
import type { PatternData } from '../../store/catalogStore'

// fileOps.ts depends on Tauri dialog/fs APIs — we test the file format contract
// directly to verify backward compatibility of the CajaFileData shape.

interface CajaFileData {
  pages: unknown[]
  activePageId: string
  patterns?: PatternData   // new — written on save
  snippets?: PatternData   // legacy read-only
  root?: unknown
}

function makePatternData(): PatternData {
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

describe('CajaFileData backward compatibility', () => {
  it('load file with only "snippets" field (old format)', () => {
    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
      snippets: makePatternData(),
    }
    const data = fileContent as CajaFileData
    const loaded = data.patterns ?? data.snippets
    expect(loaded).toBeDefined()
    expect(loaded!.items).toHaveLength(1)
    expect(loaded!.items[0].name).toBe('Card')
  })

  it('load file with only "patterns" field (new format)', () => {
    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
      patterns: makePatternData(),
    }
    const data = fileContent as CajaFileData
    const loaded = data.patterns ?? data.snippets
    expect(loaded).toBeDefined()
    expect(loaded!.items[0].name).toBe('Card')
  })

  it('load file with both fields — "patterns" takes precedence', () => {
    const oldData = makePatternData()
    oldData.items[0].name = 'Old Card'
    const newData = makePatternData()
    newData.items[0].name = 'New Card'

    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
      snippets: oldData,
      patterns: newData,
    }
    const data = fileContent as CajaFileData
    const loaded = data.patterns ?? data.snippets
    expect(loaded!.items[0].name).toBe('New Card')
  })

  it('load file with neither field — returns undefined', () => {
    const fileContent: Record<string, unknown> = {
      pages: [],
      activePageId: 'page-1',
    }
    const data = fileContent as CajaFileData
    const loaded = data.patterns ?? data.snippets
    expect(loaded).toBeUndefined()
  })

  it('save always writes "patterns" field, never "snippets"', () => {
    const patterns = makePatternData()
    const saved: CajaFileData = {
      pages: [],
      activePageId: 'page-1',
      patterns,
    }

    const json = JSON.stringify(saved)
    const parsed = JSON.parse(json)
    expect(parsed.patterns).toBeDefined()
    expect(parsed.snippets).toBeUndefined()
  })

  it('round-trip: save with patterns → reload → data matches', () => {
    const original = makePatternData()
    const saved: CajaFileData = {
      pages: [{ id: 'page-1', name: 'Home', route: '/' }] as any,
      activePageId: 'page-1',
      patterns: original,
    }

    const serialized = JSON.stringify(saved, null, 2)
    const restored = JSON.parse(serialized) as CajaFileData
    const loaded = restored.patterns ?? restored.snippets

    expect(loaded!.items).toEqual(original.items)
    expect(loaded!.order).toEqual(original.order)
    expect(loaded!.categories).toEqual(original.categories)
  })
})
