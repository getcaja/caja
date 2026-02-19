import { useState, useRef, useCallback, useEffect } from 'react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { AddMenu } from './AddMenu'
import { useTreeDnd, type DropPosition } from './TreeDndContext'
import { ChevronRight, ChevronDown, Square, Type, ImageIcon, RectangleHorizontal, TextCursorInput, Plus, X, Copy, Trash2, WrapText, SquarePlus } from 'lucide-react'

interface TreeNodeProps {
  frame: Frame
  depth: number
  parentId?: string | null
  index?: number
  isRoot?: boolean
}

function isDescendant(frame: Frame, targetId: string): boolean {
  if (frame.id === targetId) return true
  if (frame.type === 'box') {
    return frame.children.some((c) => isDescendant(c, targetId))
  }
  return false
}

export function TreeNode({ frame, depth, parentId = null, index = 0, isRoot = false }: TreeNodeProps) {
  const selectedId = useFrameStore((s) => s.selectedId)
  const collapsedIds = useFrameStore((s) => s.collapsedIds)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const toggleCollapse = useFrameStore((s) => s.toggleCollapse)
  const addChild = useFrameStore((s) => s.addChild)
  const removeFrame = useFrameStore((s) => s.removeFrame)
  const duplicateFrame = useFrameStore((s) => s.duplicateFrame)
  const wrapInFrame = useFrameStore((s) => s.wrapInFrame)
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const moveFrame = useFrameStore((s) => s.moveFrame)

  const { dragId, overId, overPosition, startDrag, setOver, endDrag } = useTreeDnd()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(frame.name)
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedId === frame.id
  const isBox = frame.type === 'box'
  const hasChildren = isBox && frame.children.length > 0
  const isCollapsed = collapsedIds.has(frame.id)
  const isDragging = dragId === frame.id
  const isOver = overId === frame.id && dragId !== frame.id

  const isLeaf = frame.type !== 'box'
  const addTargetId = isLeaf ? parentId : frame.id

  const openAddMenu = () => {
    if (addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setShowAdd(true)
  }

  const closeContext = useCallback(() => setContextMenu(null), [])
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener('click', closeContext)
      return () => window.removeEventListener('click', closeContext)
    }
  }, [contextMenu, closeContext])

  const getDropPosition = (e: React.DragEvent): DropPosition => {
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return 'after'
    const y = e.clientY - rect.top
    const third = rect.height / 3
    if (y < third) return 'before'
    if (y > third * 2 || !isBox) return 'after'
    return 'inside'
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', frame.id)
    startDrag(frame.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId || dragId === frame.id) return
    const root = useFrameStore.getState().root
    if (root) {
      const dragNode = findNode(root, dragId)
      if (dragNode && isDescendant(dragNode, frame.id)) return
    }
    e.dataTransfer.dropEffect = 'move'
    setOver(frame.id, getDropPosition(e))
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    if (overId === frame.id) {
      setOver(null, null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId || dragId === frame.id || !overPosition) {
      endDrag()
      return
    }

    const pos = getDropPosition(e)

    if (pos === 'inside' && isBox) {
      moveFrame(dragId, frame.id, frame.children.length)
    } else if (pos === 'before' && parentId) {
      moveFrame(dragId, parentId, index)
    } else if (pos === 'after' && parentId) {
      moveFrame(dragId, parentId, index + 1)
    }

    endDrag()
  }

  const handleDragEnd = () => {
    endDrag()
  }

  // Drop indicator styles
  let dropIndicator: React.ReactNode = null
  if (isOver && overPosition && dragId) {
    if (overPosition === 'before') {
      dropIndicator = (
        <div
          className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10"
          style={{ marginLeft: depth * 16 + 4 }}
        />
      )
    } else if (overPosition === 'after') {
      dropIndicator = (
        <div
          className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10"
          style={{ marginLeft: depth * 16 + 4 }}
        />
      )
    }
  }

  return (
    <div className="relative">
      {dropIndicator}
      <div
        ref={rowRef}
        draggable={!editing && !isRoot}
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md cursor-pointer group transition-all ${
          isSelected
            ? 'bg-accent/15 text-text-primary'
            : isOver && overPosition === 'inside'
              ? 'bg-accent/10 outline outline-1 outline-accent/40'
              : 'hover:bg-surface-2/60 text-text-secondary'
        } ${isDragging ? 'opacity-40' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => select(frame.id)}
        onMouseEnter={() => hover(frame.id)}
        onMouseLeave={() => hover(null)}
        onDoubleClick={() => {
          setEditing(true)
          setEditName(frame.name)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          select(frame.id)
          setContextMenu({ x: e.clientX, y: e.clientY })
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        {/* Collapse chevron */}
        <span
          className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation()
              toggleCollapse(frame.id)
            }
          }}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          {hasChildren ? (isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />) : null}
        </span>

        {/* Type icon */}
        <span className={`shrink-0 ${
          isRoot ? 'text-blue-400'
          : frame.type === 'text' ? 'text-emerald-400'
          : frame.type === 'image' ? 'text-violet-400'
          : frame.type === 'button' ? 'text-amber-400'
          : frame.type === 'input' ? 'text-sky-400'
          : 'text-text-muted'
        }`}>
          {frame.type === 'text' ? <Type size={12} />
            : frame.type === 'image' ? <ImageIcon size={12} />
            : frame.type === 'button' ? <RectangleHorizontal size={12} />
            : frame.type === 'input' ? <TextCursorInput size={12} />
            : <Square size={12} />}
        </span>

        {/* Color dot */}
        {frame.bg && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: frame.bg }}
          />
        )}

        {/* Name */}
        {!isRoot && editing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              setEditing(false)
              if (editName.trim()) renameFrame(frame.id, editName.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditing(false)
                if (editName.trim()) renameFrame(frame.id, editName.trim())
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
          />
        ) : (
          <span className="flex-1 text-[12px] truncate">{isRoot ? 'Body' : frame.name}</span>
        )}

        {/* Actions on hover */}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {addTargetId && (
            <button
              ref={addBtnRef}
              className="w-4 h-4 flex items-center justify-center text-[10px] text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all"
              onClick={(e) => {
                e.stopPropagation()
                openAddMenu()
              }}
              title="Add"
            >
              <Plus size={12} />
            </button>
          )}
          {!isRoot && (
            <button
              className="w-4 h-4 flex items-center justify-center text-[10px] text-text-muted hover:text-destructive hover:bg-destructive/10 rounded transition-all"
              onClick={(e) => {
                e.stopPropagation()
                removeFrame(frame.id)
              }}
              title="Delete"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Add menu (fixed position) */}
      {showAdd && addTargetId && (
        <AddMenu
          x={menuPos.x}
          y={menuPos.y}
          onAdd={(type) => { addChild(addTargetId, type); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Right-click context menu (fixed position) */}
      {contextMenu && (
        <div
          className="fixed bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-[9999] py-1.5 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isRoot && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
              onClick={() => { wrapInFrame(frame.id); setContextMenu(null) }}
            >
              <WrapText size={12} /> Wrap Selection
            </button>
          )}
          {addTargetId && (
            <>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { addChild(addTargetId, 'box'); setContextMenu(null) }}
              >
                <SquarePlus size={12} /> Add Frame
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { addChild(addTargetId, 'text'); setContextMenu(null) }}
              >
                <Type size={12} /> Add Text
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { addChild(addTargetId, 'image'); setContextMenu(null) }}
              >
                <ImageIcon size={12} /> Add Image
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { addChild(addTargetId, 'button'); setContextMenu(null) }}
              >
                <RectangleHorizontal size={12} /> Add Button
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { addChild(addTargetId, 'input'); setContextMenu(null) }}
              >
                <TextCursorInput size={12} /> Add Input
              </button>
            </>
          )}
          {!isRoot && (
            <>
              <div className="border-t border-border/60 my-1" />
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
                onClick={() => { duplicateFrame(frame.id); setContextMenu(null) }}
              >
                <Copy size={12} /> Duplicate
              </button>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { removeFrame(frame.id); setContextMenu(null) }}
              >
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Children */}
      {isBox && !isCollapsed &&
        frame.children.map((child, i) => (
          <TreeNode key={child.id} frame={child} depth={depth + 1} parentId={frame.id} index={i} />
        ))}
    </div>
  )
}

function findNode(root: Frame, id: string): Frame | null {
  if (root.id === id) return root
  if (root.type === 'box') {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}
