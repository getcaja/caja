import { useRef, useEffect, useCallback, useMemo } from 'react'
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core'
import type { Frame } from '../../types/frame'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { useTreeDnd, type DropPosition } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { ChevronRight, ChevronDown, Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Copy, Trash2, Group, SquarePlus, Eye, EyeOff, Link, Bookmark, Diamond, Pencil, RotateCcw, Unlink } from 'lucide-react'

interface TreeNodeProps {
  frame: Frame
  depth: number
  parentId?: string | null
  index?: number
  isRoot?: boolean
}

export function TreeNode({ frame, depth, parentId = null, index = 0, isRoot = false }: TreeNodeProps) {
  const selectedId = useFrameStore((s) => s.selectedId)
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const collapsedIds = useFrameStore((s) => s.collapsedIds)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const toggleCollapse = useFrameStore((s) => s.toggleCollapse)
  const addChild = useFrameStore((s) => s.addChild)
  const removeFrame = useFrameStore((s) => s.removeFrame)
  const duplicateFrame = useFrameStore((s) => s.duplicateFrame)
  const wrapInFrame = useFrameStore((s) => s.wrapInFrame)
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const toggleHidden = useFrameStore((s) => s.toggleHidden)

  const { activeId, overId, overPosition } = useTreeDnd()
  const { active: dndActive } = useDndContext()

  const nameEdit = useInlineEdit((v) => renameFrame(frame.id, v))
  const ctxMenu = useContextMenu()
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
  // Use dnd-kit's own context for isDragging — most reliable source of truth
  const isDragging = dndActive !== null && String(dndActive.id) === frame.id
  const isOver = overId === frame.id && !isDragging

  const isInstance = !!frame._componentId
  const isOnComponentPage = useFrameStore((s) => s.pages.find((p) => p.id === s.activePageId)?.isComponentPage ?? false)
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const isMaster = isOnComponentPage && !editingComponentId && !isRoot && parentId !== null
  const isLeaf = frame.type !== 'box'
  const addTargetId = isLeaf ? parentId : frame.id

  /* ── dnd-kit hooks ──────────────────────────────────────── */

  const { setNodeRef: setDraggableRef, listeners, attributes } = useDraggable({
    id: frame.id,
    disabled: isRoot || nameEdit.editing,
  })

  const hasExpandedChildren = isBox && hasChildren && !isCollapsed

  const droppableData = useMemo(
    () => ({ parentId, index, isBox, hasExpandedChildren }),
    [parentId, index, isBox, hasExpandedChildren],
  )

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: frame.id,
    data: droppableData,
  })

  // Merge draggable + droppable + local refs
  const setNodeRef = useCallback(
    (el: HTMLElement | null) => {
      setDraggableRef(el)
      setDroppableRef(el)
      rowRef.current = el
    },
    [setDraggableRef, setDroppableRef],
  )

  // Drop indicator styles
  let dropIndicator: React.ReactNode = null
  if (isOver && overPosition && activeId) {
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
    <div className="relative" style={isDragging ? { opacity: 0.3 } : undefined}>
      {dropIndicator}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md cursor-default group transition-all ${
          isSelected
            ? 'tree-node-selected text-text-primary'
            : isOver && overPosition === 'inside'
              ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
              : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
        } ${frame.hidden ? 'opacity-40' : ''}`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => select(frame.id)}
        onMouseEnter={() => hover(frame.id)}
        onMouseLeave={() => hover(null)}
        onDoubleClick={() => {
          if (isRoot) return
          // Double-click on an instance → enter edit mode for its master
          if (isInstance && frame._componentId) {
            useFrameStore.getState().enterComponentEditMode(frame._componentId)
            return
          }
          nameEdit.start(frame.name)
        }}
        onContextMenu={(e) => {
          select(frame.id)
          ctxMenu.open(e)
        }}
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
          {isBox ? (
            hasChildren ? (isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />) : <ChevronRight size={10} className="opacity-50" />
          ) : null}
        </span>

        {/* Type icon — filled diamond for masters, hollow diamond for instances */}
        <span className={`shrink-0 ${isMaster ? 'text-purple-400' : isInstance ? 'text-purple-400' : ''}`}>
          {isMaster ? <Diamond size={12} fill="currentColor" />
            : isInstance ? <Diamond size={12} />
            : frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
            : frame.type === 'text' ? <Type size={12} />
            : frame.type === 'image' ? <ImageIcon size={12} />
            : frame.type === 'button' ? <RectangleHorizontal size={12} />
            : frame.type === 'input' ? <TextCursorInput size={12} />
            : frame.type === 'textarea' ? <AlignLeft size={12} />
            : frame.type === 'select' ? <ListCollapse size={12} />
            : <FrameIcon size={12} />}
        </span>

        {/* Color dot */}
        {frame.bg?.value && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: frame.bg.value }}
          />
        )}

        {/* Name */}
        {!isRoot && nameEdit.editing ? (
          <input {...nameEdit.inputProps} />
        ) : (
          <span className={`flex-1 h-5 flex items-center text-[12px] truncate ${isMaster || isInstance ? 'text-purple-400' : ''}`}>{isRoot && !editingComponentId ? 'Body' : frame.name}</span>
        )}

        {/* Visibility toggle on hover */}
        {!isRoot && (
          <button
            className={`w-4 h-4 c-icon-btn text-[10px] shrink-0 ${frame.hidden ? '' : 'hidden group-hover:flex'} ${frame.hidden ? 'text-text-muted' : 'hover:text-text-secondary hover:bg-surface-2/60'}`}
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

      {/* Right-click context menu (fixed position) */}
      {ctxMenu.backdrop}
      {ctxMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[160px] z-50"
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
              {!isInstance && !isMaster && (
                <button
                  className="c-menu-item"
                  onClick={() => {
                    useFrameStore.getState().createComponent(frame.id)
                    ctxMenu.close()
                  }}
                >
                  <Bookmark size={12} /> Save as Component
                </button>
              )}
              {isMaster && (
                <button
                  className="c-menu-item"
                  onClick={() => {
                    const store = useFrameStore.getState()
                    // Switch back to Layers page and insert instance there
                    store.setTreePanelTab('layers')
                    requestAnimationFrame(() => {
                      useFrameStore.getState().insertInstance(frame.id, useFrameStore.getState().root.id)
                    })
                    ctxMenu.close()
                  }}
                >
                  <Copy size={12} /> Insert Instance
                </button>
              )}
              {isInstance && (
                <>
                  <button
                    className="c-menu-item"
                    onClick={() => {
                      if (!frame._componentId) { ctxMenu.close(); return }
                      useFrameStore.getState().enterComponentEditMode(frame._componentId)
                      ctxMenu.close()
                    }}
                  >
                    <Pencil size={12} /> Edit Master
                  </button>
                  <button
                    className="c-menu-item"
                    onClick={() => {
                      useFrameStore.getState().resetInstance(frame.id)
                      ctxMenu.close()
                    }}
                  >
                    <RotateCcw size={12} /> Reset Instance
                  </button>
                  <button
                    className="c-menu-item"
                    onClick={() => {
                      useFrameStore.getState().detachInstance(frame.id)
                      ctxMenu.close()
                    }}
                  >
                    <Unlink size={12} /> Detach Instance
                  </button>
                </>
              )}
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
              <button
                className="c-menu-item"
                onClick={() => { removeFrame(frame.id); ctxMenu.close() }}
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
