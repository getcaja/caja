import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before importing anything that touches frameStore
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
})

import { pushNav, undoNav, redoNav, clearNav } from '../selectionHistory'

beforeEach(() => {
  clearNav()
})

describe('selectionHistory', () => {
  describe('pushNav + undoNav basic flow', () => {
    it('pushes A->B->C and undoes back to A', () => {
      // User selects A, then navigates to B (push A)
      pushNav('A')
      // User selects B, then navigates to C (push B)
      pushNav('B')
      // Current selection is C

      // Undo from C -> should return B
      const r1 = undoNav('C')
      expect(r1).toEqual({ id: 'B' })

      // Undo from B -> should return A
      const r2 = undoNav('B')
      expect(r2).toEqual({ id: 'A' })
    })

    it('handles null selection ids', () => {
      // Start with nothing selected, navigate to A (push null)
      pushNav(null)
      // Current is A, undo should return null (the previous selection)
      const r1 = undoNav('A')
      expect(r1).toEqual({ id: null })
    })
  })

  describe('undoNav returns null when empty', () => {
    it('returns null with no history', () => {
      expect(undoNav('A')).toBeNull()
    })

    it('returns null after exhausting history', () => {
      pushNav('A')
      undoNav('B') // undo once, past is now empty
      expect(undoNav('A')).toBeNull()
    })
  })

  describe('redoNav after undoNav', () => {
    it('redoes a single undo', () => {
      pushNav('A')
      // current is B, undo to A
      undoNav('B')
      // current is A, redo should return B
      const r = redoNav('A')
      expect(r).toEqual({ id: 'B' })
    })

    it('redoes multiple undos in reverse order', () => {
      pushNav('A')
      pushNav('B')
      // current is C
      undoNav('C') // -> B
      undoNav('B') // -> A
      // redo from A -> B
      const r1 = redoNav('A')
      expect(r1).toEqual({ id: 'B' })
      // redo from B -> C
      const r2 = redoNav('B')
      expect(r2).toEqual({ id: 'C' })
    })
  })

  describe('redoNav returns null when empty', () => {
    it('returns null with no future', () => {
      expect(redoNav('A')).toBeNull()
    })

    it('returns null after exhausting redo stack', () => {
      pushNav('A')
      undoNav('B')
      redoNav('A') // exhaust redo
      expect(redoNav('B')).toBeNull()
    })
  })

  describe('pushNav clears future (redo stack)', () => {
    it('clears redo stack when pushing new navigation', () => {
      pushNav('A')
      pushNav('B')
      // current is C, undo to B
      undoNav('C')
      // Now push a new navigation from B -> D (should clear future containing C)
      pushNav('B')
      // Redo should return null since future was cleared
      expect(redoNav('D')).toBeNull()
    })

    it('preserves past when clearing future', () => {
      pushNav('A')
      pushNav('B')
      undoNav('C') // -> B, future = [C]
      pushNav('B') // new push from B, clears future
      // past should be [A, B], future empty
      const r1 = undoNav('D')
      expect(r1).toEqual({ id: 'B' })
      const r2 = undoNav('B')
      expect(r2).toEqual({ id: 'A' })
    })
  })

  describe('clearNav clears both stacks', () => {
    it('clears past and future', () => {
      pushNav('A')
      pushNav('B')
      undoNav('C') // creates future entry

      clearNav()

      expect(undoNav('X')).toBeNull()
      expect(redoNav('X')).toBeNull()
    })
  })

  describe('multiple undo/redo cycles', () => {
    it('supports repeated undo/redo without data loss', () => {
      pushNav('A')
      pushNav('B')
      // current = C

      // Cycle 1: undo all, redo all
      expect(undoNav('C')).toEqual({ id: 'B' })
      expect(undoNav('B')).toEqual({ id: 'A' })
      expect(undoNav('A')).toBeNull()

      expect(redoNav('A')).toEqual({ id: 'B' })
      expect(redoNav('B')).toEqual({ id: 'C' })
      expect(redoNav('C')).toBeNull()

      // Cycle 2: same sequence works again
      expect(undoNav('C')).toEqual({ id: 'B' })
      expect(undoNav('B')).toEqual({ id: 'A' })

      expect(redoNav('A')).toEqual({ id: 'B' })
      expect(redoNav('B')).toEqual({ id: 'C' })
    })

    it('partial undo then push creates new branch', () => {
      pushNav('A')
      pushNav('B')
      pushNav('C')
      // current = D

      // Undo twice: D -> C -> B
      undoNav('D')
      undoNav('C')
      // current = B, past = [A], future = [C, D]

      // Push new: B -> E (clears future)
      pushNav('B')
      // past = [A, B], future = []

      expect(redoNav('E')).toBeNull()
      expect(undoNav('E')).toEqual({ id: 'B' })
      expect(undoNav('B')).toEqual({ id: 'A' })
      expect(undoNav('A')).toBeNull()
    })
  })
})
