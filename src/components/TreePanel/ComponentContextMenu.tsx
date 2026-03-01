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

export function ComponentContextMenu({
  contextMenu, multiCount,
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
      className="fixed c-menu-popup min-w-[140px] z-50"
      style={{ left: contextMenu.x, top: contextMenu.y }}
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
