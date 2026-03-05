import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  MeasuringStrategy,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core'
import { useFrameStore, findInTree, findParent } from '../../store/frameStore'
import type { Frame, BoxElement } from '../../types/frame'
import {
  Frame as FrameIcon, Type, ImageIcon, RectangleHorizontal,
  TextCursorInput, AlignLeft, ListCollapse, Link, LayoutGrid,
} from 'lucide-react'
import { FlexColumnIcon, FlexRowIcon } from '../icons/LayoutIcons'
import { computeZone, closestByY, type DropPosition } from './dndUtils'

export type { DropPosition } from './dndUtils'

interface TreeDndState {
  activeId: string | null
  overId: string | null
  overPosition: DropPosition | null
  multiDragCount: number
}

const TreeDndCtx = createContext<TreeDndState>({
  activeId: null,
  overId: null,
  overPosition: null,
  multiDragCount: 0,
})

export function useTreeDnd() {
  return useContext(TreeDndCtx)
}

export function isDescendant(frame: Frame, targetId: string): boolean {
  if (frame.id === targetId) return true
  if (frame.type === 'box') {
    return frame.children.some((c) => isDescendant(c, targetId))
  }
  return false
}

/* ── Drag ghost overlay ─────────────────────────────────── */

function DragGhost({ id, count }: { id: string; count: number }) {
  const root = useFrameStore((s) => s.root)
  const frame = findInTree(root, id)
  if (!frame) return null

  const boxIcon = frame.type === 'box'
    ? (frame as BoxElement).display === 'grid' ? <LayoutGrid size={12} />
    : (frame as BoxElement).display === 'flex' || (frame as BoxElement).display === 'inline-flex'
      ? (frame as BoxElement).direction === 'row' ? <FlexRowIcon size={12} /> : <FlexColumnIcon size={12} />
    : <FrameIcon size={12} />
    : null

  const icon =
    frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
    : frame.type === 'text' ? <Type size={12} />
    : frame.type === 'image' ? <ImageIcon size={12} />
    : frame.type === 'button' ? <RectangleHorizontal size={12} />
    : frame.type === 'input' ? <TextCursorInput size={12} />
    : frame.type === 'textarea' ? <AlignLeft size={12} />
    : frame.type === 'select' ? <ListCollapse size={12} />
    : boxIcon ?? <FrameIcon size={12} />

  return (
    <div className="flex items-center gap-1.5 py-1 px-2 bg-inset rounded-md fg-default text-[12px] shadow-lg border border-border pointer-events-none" style={{ opacity: 0.6 }}>
      <span className="shrink-0 fg-icon-subtle">{icon}</span>
      <span className="truncate max-w-[140px]">{frame.name}</span>
      {count > 1 && (
        <span className="shrink-0 bg-accent text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{count}</span>
      )}
    </div>
  )
}

/* ── Provider ────────────────────────────────────────────── */

export function TreeDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TreeDndState>({
    activeId: null,
    overId: null,
    overPosition: null,
    multiDragCount: 0,
  })

  // Tracks last computed zone for hysteresis (updated inside collision detection)
  const lastZoneRef = useRef<{ id: string; zone: DropPosition } | null>(null)

  // Cached active frame node — set once on drag start, avoids findInTree on every move
  const activeNodeRef = useRef<Frame | null>(null)

  // Multi-drag: all IDs being dragged + their cached Frame nodes (for descendant checks)
  const multiDragIdsRef = useRef<Set<string>>(new Set())
  const multiDragNodesRef = useRef<Frame[]>([])

  // Mirror of state.overId/overPosition for equality checks in callbacks without stale closures
  const overRef = useRef<{ id: string | null; position: DropPosition | null }>({
    id: null,
    position: null,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // Re-measure droppable rects every render while dragging — keeps rects fresh during scroll
  const measuring = useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.Always },
  }), [])

  /* ── Custom collision detection (closest-by-Y) ─────────── */

  const collisionDetection: CollisionDetection = useCallback(
    ({ active, droppableContainers, droppableRects, pointerCoordinates }) => {
      if (!pointerCoordinates) return []

      const activeIdStr = String(active.id)
      const dragIds = multiDragIdsRef.current
      const dragNodes = multiDragNodesRef.current

      const best = closestByY(
        droppableContainers as DroppableContainer[],
        droppableRects,
        pointerCoordinates,
        activeIdStr,
        (cid) => {
          // Skip all multi-drag items
          if (dragIds.has(cid)) return true
          // Skip descendants of any multi-drag item
          for (const node of dragNodes) {
            if (isDescendant(node, cid)) return true
          }
          return false
        },
      )

      if (!best) {
        lastZoneRef.current = null
        return []
      }

      // Ignore if pointer is horizontally outside the tree panel (with tolerance)
      const px = pointerCoordinates.x
      if (px < best.rect.left - 20 || px > best.rect.left + best.rect.width + 20) {
        lastZoneRef.current = null
        return []
      }

      const cid = String(best.container.id)
      const zone = computeZone(cid, best.rect, pointerCoordinates.y, best.container.data.current ?? {}, lastZoneRef.current)

      lastZoneRef.current = { id: cid, zone }

      return [
        {
          id: best.container.id,
          data: {
            droppableContainer: best.container,
            value: 0,
            zone,
          },
        },
      ]
    },
    [],
  )

  /* ── Event handlers ────────────────────────────────────── */

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const id = String(active.id)
    const store = useFrameStore.getState()
    const root = store.root

    // Determine multi-drag: dragged item must be in the multi-selection, all top-level must be siblings
    let dragIds: Set<string>
    const { selectedIds } = store

    if (selectedIds.size > 1 && selectedIds.has(id)) {
      // Filter to top-level selections: items whose parent is NOT also selected
      // (children of selected parents move naturally with their parent)
      const topLevel = new Set<string>()
      for (const sid of selectedIds) {
        const p = findParent(root, sid)
        if (!p || !selectedIds.has(p.id)) topLevel.add(sid)
      }

      const parents = new Set<string>()
      for (const sid of topLevel) {
        const p = findParent(root, sid)
        if (p) parents.add(p.id)
      }
      if (parents.size === 1 && topLevel.size > 0) {
        dragIds = topLevel
      } else {
        // Not all siblings — narrow to single
        store.select(id)
        dragIds = new Set([id])
      }
    } else {
      if (selectedIds.size > 1) store.select(id)
      dragIds = new Set([id])
    }

    // Cache multi-drag state for collision detection and drag end
    multiDragIdsRef.current = dragIds
    const nodes: Frame[] = []
    for (const did of dragIds) {
      const node = findInTree(root, did)
      if (node) nodes.push(node)
    }
    multiDragNodesRef.current = nodes
    activeNodeRef.current = findInTree(root, id)

    overRef.current = { id: null, position: null }
    setState({ activeId: id, overId: null, overPosition: null, multiDragCount: dragIds.size })
  }, [])

  const updateOver = useCallback((id: string | null, position: DropPosition | null) => {
    if (overRef.current.id === id && overRef.current.position === position) return
    overRef.current = { id, position }
    setState((prev) => {
      if (prev.overId === id && prev.overPosition === position) return prev
      return { ...prev, overId: id, overPosition: position }
    })
  }, [])

  const handleDragMove = useCallback(
    ({ collisions }: DragMoveEvent) => {
      if (!collisions?.length) {
        updateOver(null, null)
        return
      }

      const collision = collisions[0]
      const targetId = String(collision.id)
      const zone = (collision.data as Record<string, unknown>)?.zone as DropPosition | undefined

      if (!zone) {
        updateOver(null, null)
        return
      }

      // Collision detection already filters active + descendants, so just forward
      updateOver(targetId, zone)
    },
    [updateOver],
  )

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const lastZone = lastZoneRef.current
    const dragIds = multiDragIdsRef.current
    const isMulti = dragIds.size > 1

    // Clear state
    setState({ activeId: null, overId: null, overPosition: null, multiDragCount: 0 })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null
    activeNodeRef.current = null
    multiDragIdsRef.current = new Set()
    multiDragNodesRef.current = []

    if (!over || !lastZone) return

    const targetId = lastZone.id
    if (String(over.id) !== targetId) return

    const zone = lastZone.zone
    const dragId = String(active.id)
    if (dragIds.has(targetId)) return

    // Safety net: validate no descendant drop
    const store = useFrameStore.getState()
    const { root } = store
    if (!root) return
    for (const did of dragIds) {
      const node = findInTree(root, did)
      if (node && isDescendant(node, targetId)) return
    }

    const targetData = over.data.current as
      | { parentId: string | null; index: number; isBox: boolean }
      | undefined
    if (!targetData) return

    if (isMulti) {
      // Multi-drag: compute visual index, moveFrames adjusts internally
      let targetParentId: string
      let visualIdx: number

      if (zone === 'inside' && targetData.isBox) {
        targetParentId = targetId
        const targetFrame = findInTree(root, targetId)
        visualIdx = targetFrame?.type === 'box' ? targetFrame.children.length : 0
      } else if (zone === 'before' && targetData.parentId) {
        targetParentId = targetData.parentId
        visualIdx = targetData.index
      } else if (zone === 'after' && targetData.parentId) {
        targetParentId = targetData.parentId
        visualIdx = targetData.index + 1
      } else {
        return
      }

      store.moveFrames([...dragIds], targetParentId, visualIdx)
    } else {
      // Single drag: existing logic with same-parent index adjustment
      if (zone === 'inside' && targetData.isBox) {
        const targetFrame = findInTree(root, targetId)
        const childCount = targetFrame?.type === 'box' ? targetFrame.children.length : 0
        store.moveFrame(dragId, targetId, childCount)
      } else if (zone === 'before' && targetData.parentId) {
        let idx = targetData.index
        const dragParent = findParent(root, dragId)
        if (dragParent && dragParent.id === targetData.parentId) {
          const dragIdx = dragParent.children.findIndex((c) => c.id === dragId)
          if (dragIdx >= 0 && dragIdx < targetData.index) idx -= 1
        }
        store.moveFrame(dragId, targetData.parentId, idx)
      } else if (zone === 'after' && targetData.parentId) {
        let idx = targetData.index + 1
        const dragParent = findParent(root, dragId)
        if (dragParent && dragParent.id === targetData.parentId) {
          const dragIdx = dragParent.children.findIndex((c) => c.id === dragId)
          if (dragIdx >= 0 && dragIdx < idx) idx -= 1
        }
        store.moveFrame(dragId, targetData.parentId, idx)
      }
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setState({ activeId: null, overId: null, overPosition: null, multiDragCount: 0 })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null
    activeNodeRef.current = null
    multiDragIdsRef.current = new Set()
    multiDragNodesRef.current = []
  }, [])

  /* ── Context value (stable when state hasn't changed) ─── */

  const ctxValue = useMemo<TreeDndState>(
    () => ({ activeId: state.activeId, overId: state.overId, overPosition: state.overPosition, multiDragCount: state.multiDragCount }),
    [state.activeId, state.overId, state.overPosition, state.multiDragCount],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <TreeDndCtx.Provider value={ctxValue}>
        {children}
      </TreeDndCtx.Provider>

      <DragOverlay dropAnimation={null}>
        {state.activeId ? <DragGhost id={state.activeId} count={state.multiDragCount} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
