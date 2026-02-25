import type { Frame, BoxElement } from '../types/frame'
import { findInTree } from '../store/frameStore'

const EDGE_ZONE = 12

/**
 * Count how deep a DOM element is in the frame tree (number of data-frame-id ancestors).
 * Root frame = depth 0, its children = depth 1, etc.
 */
export function getFrameDepth(el: HTMLElement): number {
  let depth = 0
  let node = el.parentElement
  while (node) {
    if (node.hasAttribute('data-frame-id')) depth++
    node = node.parentElement
  }
  return depth
}

/**
 * Compute insertion index among sibling DOM elements based on cursor position.
 * Skips the dragged element (display:none → rect is all zeros, corrupts midpoints).
 * Returns index in terms of "array without excludeId" — matches moveInTree which
 * extracts first, then splices at index.
 */
export function indexAmongSiblings(
  parentEl: HTMLElement,
  parentDir: string,
  cx: number,
  cy: number,
  excludeId: string | null,
): number {
  const siblings = Array.from(parentEl.children).filter(
    (c) => {
      const el = c as HTMLElement
      return el.hasAttribute('data-frame-id') && el.getAttribute('data-frame-id') !== excludeId
    },
  ) as HTMLElement[]
  const isRow = parentDir === 'row' || parentDir === 'row-reverse'
  let idx = siblings.length
  for (let i = 0; i < siblings.length; i++) {
    const rect = siblings[i].getBoundingClientRect()
    const mid = isRow ? rect.left + rect.width / 2 : rect.top + rect.height / 2
    if ((isRow ? cx : cy) < mid) {
      idx = i
      break
    }
  }
  return idx
}

function isDescendant(root: Frame, ancestorId: string, descendantId: string): boolean {
  const ancestor = findInTree(root, ancestorId)
  if (!ancestor) return false
  return (
    ancestor.type === 'box' &&
    findInTree(ancestor, descendantId) !== null &&
    ancestorId !== descendantId
  )
}

/**
 * Walk up the DOM from `el` to find the nearest valid parent with data-frame-id,
 * respecting the maximum depth constraint.
 */
function findDropParent(
  el: HTMLElement,
  currentRoot: Frame,
  excludeId: string | null,
  maxDropDepth: number | null,
): { parentEl: HTMLElement; parentId: string; parentFrame: BoxElement } | null {
  let parentEl = el.parentElement as HTMLElement | null
  while (parentEl) {
    if (parentEl.hasAttribute('data-frame-id')) {
      const parentId = parentEl.getAttribute('data-frame-id')!
      // Skip excluded and descendants of excluded
      if (excludeId && (parentId === excludeId || isDescendant(currentRoot, excludeId, parentId))) {
        parentEl = parentEl.parentElement as HTMLElement
        continue
      }
      // Check depth constraint
      if (maxDropDepth != null && getFrameDepth(parentEl) > maxDropDepth) {
        parentEl = parentEl.parentElement as HTMLElement
        continue
      }
      const parentFrame = findInTree(currentRoot, parentId)
      if (parentFrame?.type === 'box') {
        return { parentEl, parentId, parentFrame }
      }
    }
    parentEl = parentEl.parentElement as HTMLElement
  }
  return null
}

/**
 * Given a document + cursor coordinates, resolve a canvas drop target.
 *
 * @param doc           The document to query
 * @param cx            Cursor X in the document's coordinate space
 * @param cy            Cursor Y in the document's coordinate space
 * @param excludeId     Frame ID to exclude (the frame being dragged, or '__snippet__')
 * @param root          Current frame tree root
 * @param maxDropDepth  Maximum allowed depth for drop parents (null = no limit).
 *                      Set to sourceParentDepth to lock drag to same level or shallower.
 */
export function resolveCanvasDrop(
  doc: Document,
  cx: number,
  cy: number,
  excludeId: string | null,
  root: Frame,
  maxDropDepth: number | null = null,
): { parentId: string; index: number } | null {
  const el = doc.elementFromPoint(cx, cy) as HTMLElement | null
  if (!el) return null

  // Walk up to find the nearest frame element
  let target = el
  while (target && !target.hasAttribute('data-frame-id')) {
    target = target.parentElement as HTMLElement
  }
  if (!target) {
    // Cursor is over empty space (body/caja-root) — fallback to root
    if (root.type === 'box') {
      return { parentId: root.id, index: root.children.length }
    }
    return null
  }

  // Depth constraint: if target is too deep, walk up to an allowed ancestor
  if (maxDropDepth != null) {
    while (target && getFrameDepth(target) > maxDropDepth) {
      let parent = target.parentElement as HTMLElement | null
      while (parent && !parent.hasAttribute('data-frame-id')) {
        parent = parent.parentElement as HTMLElement
      }
      if (!parent) break
      target = parent
    }
  }

  const targetId = target.getAttribute('data-frame-id')!
  // Can't drop on self or inside self
  if (excludeId && (targetId === excludeId || isDescendant(root, excludeId, targetId))) {
    return null
  }

  const targetFrame = findInTree(root, targetId)
  if (!targetFrame) return null

  if (targetFrame.type === 'box') {
    const rect = target.getBoundingClientRect()
    const targetDepth = getFrameDepth(target)
    const dropParent = findDropParent(target, root, excludeId, maxDropDepth)

    // Count visible children (excluding dragged element)
    const children = Array.from(target.children).filter(
      (c) => {
        const el = c as HTMLElement
        return el.hasAttribute('data-frame-id') && el.getAttribute('data-frame-id') !== excludeId
      },
    ) as HTMLElement[]

    // Empty box: eagerly accept drops — skip edge zone so the entire
    // box surface is a valid target (otherwise edge zone swallows it).
    if (children.length === 0) {
      if (maxDropDepth != null && targetDepth > maxDropDepth) {
        if (dropParent) {
          return {
            parentId: dropParent.parentId,
            index: indexAmongSiblings(dropParent.parentEl, dropParent.parentFrame.direction, cx, cy, excludeId),
          }
        }
        return null
      }
      return { parentId: targetId, index: 0 }
    }

    // Edge zone: escape to parent container when cursor is near the edge.
    // BUT: don't apply when target is at maxDropDepth — this is the container
    // we're reordering within, edges should insert at start/end, not escape.
    const applyEdgeZone = dropParent && (maxDropDepth == null || targetDepth <= maxDropDepth)

    if (applyEdgeZone) {
      const isParentRow =
        dropParent.parentFrame.direction === 'row' || dropParent.parentFrame.direction === 'row-reverse'
      const leading = isParentRow ? cx - rect.left : cy - rect.top
      const trailing = isParentRow ? rect.right - cx : rect.bottom - cy
      const size = isParentRow ? rect.width : rect.height
      const zone = Math.min(EDGE_ZONE, size * 0.35)

      if (leading < zone || trailing < zone) {
        return {
          parentId: dropParent.parentId,
          index: indexAmongSiblings(dropParent.parentEl, dropParent.parentFrame.direction, cx, cy, excludeId),
        }
      }
    }

    // Check if dropping INTO this box is allowed by depth constraint
    if (maxDropDepth != null && targetDepth > maxDropDepth) {
      // Too deep — fall back to inserting as sibling in nearest valid parent
      if (dropParent) {
        return {
          parentId: dropParent.parentId,
          index: indexAmongSiblings(dropParent.parentEl, dropParent.parentFrame.direction, cx, cy, excludeId),
        }
      }
      return null
    }

    // Dropping into this box container
    return {
      parentId: targetId,
      index: indexAmongSiblings(
        target,
        (targetFrame as BoxElement).direction,
        cx,
        cy,
        excludeId,
      ),
    }
  } else {
    // Non-box target — insert as sibling in nearest valid parent
    const dropParent = findDropParent(target, root, excludeId, maxDropDepth)
    if (!dropParent) return null
    return {
      parentId: dropParent.parentId,
      index: indexAmongSiblings(dropParent.parentEl, dropParent.parentFrame.direction, cx, cy, excludeId),
    }
  }
}
