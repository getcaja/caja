import { useEffect } from 'react'

export interface TreeKeyboardConfig {
  isActive: boolean
  getSelectedIds: () => Set<string>
  getPrimaryId: () => string | null
  deleteSelected?: () => void
  duplicateSelected?: () => void
  copySelected?: () => void
  cutSelected?: () => void
  selectAll?: () => void
  rename?: () => void
  escape?: () => void
  reorder?: (dir: 'up' | 'down', arrowKey: string) => void
}

function isEditable(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if ((e.target as HTMLElement).isContentEditable) return true
  return false
}

export function useTreeKeyboard(config: TreeKeyboardConfig) {
  useEffect(() => {
    if (!config.isActive) return

    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const mod = e.metaKey || e.ctrlKey

      // Escape — always allow (even in inputs for inline edit cancel)
      if (e.key === 'Escape' && config.escape) {
        config.escape()
        return
      }

      // F2 — rename (not in inputs)
      if (e.key === 'F2' && !isEditable(e) && config.rename) {
        e.preventDefault()
        config.rename()
        return
      }

      // Guard: skip all below when focused on an input
      if (isEditable(e)) return

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.defaultPrevented && config.deleteSelected) {
        const ids = config.getSelectedIds()
        const primary = config.getPrimaryId()
        if (ids.size === 0 && !primary) return
        e.preventDefault()
        config.deleteSelected()
        return
      }

      // Arrow keys — reorder (adapter receives raw key for direction filtering)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.defaultPrevented && config.reorder) {
        const primary = config.getPrimaryId()
        if (!primary) return
        e.preventDefault()
        const before = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
        config.reorder(before ? 'up' : 'down', e.key)
        return
      }

      // Cmd+A — select all
      if (mod && key === 'a' && !e.shiftKey && !e.defaultPrevented && config.selectAll) {
        e.preventDefault()
        config.selectAll()
        return
      }

      // Cmd+C — copy
      if (mod && key === 'c' && !e.shiftKey && !e.defaultPrevented && config.copySelected) {
        e.preventDefault()
        config.copySelected()
        return
      }

      // Cmd+X — cut
      if (mod && key === 'x' && !e.shiftKey && !e.defaultPrevented && config.cutSelected) {
        e.preventDefault()
        config.cutSelected()
        return
      }

      // Cmd+V — paste is handled globally by App.tsx (image detection + internal fallback).
      // Do NOT handle here — dual handlers cause duplicate paste (image + internal clipboard).

      // Cmd+D — duplicate
      if (mod && key === 'd' && !e.defaultPrevented && config.duplicateSelected) {
        e.preventDefault()
        config.duplicateSelected()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [config])
}
