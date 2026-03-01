import { createContext, useContext, useRef, useCallback, useMemo } from 'react'
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useTreeDnd } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { useTreeMerge, type TreeMergeState } from './hooks/useTreeMerge'
import { TreeRow } from './TreeRow'
import { Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Copy, Trash2, Group, SquarePlus, Eye, EyeOff, Link, Bookmark, Diamond, Pencil, RotateCcw, Unlink } from 'lucide-react'

/* ── Tree merge context ─────────────────────────────────────
 * Wraps useTreeMerge with a React context so TreeNodes don't
 * each need to independently compute visible order. */

const EMPTY_MERGE: TreeMergeState = { mergeTop: new Set(), mergeBottom: new Set() }
const TreeMergeContext = createContext<TreeMergeState>(EMPTY_MERGE)

export function TreeMergeProvider({ children }: { children: React.ReactNode }) {
  const root = useFrameStore((s) => s.root)
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const collapsedIds = useFrameStore((s) => s.collapsedIds)

  const visibleOrder = useMemo(() => {
    const order: string[] = []
    function walk(frame: Frame) {
      if (frame.hidden) return
      order.push(frame.id)
      if (frame.type === 'box' && !collapsedIds.has(frame.id)) {
        for (const child of frame.children) walk(child)
      }
    }
    walk(root)
    return order
  }, [root, collapsedIds])

  const mergeState = useTreeMerge(selectedIds, visibleOrder)

  return <TreeMergeContext.Provider value={mergeState}>{children}</TreeMergeContext.Provider>
}

interface TreeNodeProps {
  frame: Frame
  depth: number
  parentId?: string | null
  index?: number
  isRoot?: boolean
  insideInstance?: boolean
}

export function TreeNode({ frame, depth, parentId = null, index = 0, isRoot = false, insideInstance = false }: TreeNodeProps) {
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

  const { activeId, overId, overPosition, multiDragCount } = useTreeDnd()
  const { active: dndActive } = useDndContext()

  const nameEdit = useInlineEdit((v) => renameFrame(frame.id, v))
  const ctxMenu = useContextMenu()
  const rowRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedId === frame.id || selectedIds.has(frame.id)
  const isMulti = selectedIds.size > 1
  const merge = useContext(TreeMergeContext)

  const isBox = frame.type === 'box'
  const hasChildren = isBox && frame.children.length > 0
  const isCollapsed = collapsedIds.has(frame.id)
  const isDragging = dndActive !== null && (
    String(dndActive.id) === frame.id || (multiDragCount > 1 && selectedIds.has(frame.id))
  )
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
      ;(rowRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement | null
    },
    [setDraggableRef, setDroppableRef],
  )

  // Determine icon
  const iconEl = isMaster ? <Diamond size={12} fill="currentColor" />
    : isInstance ? <Diamond size={12} />
    : frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
    : frame.type === 'text' ? <Type size={12} />
    : frame.type === 'image' ? <ImageIcon size={12} />
    : frame.type === 'button' ? <RectangleHorizontal size={12} />
    : frame.type === 'input' ? <TextCursorInput size={12} />
    : frame.type === 'textarea' ? <AlignLeft size={12} />
    : frame.type === 'select' ? <ListCollapse size={12} />
    : <FrameIcon size={12} />

  // Icon color class
  const iconColor = isMaster || isInstance ? 'text-purple-400' : ''

  // Chevron state
  const chevron: 'expanded' | 'collapsed' | 'leaf' | 'none' = !isBox ? 'none'
    : hasChildren ? (isCollapsed ? 'collapsed' : 'expanded')
    : 'leaf'

  // Row className additions
  const rowClassName = [
    frame.hidden ? 'opacity-40' : '',
    insideInstance ? 'text-purple-400!' : '',
  ].filter(Boolean).join(' ')

  // Name display
  const displayName = isRoot && !editingComponentId ? 'Body' : frame.name
  const nameClass = isMaster || isInstance ? 'text-purple-400' : ''

  // Drop position (only when hovered and not self-dragging)
  const dropPos = isOver && overPosition && activeId ? overPosition : null

  // Visibility button as trailing
  const trailing = !isRoot ? (
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
  ) : undefined

  return (
    <>
      <TreeRow
        id={frame.id}
        depth={depth}
        icon={<span className={iconColor}>{iconEl}</span>}
        name={displayName}
        nameClassName={nameClass}
        isSelected={isSelected}
        isMulti={isMulti}
        mergeTop={merge.mergeTop.has(frame.id)}
        mergeBottom={merge.mergeBottom.has(frame.id)}
        editing={!isRoot && nameEdit.editing}
        editValue={nameEdit.value}
        onEditChange={nameEdit.setValue}
        onEditCommit={nameEdit.commit}
        onEditCancel={nameEdit.cancel}
        onClick={(e) => {
          if (e.shiftKey) useFrameStore.getState().selectRange(frame.id)
          else if (e.metaKey) useFrameStore.getState().selectMulti(frame.id)
          else select(frame.id)
        }}
        onDoubleClick={() => {
          if (isRoot) return
          if (isInstance && frame._componentId) {
            useFrameStore.getState().enterComponentEditMode(frame._componentId)
            return
          }
          nameEdit.start(frame.name)
        }}
        onContextMenu={(e) => {
          if (!selectedIds.has(frame.id)) select(frame.id)
          ctxMenu.open(e)
        }}
        onMouseEnter={() => hover(frame.id)}
        onMouseLeave={() => hover(null)}
        chevron={chevron}
        onChevronClick={() => toggleCollapse(frame.id)}
        trailing={trailing}
        isDragging={isDragging}
        dropPosition={dropPos}
        className={rowClassName}
        rowRef={setNodeRef}
        dndProps={{ ...listeners, ...attributes }}
        colorDot={frame.bg?.value || undefined}
      />

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
                onClick={() => {
                  if (selectedIds.size > 1) {
                    useFrameStore.getState().wrapSelectedInFrame()
                  } else {
                    wrapInFrame(frame.id)
                  }
                  ctxMenu.close()
                }}
              >
                <Group size={12} /> Group
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
          <TreeNode key={child.id} frame={child} depth={depth + 1} parentId={frame.id} index={i} insideInstance={insideInstance || isInstance} />
        ))}
    </>
  )
}
