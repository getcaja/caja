/**
 * Selection navigation history — tracks drill-down navigation
 * so Cmd+Z can undo selection changes before tree mutations.
 *
 * Cleared automatically when the tree root changes (mutations, undo/redo, page switch).
 */

import { useFrameStore } from './frameStore'

const past: (string | null)[] = []
const future: (string | null)[] = []

/** Push current selection before navigating to a new one. */
export function pushNav(currentSelectedId: string | null) {
  past.push(currentSelectedId)
  future.length = 0
}

/** Undo navigation. Returns the id to select, or null if nothing to undo. */
export function undoNav(currentSelectedId: string | null): { id: string | null } | null {
  if (past.length === 0) return null
  future.push(currentSelectedId)
  return { id: past.pop()! }
}

/** Redo navigation. Returns the id to select, or null if nothing to redo. */
export function redoNav(currentSelectedId: string | null): { id: string | null } | null {
  if (future.length === 0) return null
  past.push(currentSelectedId)
  return { id: future.pop()! }
}

/** Clear all navigation history. */
export function clearNav() {
  past.length = 0
  future.length = 0
}

// Auto-clear when tree root changes (mutation, undo/redo, page switch, file load)
let lastRoot: unknown = null
useFrameStore.subscribe((state) => {
  if (lastRoot !== null && state.root !== lastRoot) {
    clearNav()
  }
  lastRoot = state.root
})
