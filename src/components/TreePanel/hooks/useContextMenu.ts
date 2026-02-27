import { useState, useCallback, createElement } from 'react'

interface ContextMenuState {
  menu: { x: number; y: number } | null
  open: (e: React.MouseEvent) => void
  openAt: (x: number, y: number) => void
  close: () => void
  /** Render this backdrop before the menu to close on outside click (including iframe) */
  backdrop: React.ReactNode
}

export function useContextMenu(): ContextMenuState {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const openAt = useCallback((x: number, y: number) => {
    setMenu({ x, y })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  // Transparent overlay covers the entire viewport (including iframe) to catch outside clicks
  const backdrop = menu
    ? createElement('div', {
        className: 'fixed inset-0 z-40',
        onClick: close,
        onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); close() },
      })
    : null

  return { menu, open, openAt, close, backdrop }
}
