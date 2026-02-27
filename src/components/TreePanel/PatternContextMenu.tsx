import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Pattern } from '../../types/pattern'

interface PatternContextMenuProps {
  contextMenu:
    | { x: number; y: number; type: 'pattern'; pattern: Pattern }
    | { x: number; y: number; type: 'category'; tag: string }
  readOnly: boolean
  onInsert: (pattern: Pattern) => void
  onRename: (pattern: Pattern) => void
  onDelete: (id: string) => void
  onCategoryRename: (tag: string) => void
  onCategoryDelete: (tag: string) => void
  onClose: () => void
}

export function PatternContextMenu({
  contextMenu, readOnly,
  onInsert, onRename, onDelete,
  onCategoryRename, onCategoryDelete,
  onClose,
}: PatternContextMenuProps) {
  if (contextMenu.type === 'pattern') {
    return (
      <div
        className="fixed c-menu-popup min-w-[160px] z-50"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="c-menu-item" onClick={() => { onInsert(contextMenu.pattern); onClose() }}>
          <Plus size={12} /> Insert
        </button>
        {!readOnly && (
          <>
            <button className="c-menu-item" onClick={() => { onRename(contextMenu.pattern); onClose() }}>
              <Pencil size={12} /> Rename
            </button>
            <div className="border-t border-border my-1" />
            <button className="c-menu-item text-destructive" onClick={() => { onDelete(contextMenu.pattern.id); onClose() }}>
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
      <button className="c-menu-item text-destructive" onClick={() => { onCategoryDelete(contextMenu.tag); onClose() }}>
        <Trash2 size={12} /> Delete category
      </button>
    </div>
  )
}
