import { useCallback, useState } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { FrameContextMenu } from '../shared/FrameContextMenu'

interface MenuState {
  x: number
  y: number
  frameId: string | null
}

export function useCanvasContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const el = (e.target as HTMLElement).closest('[data-frame-id]')
    const frameId = el?.getAttribute('data-frame-id') ?? null

    // Don't show empty menu for root or canvas background
    const isRoot = frameId?.startsWith('__root__')
    if (!frameId || isRoot) return

    const { selectedIds } = useFrameStore.getState()
    if (!selectedIds.has(frameId)) {
      useFrameStore.getState().select(frameId)
    }

    setMenu({ x: e.clientX, y: e.clientY, frameId })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  return { menu, onContextMenu, close }
}

export function CanvasContextMenu({ menu, close }: { menu: MenuState; close: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={close}
        onContextMenu={(e) => { e.preventDefault(); close() }}
      />
      <div
        className="fixed c-menu-popup min-w-[180px] z-50"
        style={{ left: menu.x, top: menu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <FrameContextMenu frameId={menu.frameId} close={close} />
      </div>
    </>
  )
}
