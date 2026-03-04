import { useRef, useLayoutEffect, useState } from 'react'
import type { Component } from '../../types/component'

interface ComponentContextMenuProps {
  contextMenu:
    | { x: number; y: number; type: 'component'; component: Component }
    | { x: number; y: number; type: 'category'; tag: string }
  multiCount: number
  onEdit?: (id: string) => void
  onInsert?: (component: Component) => void
  onDuplicate?: (component: Component) => void
  onRename: (component: Component) => void
  onDelete: (id: string) => void
  onGroup?: () => void
  onCategoryRename: (tag: string) => void
  onCategoryDelete: (tag: string) => void
  onClose: () => void
}

/** Clamp menu position so it stays within the viewport */
function useClampedPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8)
    const clampedY = y + rect.height > window.innerHeight - 8
      ? y - rect.height
      : y
    setPos({ x: clampedX, y: clampedY })
  }, [x, y])
  return { ref, pos }
}

export function ComponentContextMenu({
  contextMenu, multiCount,
  onEdit, onInsert, onDuplicate,
  onRename, onDelete, onGroup,
  onCategoryRename, onCategoryDelete,
  onClose,
}: ComponentContextMenuProps) {
  const { ref, pos } = useClampedPosition(contextMenu.x, contextMenu.y)

  if (contextMenu.type === 'component') {
    return (
      <div
        ref={ref}
        className="fixed c-menu-popup min-w-[160px] z-50"
        style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <button className="c-menu-item" onClick={() => { onEdit(contextMenu.component.id); onClose() }}>
            Edit
          </button>
        )}
        {onInsert && (
          <button className="c-menu-item" onClick={() => { onInsert(contextMenu.component); onClose() }}>
            Insert
          </button>
        )}
        {(onEdit || onInsert) && <div className="border-t border-border my-1" />}
        {onDuplicate && (
          <button className="c-menu-item" onClick={() => { onDuplicate(contextMenu.component); onClose() }}>
            Duplicate
          </button>
        )}
        <button className="c-menu-item" onClick={() => { onRename(contextMenu.component); onClose() }}>
          Rename
        </button>
        {onGroup && multiCount > 1 && (
          <>
            <div className="border-t border-border my-1" />
            <button className="c-menu-item" onClick={() => { onGroup(); onClose() }}>
              Group
            </button>
          </>
        )}
        <div className="border-t border-border my-1" />
        <button className="c-menu-item" onClick={() => { onDelete(contextMenu.component.id); onClose() }}>
          Delete
        </button>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="fixed c-menu-popup min-w-[140px] z-50"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="c-menu-item" onClick={() => { onCategoryRename(contextMenu.tag); onClose() }}>
        Rename
      </button>
      <button className="c-menu-item" onClick={() => { onCategoryDelete(contextMenu.tag); onClose() }}>
        Delete category
      </button>
    </div>
  )
}
