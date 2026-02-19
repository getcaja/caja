import { useState, useRef } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { TreeNode } from './TreeNode'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { Plus } from 'lucide-react'

export function TreePanel() {
  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const addChild = useFrameStore((s) => s.addChild)

  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)

  function getTargetParentId(): string {
    if (!selectedId) return root.id
    function find(frame: import('../../types/frame').Frame): import('../../types/frame').Frame | null {
      if (frame.id === selectedId) return frame
      if (frame.type === 'box') {
        for (const child of frame.children) {
          const f = find(child)
          if (f) return f
        }
      }
      return null
    }
    const selected = find(root)
    if (selected?.type === 'box') return selected.id
    return root.id
  }

  const openAddMenu = () => {
    if (addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setShowAdd(true)
  }

  const handleAdd = (type: 'box' | 'text') => {
    addChild(getTargetParentId(), type)
    setShowAdd(false)
  }

  return (
    <TreeDndProvider>
      <div className="h-full bg-surface-1 flex flex-col">
        <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
          <span className="text-[12px] text-text-muted font-semibold">Elements</span>
          <button
            ref={addBtnRef}
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded-md transition-all"
            onClick={openAddMenu}
            title="Add element"
          >
            <Plus size={14} />
          </button>
        </div>

        {showAdd && (
          <AddMenu
            x={menuPos.x}
            y={menuPos.y}
            onAdd={handleAdd}
            onClose={() => setShowAdd(false)}
          />
        )}

        <div className="flex-1 overflow-y-auto py-1 px-1">
          <TreeNode frame={root} depth={0} isRoot />
        </div>
      </div>
    </TreeDndProvider>
  )
}
