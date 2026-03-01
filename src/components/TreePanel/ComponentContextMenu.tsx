import { Pencil, Trash2, Play, Copy, SquarePen, FolderPlus } from 'lucide-react'
import type { Component } from '../../types/component'

interface ComponentContextMenuProps {
  contextMenu:
    | { x: number; y: number; type: 'component'; component: Component }
    | { x: number; y: number; type: 'category'; tag: string }
  readOnly: boolean
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

export function ComponentContextMenu({
  contextMenu, readOnly, multiCount,
  onEdit, onInsert, onDuplicate,
  onRename, onDelete, onGroup,
  onCategoryRename, onCategoryDelete,
  onClose,
}: ComponentContextMenuProps) {
  if (contextMenu.type === 'component') {
    return (
      <div
        className="fixed c-menu-popup min-w-[160px] z-50"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        {onEdit && (
          <button className="c-menu-item" onClick={() => { onEdit(contextMenu.component.id); onClose() }}>
            <SquarePen size={12} /> Edit
          </button>
        )}
        {onInsert && (
          <button className="c-menu-item" onClick={() => { onInsert(contextMenu.component); onClose() }}>
            <Play size={12} /> Insert
          </button>
        )}
        {(onEdit || onInsert) && !readOnly && <div className="border-t border-border my-1" />}
        {!readOnly && (
          <>
            {onDuplicate && (
              <button className="c-menu-item" onClick={() => { onDuplicate(contextMenu.component); onClose() }}>
                <Copy size={12} /> Duplicate
              </button>
            )}
            <button className="c-menu-item" onClick={() => { onRename(contextMenu.component); onClose() }}>
              <Pencil size={12} /> Rename
            </button>
            {onGroup && multiCount > 1 && (
              <>
                <div className="border-t border-border my-1" />
                <button className="c-menu-item" onClick={() => { onGroup(); onClose() }}>
                  <FolderPlus size={12} /> Group
                </button>
              </>
            )}
            <div className="border-t border-border my-1" />
            <button className="c-menu-item" onClick={() => { onDelete(contextMenu.component.id); onClose() }}>
              <Trash2 size={12} /> Delete
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed c-menu-popup min-w-[140px] z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="c-menu-item" onClick={() => { onCategoryRename(contextMenu.tag); onClose() }}>
        <Pencil size={12} /> Rename
      </button>
      <button className="c-menu-item" onClick={() => { onCategoryDelete(contextMenu.tag); onClose() }}>
        <Trash2 size={12} /> Delete category
      </button>
    </div>
  )
}
