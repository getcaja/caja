import { useRef, useCallback, useMemo, memo } from 'react'
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useTreeDnd } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { TreeRow } from './TreeRow'
import { Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Link, Diamond, LayoutGrid, Icon, FileCodeCorner, Eye, EyeOff } from 'lucide-react'
import { layoutGridMoveHorizontal, layoutGridMoveVertical } from '@lucide/lab'
import type { BoxElement } from '../../types/frame'
import { FrameContextMenu } from '../shared/FrameContextMenu'

interface TreeNodeProps {
  frame: Frame
  depth: number
  parentId?: string | null
  index?: number
  isRoot?: boolean
  insideInstance?: boolean
}

export const TreeNode = memo(function TreeNode({ frame, depth, parentId = null, index = 0, isRoot = false, insideInstance = false }: TreeNodeProps) {
  const selectedId = useFrameStore((s) => s.selectedId)
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const collapsedIds = useFrameStore((s) => s.collapsedIds)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const toggleCollapse = useFrameStore((s) => s.toggleCollapse)
  const renameFrame = useFrameStore((s) => s.renameFrame)


  const { activeId, overId, overPosition, multiDragCount } = useTreeDnd()
  const { active: dndActive } = useDndContext()

  const nameEdit = useInlineEdit((v) => renameFrame(frame.id, v))
  const ctxMenu = useContextMenu()
  const rowRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedId === frame.id || selectedIds.has(frame.id)
  const isMulti = selectedIds.size > 1

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
  const boxIcon = frame.type === 'box'
    ? (frame as BoxElement).display === 'grid' ? <LayoutGrid size={12} />
    : (frame as BoxElement).display === 'flex' || (frame as BoxElement).display === 'inline-flex'
      ? (frame as BoxElement).direction === 'row' ? <Icon iconNode={layoutGridMoveHorizontal} size={12} /> : <Icon iconNode={layoutGridMoveVertical} size={12} />
    : <FrameIcon size={12} />
    : null

  const iconEl = isMaster ? <Diamond size={12} fill="currentColor" />
    : isInstance ? <Diamond size={12} />
    : isRoot && !editingComponentId ? <FileCodeCorner size={12} />
    : frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
    : frame.type === 'text' ? <Type size={12} />
    : frame.type === 'image' ? <ImageIcon size={12} />
    : frame.type === 'button' ? <RectangleHorizontal size={12} />
    : frame.type === 'input' ? <TextCursorInput size={12} />
    : frame.type === 'textarea' ? <AlignLeft size={12} />
    : frame.type === 'select' ? <ListCollapse size={12} />
    : boxIcon!

  // Icon color class
  const iconColor = isMaster || isInstance ? 'text-accent-text' : ''

  // Chevron state
  const chevron: 'expanded' | 'collapsed' | 'leaf' | 'none' = !isBox ? 'none'
    : hasChildren ? (isCollapsed ? 'collapsed' : 'expanded')
    : 'leaf'

  // Row className additions
  const rowClassName = [
    insideInstance ? 'text-accent-text!' : '',
  ].filter(Boolean).join(' ')

  // Visibility toggle
  const toggleHidden = useFrameStore((s) => s.toggleHidden)
  const isHidden = frame.hidden

  // Name display
  const displayName = isRoot && !editingComponentId ? 'Body' : frame.name
  const nameClass = isMaster || isInstance ? 'text-accent-text' : isHidden ? 'opacity-40' : ''

  // Drop position (only when hovered and not self-dragging)
  const dropPos = isOver && overPosition && activeId ? overPosition : null

  // Memoize handlers passed to TreeRow to preserve memo effectiveness
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) useFrameStore.getState().selectRange(frame.id)
    else if (e.metaKey) useFrameStore.getState().selectMulti(frame.id)
    else select(frame.id)
  }, [frame.id, select])

  const handleDoubleClick = useCallback(() => {
    if (isRoot) return
    nameEdit.start(frame.name)
  }, [isRoot, frame.name, nameEdit])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (isRoot) { e.preventDefault(); return }
    if (!useFrameStore.getState().selectedIds.has(frame.id)) select(frame.id)
    ctxMenu.open(e)
  }, [isRoot, frame.id, select, ctxMenu])

  const handleMouseEnter = useCallback(() => hover(frame.id, 'tree'), [frame.id, hover])
  const handleMouseLeave = useCallback(() => hover(null, 'tree'), [hover])

  // Responsive override badges — show which breakpoints have overrides
  const responsiveBadges = useMemo(() => {
    const resp = frame.responsive
    if (!resp) return null
    const bps: string[] = []
    if (resp.md && Object.keys(resp.md).length > 0) bps.push('SM')
    if (resp.xl && Object.keys(resp.xl).length > 0) bps.push('LG')
    if (bps.length === 0) return null
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        {bps.map((bp) => (
          <span key={bp} className="px-1 py-px text-[9px] leading-none font-medium rounded bg-accent/15 text-accent-text select-none uppercase">
            {bp}
          </span>
        ))}
      </span>
    )
  }, [frame.responsive])

  const handleToggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toggleHidden(frame.id)
  }, [frame.id, toggleHidden])

  const trailing = isRoot ? null : (
    <button
      className={`c-icon-btn shrink-0 ${isHidden ? 'is-active' : ''} ${isHidden ? '' : 'opacity-0 group-hover:opacity-100'}`}
      style={{ width: 20, height: 20 }}
      onClick={handleToggleHidden}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
    </button>
  )

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
        editing={!isRoot && nameEdit.editing}
        editValue={nameEdit.value}
        onEditChange={nameEdit.setValue}
        onEditCommit={nameEdit.commit}
        onEditCancel={nameEdit.cancel}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        chevron={chevron}
        onChevronClick={() => toggleCollapse(frame.id)}
        badges={responsiveBadges}
        trailing={trailing}
        isDragging={isDragging}
        dropPosition={dropPos}
        className={rowClassName}
        rowRef={setNodeRef}
        dndProps={{ ...listeners, ...attributes }}
      />

      {/* Right-click context menu (fixed position) */}
      {ctxMenu.backdrop}
      {ctxMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[180px] z-50"
          style={{ left: ctxMenu.menu.x, top: ctxMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <FrameContextMenu
            frameId={frame.id}
            close={ctxMenu.close}
          />
        </div>
      )}

      {/* Children */}
      {isBox && !isCollapsed &&
        frame.children.map((child, i) => (
          <TreeNode key={child.id} frame={child} depth={depth + 1} parentId={frame.id} index={i} insideInstance={insideInstance || isInstance} />
        ))}
    </>
  )
})
