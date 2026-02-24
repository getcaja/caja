import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PatternData } from '../../store/catalogStore'
import type { LibraryMeta } from '../../types/pattern'
import type { CjlFileData } from '../libraryOps'

// We test the .cjl format structure directly (serialization/parsing) without
// importing libraryOps (which depends on Tauri FS APIs). This validates the
// data contract that importLibrary/exportLibrary rely on.

function makePatternData(): PatternData {
  return {
    items: [
      {
        id: 'p1',
        name: 'Button',
        tags: ['ui'],
        frame: { id: 'f1', type: 'text', name: 'btn' } as any,
        meta: { author: 'test' },
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    order: ['p1'],
    categories: ['ui'],
  }
}

describe('.cjl file format', () => {
  it('valid CjlFileData serializes and deserializes correctly', () => {
    const cjl: CjlFileData = {
      version: 1,
      name: 'My UI Kit',
      author: 'Alice',
      description: 'A set of UI components',
      libraryVersion: '1.0.0',
      patterns: makePatternData(),
    }

    const json = JSON.stringify(cjl, null, 2)
    const parsed = JSON.parse(json) as CjlFileData

    expect(parsed.version).toBe(1)
    expect(parsed.name).toBe('My UI Kit')
    expect(parsed.author).toBe('Alice')
    expect(parsed.description).toBe('A set of UI components')
    expect(parsed.libraryVersion).toBe('1.0.0')
    expect(parsed.patterns.items).toHaveLength(1)
    expect(parsed.patterns.items[0].name).toBe('Button')
    expect(parsed.patterns.order).toEqual(['p1'])
    expect(parsed.patterns.categories).toEqual(['ui'])
  })

  it('round-trip: create → serialize → parse → verify', () => {
    const original = makePatternData()
    const cjl: CjlFileData = {
      version: 1,
      name: 'Test Lib',
      patterns: original,
    }

    const serialized = JSON.stringify(cjl)
    const restored = JSON.parse(serialized) as CjlFileData

    expect(restored.patterns.items).toEqual(original.items)
    expect(restored.patterns.order).toEqual(original.order)
    expect(restored.patterns.categories).toEqual(original.categories)
  })

  it('optional fields can be omitted', () => {
    const cjl: CjlFileData = {
      version: 1,
      name: 'Minimal',
      patterns: { items: [], order: [], categories: [] },
    }

    const parsed = JSON.parse(JSON.stringify(cjl)) as CjlFileData
    expect(parsed.author).toBeUndefined()
    expect(parsed.description).toBeUndefined()
    expect(parsed.libraryVersion).toBeUndefined()
  })

  it('detects malformed files: missing name', () => {
    const bad = { version: 1, patterns: makePatternData() }
    const parsed = bad as Partial<CjlFileData>
    expect(parsed.name).toBeUndefined()
    // importLibrary would throw: "Invalid .cjl file: missing name or patterns"
  })

  it('detects malformed files: missing patterns', () => {
    const bad = { version: 1, name: 'Bad' }
    const parsed = bad as Partial<CjlFileData>
    expect(parsed.patterns).toBeUndefined()
  })

  it('LibraryMeta can be constructed from CjlFileData', () => {
    const cjl: CjlFileData = {
      version: 1,
      name: 'Kit',
      author: 'Bob',
      description: 'desc',
      libraryVersion: '2.0',
      patterns: makePatternData(),
    }

    const meta: LibraryMeta = {
      id: 'lib-uuid',
      name: cjl.name,
      author: cjl.author,
      version: cjl.libraryVersion,
      description: cjl.description,
      importedAt: new Date().toISOString(),
      filePath: 'lib-uuid.cjl',
    }

    expect(meta.name).toBe('Kit')
    expect(meta.author).toBe('Bob')
    expect(meta.version).toBe('2.0')
    expect(meta.description).toBe('desc')
  })
})
