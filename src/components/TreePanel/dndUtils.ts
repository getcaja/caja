import type { ClientRect, DroppableContainer } from '@dnd-kit/core'

export type DropPosition = 'before' | 'after' | 'inside'

/**
 * Compute the drop zone for a pointer position within a droppable rect.
 * Uses 25%/50%/25% split with hysteresis to prevent flicker at zone boundaries.
 *
 * @param cid         Droppable container ID
 * @param rect        Droppable rect
 * @param py          Pointer Y coordinate
 * @param data        Droppable data (expects isBox, hasExpandedChildren)
 * @param lastZone    Previous zone result (for hysteresis)
 */
export function computeZone(
  cid: string,
  rect: ClientRect,
  py: number,
  data: Record<string, unknown>,
  lastZone: { id: string; zone: DropPosition } | null,
): DropPosition {
  const containerIsBox = !!data.isBox
  const hasExpandedChildren = !!data.hasExpandedChildren
  const y = py - rect.top
  const h = rect.height
  const edge = Math.max(h * 0.25, 6)
  const HYST = 1

  let zone: DropPosition

  if (lastZone && lastZone.id === cid) {
    if (lastZone.zone === 'before' && y < edge + HYST) zone = 'before'
    else if (lastZone.zone === 'after' && y > h - edge - HYST) zone = 'after'
    else if (lastZone.zone === 'inside' && containerIsBox && y >= edge - HYST && y <= h - edge + HYST) zone = 'inside'
    else {
      if (y < edge) zone = 'before'
      else if (y > h - edge || !containerIsBox) zone = 'after'
      else zone = 'inside'
    }
  } else {
    if (y < edge) zone = 'before'
    else if (y > h - edge || !containerIsBox) zone = 'after'
    else zone = 'inside'
  }

  // Expanded parents: "after" the row really means entering children territory -> remap to "inside".
  if (hasExpandedChildren && zone === 'after') zone = 'inside'

  return zone
}

/**
 * Find the closest droppable by Y distance (nearest horizontal edge).
 * Nodes below the pointer get a 4px bias — in the gap left by the dragged node,
 * this ensures "before lower-sibling" wins over "inside upper-parent (append)".
 *
 * @param containers  All droppable containers
 * @param rects       Droppable rect map
 * @param pointer     { x, y } pointer coordinates
 * @param skipId      Active drag ID to skip
 * @param isInvalid   Predicate to skip additional containers (e.g. descendants)
 */
export function closestByY(
  containers: DroppableContainer[],
  rects: Map<string | number, ClientRect>,
  pointer: { x: number; y: number },
  skipId: string,
  isInvalid?: (cid: string) => boolean,
): { container: DroppableContainer; rect: ClientRect; dist: number } | null {
  const py = pointer.y
  let best: { container: DroppableContainer; rect: ClientRect; dist: number } | null = null

  for (const container of containers) {
    if (container.disabled) continue

    const cid = String(container.id)
    if (cid === skipId) continue
    if (isInvalid?.(cid)) continue

    const rect = rects.get(container.id)
    if (!rect || rect.height === 0) continue

    let dist: number
    if (py >= rect.top && py <= rect.top + rect.height) {
      dist = 0
    } else if (py < rect.top) {
      dist = Math.max(0, rect.top - py - 4) // node below pointer: 4px closer
    } else {
      dist = py - (rect.top + rect.height)
    }

    if (!best || dist < best.dist) {
      best = { container, rect, dist }
    }
  }

  return best
}
