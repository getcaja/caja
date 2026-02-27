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
import type { Frame } from '../../types/frame'
import {
  Square, Type, ImageIcon, RectangleHorizontal,
  TextCursorInput, AlignLeft, ListCollapse, Link,
} from 'lucide-react'
import { computeZone, closestByY, type DropPosition } from './dndUtils'

export type { DropPosition } from './dndUtils'

interface TreeDndState {
  activeId: string | null
  overId: string | null
  overPosition: DropPosition | null
}

const TreeDndCtx = createContext<TreeDndState>({
  activeId: null,
  overId: null,
  overPosition: null,
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

function DragGhost({ id }: { id: string }) {
  const root = useFrameStore((s) => s.root)
  const frame = findInTree(root, id)
  if (!frame) return null

  const icon =
    frame.type === 'text' && 'tag' in frame && frame.tag === 'a' ? <Link size={12} />
    : frame.type === 'text' ? <Type size={12} />
    : frame.type === 'image' ? <ImageIcon size={12} />
    : frame.type === 'button' ? <RectangleHorizontal size={12} />
    : frame.type === 'input' ? <TextCursorInput size={12} />
    : frame.type === 'textarea' ? <AlignLeft size={12} />
    : frame.type === 'select' ? <ListCollapse size={12} />
    : <Square size={12} />

  return (
    <div className="flex items-center gap-1.5 py-1 px-2 bg-surface-2 rounded-md text-text-primary text-[12px] shadow-lg border border-border pointer-events-none" style={{ opacity: 0.6 }}>
      <span className="shrink-0 text-text-muted">{icon}</span>
      <span className="truncate max-w-[140px]">{frame.name}</span>
    </div>
  )
}

/* ── Provider ────────────────────────────────────────────── */

export function TreeDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TreeDndState>({
    activeId: null,
    overId: null,
    overPosition: null,
  })

  // Tracks last computed zone for hysteresis (updated inside collision detection)
  const lastZoneRef = useRef<{ id: string; zone: DropPosition } | null>(null)

  // Cached active frame node — set once on drag start, avoids findInTree on every move
  const activeNodeRef = useRef<Frame | null>(null)

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
      const activeNode = activeNodeRef.current

      const best = closestByY(
        droppableContainers as DroppableContainer[],
        droppableRects,
        pointerCoordinates,
        activeIdStr,
        (cid) => !!activeNode && isDescendant(activeNode, cid),
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
    // Cache the active node so collision detection can skip descendants without tree walks
    const root = useFrameStore.getState().root
    activeNodeRef.current = root ? findInTree(root, id) : null
    overRef.current = { id: null, position: null }
    setState({ activeId: id, overId: null, overPosition: null })
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

    // Clear state
    setState({ activeId: null, overId: null, overPosition: null })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null
    activeNodeRef.current = null

    if (!over || !lastZone) return

    // Consistency: zone and target must come from the same collision result.
    // If they diverged (race between collision runs), cancel — better than a wrong move.
    const targetId = lastZone.id
    if (String(over.id) !== targetId) return

    const zone = lastZone.zone
    const dragId = String(active.id)
    if (dragId === targetId) return

    // Safety net: validate no descendant drop
    const { root, moveFrame } = useFrameStore.getState()
    if (!root) return
    const dragNode = findInTree(root, dragId)
    if (dragNode && isDescendant(dragNode, targetId)) return

    const targetData = over.data.current as
      | { parentId: string | null; index: number; isBox: boolean }
      | undefined
    if (!targetData) return

    if (zone === 'inside' && targetData.isBox) {
      const targetFrame = findInTree(root, targetId)
      const childCount = targetFrame?.type === 'box' ? targetFrame.children.length : 0
      moveFrame(dragId, targetId, childCount)
    } else if (zone === 'before' && targetData.parentId) {
      let idx = targetData.index
      // Same-parent adjustment: moveInTree extracts the dragged node first,
      // shifting all subsequent siblings' indices down by 1.
      const dragParent = findParent(root, dragId)
      if (dragParent && dragParent.id === targetData.parentId) {
        const dragIdx = dragParent.children.findIndex((c) => c.id === dragId)
        if (dragIdx >= 0 && dragIdx < targetData.index) idx -= 1
      }
      moveFrame(dragId, targetData.parentId, idx)
    } else if (zone === 'after' && targetData.parentId) {
      let idx = targetData.index + 1
      const dragParent = findParent(root, dragId)
      if (dragParent && dragParent.id === targetData.parentId) {
        const dragIdx = dragParent.children.findIndex((c) => c.id === dragId)
        if (dragIdx >= 0 && dragIdx < idx) idx -= 1
      }
      moveFrame(dragId, targetData.parentId, idx)
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setState({ activeId: null, overId: null, overPosition: null })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null
    activeNodeRef.current = null
  }, [])

  /* ── Context value (stable when state hasn't changed) ─── */

  const ctxValue = useMemo<TreeDndState>(
    () => ({ activeId: state.activeId, overId: state.overId, overPosition: state.overPosition }),
    [state.activeId, state.overId, state.overPosition],
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
        {state.activeId ? <DragGhost id={state.activeId} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
