import { Pencil, Trash2 } from 'lucide-react'
import type { Pattern } from '../../types/pattern'

interface PatternContextMenuProps {
  contextMenu:
    | { x: number; y: number; type: 'pattern'; pattern: Pattern }
    | { x: number; y: number; type: 'category'; tag: string }
  readOnly: boolean
  onRename: (pattern: Pattern) => void
  onDelete: (id: string) => void
  onCategoryRename: (tag: string) => void
  onCategoryDelete: (tag: string) => void
  onClose: () => void
}

export function PatternContextMenu({
  contextMenu, readOnly,
  onRename, onDelete,
  onCategoryRename, onCategoryDelete,
  onClose,
}: PatternContextMenuProps) {
  if (contextMenu.type === 'pattern') {
    if (readOnly) return null
    return (
      <div
        className="fixed c-menu-popup min-w-[160px] z-50"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="c-menu-item" onClick={() => { onRename(contextMenu.pattern); onClose() }}>
          <Pencil size={12} /> Rename
        </button>
        <div className="border-t border-border my-1" />
        <button className="c-menu-item" onClick={() => { onDelete(contextMenu.pattern.id); onClose() }}>
          <Trash2 size={12} /> Delete
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
        <Pencil size={12} /> Rename
      </button>
      <button className="c-menu-item" onClick={() => { onCategoryDelete(contextMenu.tag); onClose() }}>
        <Trash2 size={12} /> Delete category
      </button>
    </div>
  )
}
