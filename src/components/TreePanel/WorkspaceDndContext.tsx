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
  activeType: 'component' | 'category' | null
  overId: string | null
  overPosition: DropPosition | null
  multiDragCount: number
}

const WorkspaceDndCtx = createContext<WorkspaceDndState>({
  activeId: null,
  activeType: null,
  overId: null,
  overPosition: null,
  multiDragCount: 0,
})

export function useWorkspaceDnd() {
  return useContext(WorkspaceDndCtx)
}

/* ── Drag ghost overlay ─────────────────────────────────── */

function ComponentDragGhost({ id, count }: { id: string; count: number }) {
  const isCategory = id.startsWith('__cat:')
  const label = isCategory ? id.slice('__cat:'.length) : null

  const componentName = useCatalogStore((s) => {
    if (isCategory) return null
    const internal = s.components.find((p) => p.id === id)
    if (internal) return internal.name
    for (const [, lib] of s.libraries) {
      const p = lib.items?.find((p) => p.id === id)
      if (p) return p.name
    }
    return null
  })

  const name = label ?? componentName ?? id

  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 bg-surface-2 rounded-md text-text-primary text-[12px] shadow-lg border border-border pointer-events-none"
      style={{ opacity: 0.6 }}
    >
      <span className="shrink-0 text-text-muted">
        {isCategory ? <Folder size={12} /> : <Code size={12} />}
      </span>
      <span className="truncate max-w-[140px]">{name}</span>
      {count > 1 && (
        <span className="shrink-0 bg-accent text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{count}</span>
      )}
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

function resolveComponentCanvasDrop(px: number, py: number) {
  const root = useFrameStore.getState().root
  return resolveCanvasDrop(document, px, py, '__component__', root, null)
}

/* ── Provider ────────────────────────────────────────────── */

export function WorkspaceDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceDndState>({
    activeId: null,
    activeType: null,
    overId: null,
    overPosition: null,
    multiDragCount: 0,
  })

  const lastZoneRef = useRef<{ id: string; zone: DropPosition } | null>(null)
  const overRef = useRef<{ id: string | null; position: DropPosition | null }>({
    id: null,
    position: null,
  })
  const resolveRafRef = useRef(0)
  const multiDragIdsRef = useRef<Set<string>>(new Set())

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

      // Component/category drags: check if pointer is over canvas
      if ((aType === 'component' || aType === 'category') && isInsideCanvas(pointerCoordinates.x, pointerCoordinates.y)) {
        return []  // canvas hit — handled in onDragMove
      }

      // Panel collision: closestByY + computeZone logic
      const activeIdStr = String(active.id)
      const isActiveCat = activeIdStr.startsWith('__cat:')
      const dragIds = multiDragIdsRef.current

      const validContainers = (droppableContainers as DroppableContainer[]).filter((c) => {
        const cid = String(c.id)
        if (cid === activeIdStr) return false
        // Skip all multi-drag items
        if (dragIds.size > 1 && dragIds.has(cid)) return false
        const data = c.data.current as Record<string, unknown> | undefined
        const type = data?.type as string | undefined
        if (isActiveCat) {
          return type === 'category'
        }
        return type === 'component' || type === 'category' || type === 'root'
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

    setState({ activeId: null, activeType: null, overId: null, overPosition: null, multiDragCount: 0 })
    overRef.current = { id: null, position: null }
    lastZoneRef.current = null
    multiDragIdsRef.current = new Set()

    const store = useFrameStore.getState()
    store.setCanvasDrag(null)
    store.setCanvasDragOver(null)
    store.setComponentDragFrame(null)
  }, [])

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const id = String(active.id)
    const data = active.data.current as Record<string, unknown> | undefined
    const type = (data?.type as 'component' | 'category') ?? null

    overRef.current = { id: null, position: null }

    // Determine multi-drag from catalog highlightIds
    const catalog = useCatalogStore.getState()
    const { highlightIds } = catalog
    let dragIds: Set<string>

    if (type === 'component' && highlightIds.size > 1 && highlightIds.has(id)) {
      // Multi-drag: all highlighted components (no categories in multi-drag)
      dragIds = new Set([...highlightIds].filter((hid) => !hid.startsWith('__cat:')))
      if (dragIds.size <= 1) dragIds = new Set([id])
    } else {
      dragIds = new Set([id])
    }
    multiDragIdsRef.current = dragIds

    if (type === 'component') {
      // Component drag — set componentDragFrame for canvas insertion
      const internalComponents = catalog.allComponents()

      let component = internalComponents.find((c) => c.id === id)
      let origin: { libraryId?: string; componentId?: string } | undefined

      if (component) {
        origin = { libraryId: 'internal', componentId: component.id }
      } else {
        for (const [libId, lib] of catalog.libraries) {
          const found = lib.items?.find((c) => c.id === id)
          if (found) {
            component = found
            origin = { libraryId: libId, componentId: found.id }
            break
          }
        }
      }

      if (component && origin) {
        useFrameStore.getState().setComponentDragFrame(component.frame, origin)
      }
    }
    // category: no special start logic

    setState({ activeId: id, activeType: type, overId: null, overPosition: null, multiDragCount: dragIds.size })
  }, [])

  const handleDragMove = useCallback(
    ({ active, collisions, activatorEvent, delta }: DragMoveEvent) => {
      const data = active.data.current as Record<string, unknown> | undefined
      const aType = data?.type as string | undefined

      // Compute current pointer position from activation point + delta
      const ae = activatorEvent as PointerEvent
      const px = ae.clientX + delta.x
      const py = ae.clientY + delta.y

      if (aType === 'component' || aType === 'category') {
        // Check if pointer is over canvas
        if (isInsideCanvas(px, py)) {
          const store = useFrameStore.getState()
          if (!store.canvasDragId && aType === 'component') {
            store.setCanvasDrag('__component__')
          }

          if (aType === 'component') {
            cancelAnimationFrame(resolveRafRef.current)
            resolveRafRef.current = requestAnimationFrame(() => {
              const result = resolveComponentCanvasDrop(px, py)
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
    const dragIds = multiDragIdsRef.current
    const isMulti = dragIds.size > 1
    const data = active.data.current as Record<string, unknown> | undefined
    const aType = data?.type as string | undefined

    // Compute final pointer position
    const ae = activatorEvent as PointerEvent
    const px = ae.clientX + delta.x
    const py = ae.clientY + delta.y

    // Cancel any pending rAF
    cancelAnimationFrame(resolveRafRef.current)

    const store = useFrameStore.getState()
    const { componentDragFrame, componentDragOrigin } = store

    // Component canvas drop: synchronous resolve at final position
    if (aType === 'component' && componentDragFrame && isInsideCanvas(px, py)) {
      const result = resolveComponentCanvasDrop(px, py)
      cleanupDrag()
      if (result) {
        store.insertFrameAt(result.parentId, componentDragFrame, result.index, componentDragOrigin ?? undefined)
      }
      return
    }

    cleanupDrag()

    // Panel drop (component/category reorder)
    if (!lastZone) return
    const targetId = lastZone.id
    const zone = lastZone.zone
    if (dragId === targetId) return
    if (dragIds.has(targetId)) return

    const isActiveCat = dragId.startsWith('__cat:')
    const isTargetCat = targetId.startsWith('__cat:')
    const isTargetRoot = targetId === '__components_root__'

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
    } else if (isMulti) {
      // Multi-drag: move all selected components
      const ids = [...dragIds]
      if (isTargetRoot && zone === 'inside') {
        for (const cid of ids) catalog.updateComponentTags(cid, [])
        const all = catalog.allComponents()
        const uncategorized = all.filter((s) => s.tags.length === 0 && !dragIds.has(s.id))
        const last = uncategorized.length > 0 ? uncategorized[uncategorized.length - 1].id : null
        catalog.moveComponents(ids, last, 'after')
      } else if (isTargetCat && zone === 'inside') {
        const targetTag = targetId.slice('__cat:'.length)
        for (const cid of ids) catalog.updateComponentTags(cid, [targetTag])
        const all = catalog.allComponents()
        const items = all.filter((s) => s.tags[0] === targetTag && !dragIds.has(s.id))
        const last = items.length > 0 ? items[items.length - 1].id : null
        catalog.moveComponents(ids, last, 'after')
      } else if (isTargetCat) {
        const targetTag = targetId.slice('__cat:'.length)
        const all = catalog.allComponents()
        const items = all.filter((s) => s.tags[0] === targetTag)
        if (zone === 'before' && items.length > 0) {
          catalog.moveComponents(ids, items[0].id, 'before')
        } else if (zone === 'after' && items.length > 0) {
          catalog.moveComponents(ids, items[items.length - 1].id, 'after')
        }
      } else {
        catalog.moveComponents(ids, targetId, zone as 'before' | 'after')
      }
    } else {
      if (isTargetRoot && zone === 'inside') {
        catalog.updateComponentTags(dragId, [])
        const all = catalog.allComponents()
        const uncategorized = all.filter((s) => s.tags.length === 0)
        const last = uncategorized.length > 0 ? uncategorized[uncategorized.length - 1].id : null
        if (last && last !== dragId) {
          catalog.moveComponent(dragId, last, 'after')
        }
      } else if (isTargetCat && zone === 'inside') {
        const targetTag = targetId.slice('__cat:'.length)
        const all = catalog.allComponents()
        const items = all.filter((s) => s.tags[0] === targetTag)
        const last = items.length > 0 ? items[items.length - 1].id : null
        if (last && last !== dragId) {
          catalog.moveComponent(dragId, last, 'after')
        }
        catalog.updateComponentTags(dragId, [targetTag])
      } else if (isTargetCat) {
        const targetTag = targetId.slice('__cat:'.length)
        const all = catalog.allComponents()
        const items = all.filter((s) => s.tags[0] === targetTag)
        if (zone === 'before' && items.length > 0) {
          catalog.moveComponent(dragId, items[0].id, 'before')
        } else if (zone === 'after' && items.length > 0) {
          catalog.moveComponent(dragId, items[items.length - 1].id, 'after')
        }
      } else {
        catalog.moveComponent(dragId, targetId, zone as 'before' | 'after')
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
      multiDragCount: state.multiDragCount,
    }),
    [state.activeId, state.activeType, state.overId, state.overPosition, state.multiDragCount],
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
        {state.activeType === 'component' || state.activeType === 'category'
          ? state.activeId ? <ComponentDragGhost id={state.activeId} count={state.multiDragCount} /> : null
          : null}
      </DragOverlay>
    </DndContext>
  )
}
