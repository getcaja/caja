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
import { useFrameStore } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { resolveCanvasDrop } from '../../utils/canvasDrop'
import { computeZone, closestByY, type DropPosition } from './dndUtils'
import { Code, Folder } from 'lucide-react'

/* ── Context ──────────────────────────────────────────────── */

interface WorkspaceDndState {
  activeId: string | null
  activeType: 'pattern' | 'category' | null
  overId: string | null
  overPosition: DropPosition | null
}

const WorkspaceDndCtx = createContext<WorkspaceDndState>({
  activeId: null,
  activeType: null,
  overId: null,
  overPosition: null,
})

export function useWorkspaceDnd() {
  return useContext(WorkspaceDndCtx)
}

/* ── Drag ghost overlay ─────────────────────────────────── */

function PatternDragGhost({ id }: { id: string }) {
  const isCategory = id.startsWith('__cat:')
  const label = isCategory ? id.slice('__cat:'.length) : null

  const patternName = useCatalogStore((s) => {
    if (isCategory) return null
    const internal = s.patterns.find((p) => p.id === id)
    if (internal) return internal.name
    for (const [, lib] of s.libraries) {
      const p = lib.items?.find((p) => p.id === id)
      if (p) return p.name
    }
    return null
  })

  const name = label ?? patternName ?? id

  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 bg-surface-2 rounded-md text-text-primary text-[12px] shadow-lg border border-border pointer-events-none"
      style={{ opacity: 0.6 }}
    >
      <span className="shrink-0 text-text-muted">
        {isCategory ? <Folder size={12} /> : <Code size={12} />}
      </span>
      <span className="truncate max-w-[140px]">{name}</span>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────── */

function isInsideCanvas(px: number, py: number): boolean {
  const canvas = document.getElementById('caja-canvas')
  if (!canvas) return false
  const rect = canvas.getBoundingClientRect()
  return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom
}

function resolvePatternCanvasDrop(px: number, py: number) {
  const root = useFrameStore.getState().root
  return resolveCanvasDrop(document, px, py, '__snippet__', root, null)
}

/* ── Provider ────────────────────────────────────────────── */

export function WorkspaceDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceDndState>({
    activeId: null,
    activeType: null,
    overId: null,
    overPosition: null,
  })

  const lastZoneRef = useRef<{ id: string; zone: DropPosition } | null>(null)
  const overRef = useRef<{ id: string | null; position: DropPosition | null }>({
    id: null,
    position: null,
  })
  const resolveRafRef = useRef(0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const measuring = useMemo(() => ({
    droppable: { strategy: MeasuringStrategy.Always },
  }), [])

  /* ── Collision detection ────────────────────────────────── */

  const collisionDetection: CollisionDetection = useCallback(
    ({ active, droppableContainers, droppableRects, pointerCoordinates }) => {
      if (!pointerCoordinates) return []

      const aType = (active.data.current as Record<string, unknown> | undefined)?.type as string | undefined

      // Pattern/category drags: check if pointer is over canvas
      if ((aType === 'pattern' || aType === 'category') && isInsideCanvas(pointerCoordinates.x, pointerCoordinates.y)) {
        return []  // canvas hit — handled in onDragMove
      }

      // Panel collision: closestByY + computeZone logic
      const activeIdStr = String(active.id)
      const isActiveCat = activeIdStr.startsWith('__cat:')

      const validContainers = (droppableContainers as DroppableContainer[]).filter((c) => {
        const cid = String(c.id)
        if (cid === activeIdStr) return false
        const data = c.data.current as Record<string, unknown> | undefined
        const type = data?.type as string | undefined
        if (isActiveCat) {
          return type === 'category'
        }
        return type === 'pattern' || type === 'category' || type === 'root'
      })

      const best = closestByY(
        validContainers,
        droppableRects,
        pointerCoordinates,
        activeIdStr,
      )

      if (!best) {
        lastZoneRef.current = null
        return []
      }

      const px = pointerCoordinates.x
      if (px < best.rect.left - 20 || px > best.rect.left + best.rect.width + 20) {
        lastZoneRef.current = null
        return []
      }

      const cid = String(best.container.id)
      const data = best.container.data.current ?? {}
      const zone = computeZone(cid, best.rect, pointerCoordinates.y, data as Record<string, unknown>, lastZoneRef.current)

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

  const updateOver = useCallback((id: string | null, position: DropPosition | null) => {
    if (overRef.current.id === id && overRef.current.position === position) return
    overRef.current = { id, position }
    setState((prev) => {
      if (prev.overId === id && prev.overPosition === position) return prev
      return { ...prev, overId: id, overPosition: position }
    })
  }, [])

  const cleanupDrag = useCallback(() => {
    cancelAnimationFrame(resolveRafRef.current)
    resolveRafRef.current = 0

    setState({ activeId: null, activeType: null, overId: null, overPosition: null })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null

    const store = useFrameStore.getState()
    store.setCanvasDrag(null)
    store.setCanvasDragOver(null)
    store.setPatternDragFrame(null)
  }, [])

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const id = String(active.id)
    const data = active.data.current as Record<string, unknown> | undefined
    const type = (data?.type as 'pattern' | 'category') ?? null

    overRef.current = { id: null, position: null }

    if (type === 'pattern') {
      // Pattern drag — set patternDragFrame for canvas insertion
      const catalog = useCatalogStore.getState()
      const internalPatterns = catalog.allPatterns()

      let pattern = internalPatterns.find((p) => p.id === id)
      let origin: { libraryId?: string; patternId?: string } | undefined

      if (pattern) {
        origin = { libraryId: 'internal', patternId: pattern.id }
      } else {
        for (const [libId, lib] of catalog.libraries) {
          const found = lib.items?.find((p) => p.id === id)
          if (found) {
            pattern = found
            origin = { libraryId: libId, patternId: found.id }
            break
          }
        }
      }

      if (pattern && origin) {
        useFrameStore.getState().setPatternDragFrame(pattern.frame, origin)
      }
    }
    // category: no special start logic

    setState({ activeId: id, activeType: type, overId: null, overPosition: null })
  }, [])

  const handleDragMove = useCallback(
    ({ active, collisions, activatorEvent, delta }: DragMoveEvent) => {
      const data = active.data.current as Record<string, unknown> | undefined
      const aType = data?.type as string | undefined

      // Compute current pointer position from activation point + delta
      const ae = activatorEvent as PointerEvent
      const px = ae.clientX + delta.x
      const py = ae.clientY + delta.y

      if (aType === 'pattern' || aType === 'category') {
        // Check if pointer is over canvas
        if (isInsideCanvas(px, py)) {
          const store = useFrameStore.getState()
          if (!store.canvasDragId && aType === 'pattern') {
            store.setCanvasDrag('__snippet__')
          }

          if (aType === 'pattern') {
            cancelAnimationFrame(resolveRafRef.current)
            resolveRafRef.current = requestAnimationFrame(() => {
              const result = resolvePatternCanvasDrop(px, py)
              useFrameStore.getState().setCanvasDragOver(result)
            })
          }

          // Clear panel over state
          updateOver(null, null)
          return
        }

        // Left canvas — clear canvas state if we were in it
        const store = useFrameStore.getState()
        if (store.canvasDragId) {
          store.setCanvasDrag(null)
          store.setCanvasDragOver(null)
        }
      }

      // Panel collisions
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

      updateOver(targetId, zone)
    },
    [updateOver],
  )

  const handleDragEnd = useCallback(({ active, activatorEvent, delta }: DragEndEvent) => {
    const lastZone = lastZoneRef.current
    const dragId = String(active.id)
    const data = active.data.current as Record<string, unknown> | undefined
    const aType = data?.type as string | undefined

    // Compute final pointer position
    const ae = activatorEvent as PointerEvent
    const px = ae.clientX + delta.x
    const py = ae.clientY + delta.y

    // Cancel any pending rAF
    cancelAnimationFrame(resolveRafRef.current)

    const store = useFrameStore.getState()
    const { patternDragFrame, patternDragOrigin } = store

    // Pattern canvas drop: synchronous resolve at final position
    if (aType === 'pattern' && patternDragFrame && isInsideCanvas(px, py)) {
      const result = resolvePatternCanvasDrop(px, py)
      cleanupDrag()
      if (result) {
        store.insertFrameAt(result.parentId, patternDragFrame, result.index, patternDragOrigin ?? undefined)
      }
      return
    }

    cleanupDrag()

    // Panel drop (pattern/category reorder)
    if (!lastZone) return
    const targetId = lastZone.id
    const zone = lastZone.zone
    if (dragId === targetId) return

    const isActiveCat = dragId.startsWith('__cat:')
    const isTargetCat = targetId.startsWith('__cat:')
    const isTargetRoot = targetId === '__patterns_root__'

    const catalog = useCatalogStore.getState()

    if (isActiveCat) {
      if (isTargetCat) {
        const dragTag = dragId.slice('__cat:'.length)
        const targetTag = targetId.slice('__cat:'.length)
        if (zone === 'inside') {
          catalog.moveCategory(dragTag, targetTag, 'after')
        } else {
          catalog.moveCategory(dragTag, targetTag, zone as 'before' | 'after')
        }
      }
    } else {
      if (isTargetRoot && zone === 'inside') {
        catalog.updatePatternTags(dragId, [])
        const all = catalog.allPatterns()
        const uncategorized = all.filter((s) => s.tags.length === 0)
        const last = uncategorized.length > 0 ? uncategorized[uncategorized.length - 1].id : null
        if (last && last !== dragId) {
          catalog.movePattern(dragId, last, 'after')
        }
      } else if (isTargetCat && zone === 'inside') {
        const targetTag = targetId.slice('__cat:'.length)
        const all = catalog.allPatterns()
        const items = all.filter((s) => s.tags[0] === targetTag)
        const last = items.length > 0 ? items[items.length - 1].id : null
        if (last && last !== dragId) {
          catalog.movePattern(dragId, last, 'after')
        }
        catalog.updatePatternTags(dragId, [targetTag])
      } else if (isTargetCat) {
        const targetTag = targetId.slice('__cat:'.length)
        const all = catalog.allPatterns()
        const items = all.filter((s) => s.tags[0] === targetTag)
        if (zone === 'before' && items.length > 0) {
          catalog.movePattern(dragId, items[0].id, 'before')
        } else if (zone === 'after' && items.length > 0) {
          catalog.movePattern(dragId, items[items.length - 1].id, 'after')
        }
      } else {
        catalog.movePattern(dragId, targetId, zone as 'before' | 'after')
      }
    }
  }, [cleanupDrag])

  const handleDragCancel = useCallback(() => {
    cleanupDrag()
  }, [cleanupDrag])

  /* ── Context value ─────────────────────────────────────── */

  const ctxValue = useMemo<WorkspaceDndState>(
    () => ({
      activeId: state.activeId,
      activeType: state.activeType,
      overId: state.overId,
      overPosition: state.overPosition,
    }),
    [state.activeId, state.activeType, state.overId, state.overPosition],
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
      <WorkspaceDndCtx.Provider value={ctxValue}>
        {children}
      </WorkspaceDndCtx.Provider>

      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        {state.activeType === 'pattern' || state.activeType === 'category'
          ? state.activeId ? <PatternDragGhost id={state.activeId} /> : null
          : null}
      </DragOverlay>
    </DndContext>
  )
}
