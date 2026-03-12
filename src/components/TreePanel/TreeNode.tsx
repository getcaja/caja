import { useRef, useCallback, useMemo, memo, type ReactNode } from 'react'
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useHoverStore } from '../../store/hoverStore'
import { useTreeDnd } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { TreeRow } from './TreeRow'
import { Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Link, Diamond, LayoutGrid, Icon, FileCodeCorner, Eye, EyeOff } from 'lucide-react'
import { layoutGridMoveHorizontal, layoutGridMoveVertical } from '@lucide/lab'
import { BP_LABEL } from '../../types/frame'
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
  // Derived boolean selectors — avoid subscribing to full Set objects
  const isSelected = useFrameStore(useCallback((s) => s.selectedId === frame.id || s.selectedIds.has(frame.id), [frame.id]))
  const isMulti = useFrameStore((s) => s.selectedIds.size > 1)
  const isCollapsed = useFrameStore(useCallback((s) => s.collapsedIds.has(frame.id), [frame.id]))
  const isDragSelected = useFrameStore(useCallback((s) => s.selectedIds.has(frame.id), [frame.id]))
  const select = useFrameStore((s) => s.select)
  const hover = useHoverStore((s) => s.hover)
  const toggleCollapse = useFrameStore((s) => s.toggleCollapse)
  const renameFrame = useFrameStore((s) => s.renameFrame)

  const { activeId, overId, overPosition, multiDragCount } = useTreeDnd()
  const { active: dndActive } = useDndContext()

  const nameEdit = useInlineEdit((v) => renameFrame(frame.id, v))
  const ctxMenu = useContextMenu()
  const rowRef = useRef<HTMLDivElement>(null)

  const isBox = frame.type === 'box'
  const hasChildren = isBox && frame.children.length > 0
  const isDragging = dndActive !== null && (
    String(dndActive.id) === frame.id || (multiDragCount > 1 && isDragSelected)
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

  // Determine icon (memoized to preserve TreeRow memo)
  const display = isBox ? (frame as BoxElement).display : undefined
  const direction = isBox ? (frame as BoxElement).direction : undefined
  const tag = frame.type === 'text' && 'tag' in frame ? (frame as { tag?: string }).tag : undefined

  const iconEl: ReactNode = useMemo(() => {
    const boxIcon = isBox
      ? display === 'grid' ? <LayoutGrid size={12} />
      : display === 'flex' || display === 'inline-flex'
        ? direction === 'row' ? <Icon iconNode={layoutGridMoveHorizontal} size={12} /> : <Icon iconNode={layoutGridMoveVertical} size={12} />
      : <FrameIcon size={12} />
      : null

    const el = isMaster ? <Diamond size={12} fill="currentColor" />
      : isInstance ? <Diamond size={12} />
      : isRoot && !editingComponentId ? <FileCodeCorner size={12} />
      : frame.type === 'text' && tag === 'a' ? <Link size={12} />
      : frame.type === 'text' ? <Type size={12} />
      : frame.type === 'image' ? <ImageIcon size={12} />
      : frame.type === 'button' ? <RectangleHorizontal size={12} />
      : frame.type === 'input' ? <TextCursorInput size={12} />
      : frame.type === 'textarea' ? <AlignLeft size={12} />
      : frame.type === 'select' ? <ListCollapse size={12} />
      : boxIcon!

    const iconColor = isMaster || isInstance ? 'text-accent-text' : ''
    return <span className={iconColor}>{el}</span>
  }, [isBox, display, direction, frame.type, tag, isMaster, isInstance, isRoot, editingComponentId])

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
  const handleChevronClick = useCallback(() => toggleCollapse(frame.id), [frame.id, toggleCollapse])

  // Responsive override badges — show which breakpoints have overrides
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const responsiveBadges = useMemo(() => {
    const resp = frame.responsive
    if (!resp) return null
    const entries: { label: string; bp: string }[] = []
    if (resp.xl && Object.keys(resp.xl).length > 0) entries.push({ label: BP_LABEL.xl, bp: 'xl' })
    if (resp.md && Object.keys(resp.md).length > 0) entries.push({ label: BP_LABEL.md, bp: 'md' })
    if (entries.length === 0) return null
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        {entries.map(({ label, bp }) => (
          <span
            key={bp}
            className={`px-1 py-px text-[9px] leading-none font-medium rounded select-none uppercase ${
              activeBreakpoint === bp ? 'bg-accent text-white' : 'bg-accent/15 text-accent-text'
            }`}
          >
            {label}
          </span>
        ))}
      </span>
    )
  }, [frame.responsive, activeBreakpoint])

  const handleToggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toggleHidden(frame.id)
  }, [frame.id, toggleHidden])

  const stopDblClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  const trailing = useMemo(() => isRoot ? null : (
    <button
      className={`c-icon-btn shrink-0 ${isHidden ? 'is-active' : ''} ${isHidden ? '' : 'opacity-0 group-hover:opacity-100'}`}
      style={{ width: 20, height: 20 }}
      onClick={handleToggleHidden}
      onDoubleClick={stopDblClick}
    >
      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
    </button>
  ), [isRoot, isHidden, handleToggleHidden, stopDblClick])

  const dndProps = useMemo(() => ({ ...listeners, ...attributes }), [listeners, attributes])

  return (
    <>
      <TreeRow
        id={frame.id}
        depth={depth}
        icon={iconEl}
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
        onChevronClick={handleChevronClick}
        badges={responsiveBadges}
        trailing={trailing}
        isDragging={isDragging}
        dropPosition={dropPos}
        className={rowClassName}
        rowRef={setNodeRef}
        dndProps={dndProps}
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
