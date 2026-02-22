/**
 * Floating bottom bar for quick element insertion.
 * Prototype — click an icon to insert a primitive as child of
 * the selected frame (or root if nothing is selected).
 */

import { MousePointer2, Square, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown, Link } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { Tooltip } from '../ui/Tooltip'

import type { Frame } from '../../types/frame'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

function findParentBox(root: Frame, id: string): Frame | null {
  if (root.type !== 'box') return null
  for (const child of root.children) {
    if (child.id === id) return root
    const found = findParentBox(child, id)
    if (found) return found
  }
  return null
}

const primitives: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'box', icon: <Square size={14} />, label: 'Frame' },
  { type: 'text', icon: <Type size={14} />, label: 'Text' },
  { type: 'link', icon: <Link size={14} />, label: 'Link' },
  { type: 'image', icon: <ImageIcon size={14} />, label: 'Image' },
  { type: 'button', icon: <RectangleHorizontal size={14} />, label: 'Button' },
  { type: 'input', icon: <TextCursorInput size={14} />, label: 'Input' },
  { type: 'textarea', icon: <AlignLeft size={14} />, label: 'Textarea' },
  { type: 'select', icon: <ChevronDown size={14} />, label: 'Select' },
]

export function InsertBar() {
  const selectedId = useFrameStore((s) => s.selectedId)
  const addChild = useFrameStore((s) => s.addChild)
  const getSelected = useFrameStore((s) => s.getSelected)

  const handleInsert = (type: ElementType) => {
    // Box selected → insert as child; non-box selected → insert as sibling (into parent)
    let parentId = '__root__'
    if (selectedId && selectedId !== '__root__') {
      const selected = getSelected()
      if (selected && selected.type === 'box') {
        parentId = selectedId
      } else if (selected) {
        // Find the parent box of the selected non-box element
        const root = useFrameStore.getState().root
        const parent = findParentBox(root, selectedId)
        if (parent) parentId = parent.id
      }
    }
    addChild(parentId, type)
  }

  return (
    <div className="flex items-center gap-0.5 bg-surface-1 border border-border rounded-lg px-1 py-1">
      <Tooltip content="Select" side="top" sideOffset={8}>
        <div className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary">
          <MousePointer2 size={14} />
        </div>
      </Tooltip>
      <div className="w-px h-4 bg-border mx-0.5" />
      {primitives.map((item) => (
        <Tooltip key={item.type} content={item.label} side="top" sideOffset={8}>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            onClick={() => handleInsert(item.type)}
          >
            {item.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
