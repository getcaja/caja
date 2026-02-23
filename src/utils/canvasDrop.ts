import type { Frame, BoxElement } from '../types/frame'
import { findInTree } from '../store/frameStore'

const EDGE_ZONE = 12

/**
 * Compute insertion index among sibling DOM elements based on cursor position.
 */
export function indexAmongSiblings(
  parentEl: HTMLElement,
  parentDir: string,
  cx: number,
  cy: number,
): number {
  const siblings = Array.from(parentEl.children).filter(
    (c) => (c as HTMLElement).hasAttribute('data-frame-id'),
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
 * Walk up the DOM from `el` to find the nearest parent with data-frame-id,
 * then compute a sibling insertion index there.
 * Returns false if no valid parent found.
 */
function dropAsSibling(
  targetEl: HTMLElement,
  currentRoot: Frame,
  excludeId: string | null,
  cx: number,
  cy: number,
): { parentId: string; index: number } | null {
  let parentEl = targetEl.parentElement as HTMLElement | null
  while (parentEl && !parentEl.hasAttribute('data-frame-id')) {
    parentEl = parentEl.parentElement as HTMLElement
  }
  if (!parentEl) return null
  const parentId = parentEl.getAttribute('data-frame-id')!
  if (excludeId && (parentId === excludeId || isDescendant(currentRoot, excludeId, parentId)))
    return null
  const parentFrame = findInTree(currentRoot, parentId)
  if (!parentFrame || parentFrame.type !== 'box') return null
  return { parentId, index: indexAmongSiblings(parentEl, parentFrame.direction, cx, cy) }
}

/**
 * Given a document + cursor coordinates, resolve a canvas drop target.
 *
 * @param doc      The document to query (iframe contentDocument for snippets, ownerDocument for canvas-internal)
 * @param cx       Cursor X in the document's coordinate space
 * @param cy       Cursor Y in the document's coordinate space
 * @param excludeId  Frame ID to exclude from drop targets (the frame being dragged, or '__snippet__')
 * @param root     Current frame tree root
 */
export function resolveCanvasDrop(
  doc: Document,
  cx: number,
  cy: number,
  excludeId: string | null,
  root: Frame,
): { parentId: string; index: number } | null {
  const el = doc.elementFromPoint(cx, cy) as HTMLElement | null
  if (!el) return null

  // Walk up to find the nearest frame element
  let target = el
  while (target && !target.hasAttribute('data-frame-id')) {
    target = target.parentElement as HTMLElement
  }
  if (!target) return null

  const targetId = target.getAttribute('data-frame-id')!
  // Can't drop on self or inside self
  if (excludeId && (targetId === excludeId || isDescendant(root, excludeId, targetId))) {
    return null
  }

  const targetFrame = findInTree(root, targetId)
  if (!targetFrame) return null

  if (targetFrame.type === 'box') {
    // Edge zone: if cursor is near the edge along parent's flex direction,
    // treat as sibling drop in parent instead of dropping inside this box.
    const rect = target.getBoundingClientRect()
    let parentEl = target.parentElement as HTMLElement | null
    while (parentEl && !parentEl.hasAttribute('data-frame-id')) {
      parentEl = parentEl.parentElement as HTMLElement
    }
    if (parentEl) {
      const parentId = parentEl.getAttribute('data-frame-id')!
      const parentFrame = findInTree(root, parentId)
      if (
        parentFrame?.type === 'box' &&
        (!excludeId || (parentId !== excludeId && !isDescendant(root, excludeId, parentId)))
      ) {
        const isParentRow =
          parentFrame.direction === 'row' || parentFrame.direction === 'row-reverse'
        const leading = isParentRow ? cx - rect.left : cy - rect.top
        const trailing = isParentRow ? rect.right - cx : rect.bottom - cy
        const size = isParentRow ? rect.width : rect.height
        const zone = Math.min(EDGE_ZONE, size * 0.25)

        if (leading < zone || trailing < zone) {
          return {
            parentId,
            index: indexAmongSiblings(parentEl, parentFrame.direction, cx, cy),
          }
        }
      }
    }

    // Dropping into this box container
    const children = Array.from(target.children).filter(
      (c) => (c as HTMLElement).hasAttribute('data-frame-id'),
    ) as HTMLElement[]

    if (children.length === 0) {
      return { parentId: targetId, index: 0 }
    }

    return {
      parentId: targetId,
      index: indexAmongSiblings(
        target,
        (targetFrame as BoxElement).direction,
        cx,
        cy,
      ),
    }
  } else {
    // Non-box target — insert as sibling in parent
    return dropAsSibling(target, root, excludeId, cx, cy)
  }
}
