import { useState, useCallback, useEffect } from 'react'

interface ContextMenuState {
  menu: { x: number; y: number } | null
  open: (e: React.MouseEvent) => void
  openAt: (x: number, y: number) => void
  close: () => void
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

  useEffect(() => {
    if (menu) {
      const timer = setTimeout(() => window.addEventListener('click', close), 0)
      return () => { clearTimeout(timer); window.removeEventListener('click', close) }
    }
  }, [menu, close])

  return { menu, open, openAt, close }
}
