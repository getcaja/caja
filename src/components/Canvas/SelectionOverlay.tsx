/**
 * SelectionOverlay — renders selection/hover outlines on canvas elements.
 *
 * Approach: CSS outline rules injected via <style>, applied directly to elements
 * using [data-frame-id] attribute selectors. Outlines follow elements naturally —
 * no coordinate tracking, no scroll desync, no forced scroll.
 *
 * The only positioned element is the blue insertion line during drag operations,
 * rendered in a fixed container with viewport-relative coordinates.
 *
 * Trade-off: outlines may be clipped by ancestor overflow:hidden/clip, unlike the
 * previous positioned-overlay approach. This affects elements flush against a
 * clipped parent's edges — acceptable for the vast majority of layouts.
 */

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useFrameStore, findInTree } from '../../store/frameStore'
import type { BoxElement } from '../../types/frame'

interface Rect { top: number; left: number; width: number; height: number }

/** Viewport-relative rect (for the fixed-position insertion line). */
function getViewportRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/** Compute the blue insertion line rect for line-mode drops.
 *  Returns viewport-relative coordinates (for use with position:fixed container).
 *
 *  dragOver.index is in visual space (among all rendered children, including
 *  the faded dragged element). This means the line naturally appears in clean
 *  gaps between what's actually visible — no conversion needed. */
function computeLineRect(
  doc: Document,
  dragOver: { parentId: string; index: number },
): Rect | null {
  const parentEl = doc.querySelector(`[data-frame-id="${dragOver.parentId}"]`) as HTMLElement | null
  if (!parentEl) return null

  const children = Array.from(parentEl.children).filter((c) => {
    const el = c as HTMLElement
    return el.hasAttribute('data-frame-id')
  }) as HTMLElement[]

  const idx = dragOver.index

  const parentRect = getViewportRect(parentEl)
  const parentStyle = doc.defaultView!.getComputedStyle(parentEl)
  const display = parentStyle.display
  let isRow: boolean
  if (display === 'grid' || display === 'inline-grid') {
    const cols = parentStyle.gridTemplateColumns
    isRow = !!cols && cols.trim().split(/\s+/).length > 1
  } else if (display === 'flex' || display === 'inline-flex') {
    const dir = parentStyle.flexDirection
    isRow = dir === 'row' || dir === 'row-reverse'
  } else {
    isRow = false
  }

  const LINE_THICKNESS = 3
  const LINE_INSET = 2

  if (children.length === 0) {
    if (isRow) {
      return { top: parentRect.top + LINE_INSET, left: parentRect.left + LINE_INSET, width: LINE_THICKNESS, height: parentRect.height - LINE_INSET * 2 }
    }
    return { top: parentRect.top + LINE_INSET, left: parentRect.left + LINE_INSET, width: parentRect.width - LINE_INSET * 2, height: LINE_THICKNESS }
  }

  if (isRow) {
    let x: number
    if (idx <= 0) {
      const r = getViewportRect(children[0])
      x = r.left - 1
    } else if (idx >= children.length) {
      const r = getViewportRect(children[children.length - 1])
      x = r.left + r.width + 1
    } else {
      const prev = getViewportRect(children[idx - 1])
      const next = getViewportRect(children[idx])
      x = (prev.left + prev.width + next.left) / 2
    }
    return { top: parentRect.top + LINE_INSET, left: x - LINE_THICKNESS / 2, width: LINE_THICKNESS, height: parentRect.height - LINE_INSET * 2 }
  } else {
    let y: number
    if (idx <= 0) {
      const r = getViewportRect(children[0])
      y = r.top - 1
    } else if (idx >= children.length) {
      const r = getViewportRect(children[children.length - 1])
      y = r.top + r.height + 1
    } else {
      const prev = getViewportRect(children[idx - 1])
      const next = getViewportRect(children[idx])
      y = (prev.top + prev.height + next.top) / 2
    }
    return { top: y - LINE_THICKNESS / 2, left: parentRect.left + LINE_INSET, width: parentRect.width - LINE_INSET * 2, height: LINE_THICKNESS }
  }
}

/** Build CSS rules for selection/hover outlines.
 *  Exported for testing. */
export function buildOverlayRules(state: {
  selectedId: string | null
  selectedIds: Set<string>
  hoveredId: string | null
  showSel: boolean
  showHov: boolean
  canvasDragId: string | null
  showDragGuides: boolean
  dragTargetParentId: string | null
}): string[] {
  const { selectedId, selectedIds, hoveredId, showSel, showHov, canvasDragId, showDragGuides, dragTargetParentId } = state
  const rules: string[] = []
  const color = 'var(--color-accent)'

  if (showSel) {
    // Primary selection — solid 2px
    if (selectedId) {
      rules.push(`[data-frame-id="${selectedId}"] { outline: 2px solid ${color} !important; outline-offset: -2px !important; }`)
      const exc = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
      rules.push(`[data-frame-id="${selectedId}"] > [data-frame-id]${exc} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
    }
    // Secondary selections — solid 2px (same style as primary, like Figma)
    for (const id of selectedIds) {
      if (id === selectedId) continue
      rules.push(`[data-frame-id="${id}"] { outline: 2px solid ${color} !important; outline-offset: -2px !important; }`)
    }
  }

  if (showHov && hoveredId) {
    rules.push(`[data-frame-id="${hoveredId}"] { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`)
    rules.push(`[data-frame-id="${hoveredId}"] > [data-frame-id] { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
  }

  if (showDragGuides && dragTargetParentId) {
    const exc = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
    rules.push(`[data-frame-id="${dragTargetParentId}"] > [data-frame-id]${exc} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
  }

  return rules
}

export function SelectionOverlay() {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (anchorRef.current) setDoc(anchorRef.current.ownerDocument)
  }, [])

  const selectedId = useFrameStore((s) => s.selectedId)
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  const isLineMode = !!canvasDragId && !!canvasDragOver
  const isDragging = !!canvasDragId && canvasDragId === selectedId
  const showSel = !previewMode && (!!selectedId || selectedIds.size > 0) && !isDragging

  // Suppress hover on descendants of selected element
  const hovIsDescOfSel = useFrameStore((s) => {
    if (!s.selectedId || !s.hoveredId || s.selectedId === s.hoveredId) return false
    const selFrame = findInTree(s.root, s.selectedId)
    if (!selFrame || selFrame.type !== 'box') return false
    return !!findInTree(selFrame as BoxElement, s.hoveredId)
  })
  const showHov = !previewMode && !!hoveredId && hoveredId !== selectedId && !hovIsDescOfSel && !canvasDragId

  const dragTargetParentId = canvasDragOver?.parentId ?? null
  const showDragGuides = !previewMode && !!canvasDragId && !!dragTargetParentId

  // Blue insertion line — only positioned element needed
  const [lineRect, setLineRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!isLineMode || !canvasDragOver || !canvasDragId || !doc) { setLineRect(null); return }
    setLineRect(computeLineRect(doc, canvasDragOver))
  }, [isLineMode, canvasDragOver?.parentId, canvasDragOver?.index, canvasDragId, doc])

  const rules = buildOverlayRules({ selectedId, selectedIds, hoveredId, showSel, showHov, canvasDragId, showDragGuides, dragTargetParentId })

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} />
      {rules.length > 0 && <style>{rules.join('\n')}</style>}
      {isLineMode && lineRect && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
          <div style={{
            position: 'absolute',
            top: lineRect.top,
            left: lineRect.left,
            width: lineRect.width,
            height: lineRect.height,
            background: 'var(--color-accent)',
            borderRadius: 2,
          }} />
        </div>
      )}
    </>
  )
}
