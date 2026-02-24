import { useState, useRef, useEffect } from 'react'
import type { Frame } from '../../types/frame'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { useSnippetStore } from '../../store/snippetStore'
import { AddMenu } from './AddMenu'
import { useTreeDnd, type DropPosition } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { ChevronRight, ChevronDown, Square, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Plus, Copy, Trash2, Group, SquarePlus, Eye, EyeOff, Link, Bookmark } from 'lucide-react'

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
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const collapsedIds = useFrameStore((s) => s.collapsedIds)
  const select = useFrameStore((s) => s.select)
  const selectMulti = useFrameStore((s) => s.selectMulti)
  const removeSelected = useFrameStore((s) => s.removeSelected)
  const hover = useFrameStore((s) => s.hover)
  const toggleCollapse = useFrameStore((s) => s.toggleCollapse)
  const addChild = useFrameStore((s) => s.addChild)
  const removeFrame = useFrameStore((s) => s.removeFrame)
  const duplicateFrame = useFrameStore((s) => s.duplicateFrame)
  const wrapInFrame = useFrameStore((s) => s.wrapInFrame)
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const toggleHidden = useFrameStore((s) => s.toggleHidden)
  const moveFrame = useFrameStore((s) => s.moveFrame)

  const { dragId, overId, overPosition, startDrag, setOver, endDrag } = useTreeDnd()

  const nameEdit = useInlineEdit((v) => renameFrame(frame.id, v))
  const ctxMenu = useContextMenu()
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedId === frame.id || selectedIds.has(frame.id)

  useEffect(() => {
    if (isSelected && rowRef.current) {
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isSelected])

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
      const dragNode = findInTree(root, dragId)
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
        draggable={!nameEdit.editing && !isRoot}
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md cursor-pointer group transition-all ${
          isSelected
            ? 'tree-node-selected text-text-primary'
            : isOver && overPosition === 'inside'
              ? 'bg-[var(--color-focus)]/10 outline outline-1 outline-[var(--color-focus)]/40'
              : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
        } ${isDragging ? 'opacity-40' : ''} ${frame.hidden ? 'opacity-40' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={(e) => {
          if ((e.metaKey || e.ctrlKey) && !isRoot) {
            selectMulti(frame.id)
          } else {
            select(frame.id)
          }
        }}
        onMouseEnter={() => hover(frame.id)}
        onMouseLeave={() => hover(null)}
        onDoubleClick={() => {
          if (!isRoot) nameEdit.start(frame.name)
        }}
        onContextMenu={(e) => {
          select(frame.id)
          ctxMenu.open(e)
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
          : frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? 'text-indigo-400'
          : frame.type === 'text' ? 'text-emerald-400'
          : frame.type === 'image' ? 'text-violet-400'
          : frame.type === 'button' ? 'text-amber-400'
          : frame.type === 'input' || frame.type === 'textarea' || frame.type === 'select' ? 'text-sky-400'
          : 'text-text-muted'
        }`}>
          {frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
            : frame.type === 'text' ? <Type size={12} />
            : frame.type === 'image' ? <ImageIcon size={12} />
            : frame.type === 'button' ? <RectangleHorizontal size={12} />
            : frame.type === 'input' ? <TextCursorInput size={12} />
            : frame.type === 'textarea' ? <AlignLeft size={12} />
            : frame.type === 'select' ? <ListCollapse size={12} />
            : <Square size={12} />}
        </span>

        {/* Color dot */}
        {frame.bg.value && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: frame.bg.value }}
          />
        )}

        {/* Name */}
        {!isRoot && nameEdit.editing ? (
          <input {...nameEdit.inputProps} />
        ) : (
          <span className="flex-1 text-[12px] truncate">{isRoot ? 'Body' : frame.name}</span>
        )}

        {/* Actions on hover */}
        <div className={`${frame.hidden ? 'flex' : 'hidden group-hover:flex'} items-center gap-0.5 shrink-0`}>
          {addTargetId && !frame.hidden && (
            <button
              ref={addBtnRef}
              className="w-4 h-4 c-icon-btn text-[10px] hover:text-accent hover:bg-accent/10"
              onClick={(e) => {
                e.stopPropagation()
                openAddMenu()
              }}
              title="Add"
            >
              <Plus size={12} />
            </button>
          )}
          {!isRoot && !frame.hidden && (
            <button
              className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
              onClick={(e) => {
                e.stopPropagation()
                duplicateFrame(frame.id)
              }}
              title="Duplicate"
            >
              <Copy size={10} />
            </button>
          )}
          {!isRoot && (
            <button
              className={`w-4 h-4 c-icon-btn text-[10px] ${frame.hidden ? 'text-text-muted' : 'hover:text-text-secondary hover:bg-surface-2/60'}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleHidden(frame.id)
              }}
              title={frame.hidden ? 'Show' : 'Hide'}
            >
              {frame.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
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
      {ctxMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[160px]"
          style={{ left: ctxMenu.menu.x, top: ctxMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isRoot && (
            <>
              <button
                className="c-menu-item"
                onClick={() => { duplicateFrame(frame.id); ctxMenu.close() }}
              >
                <Copy size={12} /> Duplicate
              </button>
              <button
                className="c-menu-item"
                onClick={() => { wrapInFrame(frame.id); ctxMenu.close() }}
              >
                <Group size={12} /> Wrap in Frame
              </button>
              <button
                className="c-menu-item"
                onClick={() => {
                  const store = useFrameStore.getState()
                  const f = findInTree(store.root, frame.id)
                  if (f) {
                    useSnippetStore.getState().saveSnippet(f.name || 'Snippet', [], f)
                    store.setTreePanelTab('snippets')
                  }
                  ctxMenu.close()
                }}
              >
                <Bookmark size={12} /> Save as Snippet
              </button>
            </>
          )}
          {addTargetId && (
            <>
              <div className="border-t border-border my-1" />
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'box'); ctxMenu.close() }}
              >
                <SquarePlus size={12} /> Add Frame
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'text'); ctxMenu.close() }}
              >
                <Type size={12} /> Add Text
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'link'); ctxMenu.close() }}
              >
                <Link size={12} /> Add Link
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'image'); ctxMenu.close() }}
              >
                <ImageIcon size={12} /> Add Image
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'button'); ctxMenu.close() }}
              >
                <RectangleHorizontal size={12} /> Add Button
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'input'); ctxMenu.close() }}
              >
                <TextCursorInput size={12} /> Add Input
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'textarea'); ctxMenu.close() }}
              >
                <AlignLeft size={12} /> Add Textarea
              </button>
              <button
                className="c-menu-item"
                onClick={() => { addChild(addTargetId, 'select'); ctxMenu.close() }}
              >
                <ListCollapse size={12} /> Add Select
              </button>
            </>
          )}
          {!isRoot && (
            <>
              <div className="border-t border-border my-1" />
              {selectedIds.size > 1 ? (
                <button
                  className="c-menu-item text-destructive"
                  onClick={() => { removeSelected(); ctxMenu.close() }}
                >
                  <Trash2 size={12} /> Delete {selectedIds.size} elements
                </button>
              ) : (
                <button
                  className="c-menu-item"
                  onClick={() => { removeFrame(frame.id); ctxMenu.close() }}
                >
                  <Trash2 size={12} /> Delete
                </button>
              )}
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
