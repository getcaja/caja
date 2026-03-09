import { useCallback, useRef, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { useFrameStore, findInTree, isRootId } from '../../store/frameStore'
import { FrameContextMenu } from '../shared/FrameContextMenu'
import type { Frame } from '../../types/frame'

/** Build the ancestor chain from root down to targetId (inclusive). */
function getAncestorChain(root: Frame, targetId: string): Frame[] {
  const chain: Frame[] = []
  function walk(frame: Frame): boolean {
    chain.push(frame)
    if (frame.id === targetId) return true
    if (frame.type === 'box') {
      for (const child of frame.children) {
        if (walk(child)) return true
      }
    }
    chain.pop()
    return false
  }
  walk(root)
  return chain
}

interface MenuState {
  x: number
  y: number
  frameId: string | null
  /** All frames at the click point, front-to-back (via elementsFromPoint). */
  layers: string[]
}

export function useCanvasContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const el = (e.target as HTMLElement).closest('[data-frame-id]')
    const frameId = el?.getAttribute('data-frame-id') ?? null

    // Collect all frames at this point (front-to-back)
    const allEls = document.elementsFromPoint(e.clientX, e.clientY)
    const seen = new Set<string>()
    const layers: string[] = []
    for (const el2 of allEls) {
      const closest = el2.closest('[data-frame-id]')
      const id = closest?.getAttribute('data-frame-id')
      if (id && !seen.has(id)) {
        seen.add(id)
        layers.push(id)
      }
    }

    if (!frameId && layers.length === 0) return

    const { selectedIds } = useFrameStore.getState()
    if (frameId && !selectedIds.has(frameId) && !isRootId(frameId)) {
      useFrameStore.getState().select(frameId)
    }

    setMenu({ x: e.clientX, y: e.clientY, frameId, layers })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  return { menu, onContextMenu, close }
}

/** Hover-triggered submenu item — shows a flat list of layers to select. */
function SelectLayerSubmenu({ layers, close }: { layers: Frame[]; close: () => void }) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const store = useFrameStore.getState()
  const selectedId = store.selectedId

  return (
    <div
      ref={triggerRef}
      className="c-menu-item relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      Select element
      <ChevronRight size={12} className="ml-auto shrink-0 c-dimmed" />
      {open && (
        <div className="c-menu-popup min-w-[160px] absolute left-full top-0 -mt-1 ml-0.5">
          {layers.map((frame) => {
            const isSel = frame.id === selectedId
            return (
              <button
                key={frame.id}
                className={`c-menu-item ${isSel ? 'is-active' : ''}`}
                onClick={() => {
                  store.select(frame.id)
                  store.expandToFrame(frame.id)
                  close()
                }}
              >
                <span className="truncate">{isRootId(frame.id) ? 'Body' : frame.name}</span>
                {isSel && <Check size={12} className="ml-auto shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function CanvasContextMenu({ menu, close }: { menu: MenuState; close: () => void }) {
  const store = useFrameStore.getState()

  // Build layers: ancestor chain + overlapping elements from elementsFromPoint
  const clickedId = menu.frameId ?? menu.layers[0] ?? null
  const ancestorChain = clickedId ? getAncestorChain(store.root, clickedId) : []
  const chainIds = new Set(ancestorChain.map(f => f.id))

  const extraLayers: Frame[] = []
  for (const id of menu.layers) {
    if (!chainIds.has(id)) {
      const f = findInTree(store.root, id)
      if (f) extraLayers.push(f)
    }
  }

  const allLayers = [...ancestorChain, ...extraLayers]
  const showLayerSubmenu = allLayers.length > 1
  const showFrameActions = menu.frameId && !isRootId(menu.frameId)

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
        {showLayerSubmenu && (
          <>
            <SelectLayerSubmenu layers={allLayers} close={close} />
            {showFrameActions && <div className="border-t border-border my-1" />}
          </>
        )}
        {showFrameActions && <FrameContextMenu frameId={menu.frameId} close={close} />}
      </div>
    </>
  )
}
