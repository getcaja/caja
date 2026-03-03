import { useRef, useCallback, useMemo } from 'react'
import { useDraggable, useDroppable, useDndContext } from '@dnd-kit/core'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useTreeDnd } from './TreeDndContext'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { TreeRow } from './TreeRow'
import { Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse, Eye, EyeOff, Link, Diamond, FileText } from 'lucide-react'
import { FrameContextMenu } from '../shared/FrameContextMenu'

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
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const toggleHidden = useFrameStore((s) => s.toggleHidden)

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
  const iconEl = isMaster ? <Diamond size={12} fill="currentColor" />
    : isInstance ? <Diamond size={12} />
    : isRoot ? <FileText size={12} />
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

  // Responsive override badges — show which breakpoints have overrides
  const responsiveBadges = useMemo(() => {
    const resp = frame.responsive
    if (!resp) return null
    const bps: string[] = []
    if (resp.md && Object.keys(resp.md).length > 0) bps.push('md')
    if (resp.sm && Object.keys(resp.sm).length > 0) bps.push('sm')
    if (bps.length === 0) return null
    return (
      <span className="flex items-center gap-0.5 shrink-0">
        {bps.map((bp) => (
          <span key={bp} className="px-1 py-px text-[9px] leading-none font-medium rounded bg-surface-3/50 text-text-muted select-none">
            {bp}
          </span>
        ))}
      </span>
    )
  }, [frame.responsive])

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
          nameEdit.start(frame.name)
        }}
        onContextMenu={(e) => {
          if (isRoot) { e.preventDefault(); return }
          if (!selectedIds.has(frame.id)) select(frame.id)
          ctxMenu.open(e)
        }}
        onMouseEnter={() => hover(frame.id)}
        onMouseLeave={() => hover(null)}
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
}
