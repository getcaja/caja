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
import { useFrameStore, findInTree, findParent } from '../../store/frameStore'
import type { BoxElement } from '../../types/frame'

interface Rect { top: number; left: number; width: number; height: number }

/** Margins for a single element (in px, already scaled by zoom). */
interface MarginInfo {
  /** Element rect relative to wrapper */
  el: Rect
  top: number
  right: number
  bottom: number
  left: number
}

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
    // Primary selection — thin 1px (persistent, subtle)
    if (selectedId) {
      rules.push(`[data-frame-id="${selectedId}"] { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`)
      const excDrag = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
      // Exclude hovered element so hover 2px outline (lower specificity) isn't masked by child-hints
      const excHov = showHov && hoveredId ? `:not([data-frame-id="${hoveredId}"])` : ''
      rules.push(`[data-frame-id="${selectedId}"] > [data-frame-id]${excDrag}${excHov} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
    }
    // Secondary selections — thin 1px
    for (const id of selectedIds) {
      if (id === selectedId) continue
      rules.push(`[data-frame-id="${id}"] { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`)
    }
  }

  // Build exclusion selector for all selected elements (primary + secondary)
  // so hover/drag child-hints never overwrite selection outlines
  const selExclusions: string[] = []
  if (selectedId) selExclusions.push(`:not([data-frame-id="${selectedId}"])`)
  for (const id of selectedIds) {
    if (id !== selectedId) selExclusions.push(`:not([data-frame-id="${id}"])`)
  }
  const selExcStr = selExclusions.join('')

  if (showHov && hoveredId) {
    // Hover — thick 2px (attention-grabbing, shows what you'll select)
    rules.push(`[data-frame-id="${hoveredId}"] { outline: 2px solid ${color} !important; outline-offset: -2px !important; }`)
    rules.push(`[data-frame-id="${hoveredId}"] > [data-frame-id]${selExcStr} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
  }

  if (showDragGuides && dragTargetParentId) {
    const exc = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
    rules.push(`[data-frame-id="${dragTargetParentId}"] > [data-frame-id]${exc}${selExcStr} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
  }

  return rules
}

/** Read computed margins of a frame element relative to a wrapper element, scaled by zoom. */
function computeMarginInfo(
  doc: Document,
  frameId: string,
  wrapperEl: HTMLElement,
  zoom: number,
): MarginInfo | null {
  const el = doc.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null
  if (!el) return null

  const cs = doc.defaultView!.getComputedStyle(el)
  const mt = parseFloat(cs.marginTop) || 0
  const mr = parseFloat(cs.marginRight) || 0
  const mb = parseFloat(cs.marginBottom) || 0
  const ml = parseFloat(cs.marginLeft) || 0

  // No margins → nothing to show
  if (mt === 0 && mr === 0 && mb === 0 && ml === 0) return null

  const elRect = el.getBoundingClientRect()
  const wrapperRect = wrapperEl.getBoundingClientRect()

  return {
    el: {
      top: elRect.top - wrapperRect.top,
      left: elRect.left - wrapperRect.left,
      width: elRect.width,
      height: elRect.height,
    },
    top: mt * zoom,
    right: mr * zoom,
    bottom: mb * zoom,
    left: ml * zoom,
  }
}

/** Renders semi-transparent margin indicators around an element. */
function MarginRects({ info }: { info: MarginInfo }) {
  const fill = 'rgba(12, 140, 233, 0.10)'
  const common = { position: 'absolute' as const, pointerEvents: 'none' as const, background: fill }

  const rects: React.CSSProperties[] = []

  if (info.top > 0) {
    rects.push({ ...common, top: info.el.top - info.top, left: info.el.left, width: info.el.width, height: info.top })
  }
  if (info.bottom > 0) {
    rects.push({ ...common, top: info.el.top + info.el.height, left: info.el.left, width: info.el.width, height: info.bottom })
  }
  if (info.left > 0) {
    rects.push({ ...common, top: info.el.top - info.top, left: info.el.left - info.left, width: info.left, height: info.el.height + info.top + info.bottom })
  }
  if (info.right > 0) {
    rects.push({ ...common, top: info.el.top - info.top, left: info.el.left + info.el.width, width: info.right, height: info.el.height + info.top + info.bottom })
  }

  return (
    <>
      {rects.map((style, i) => (
        <div key={i} style={style} />
      ))}
    </>
  )
}

export function SelectionOverlay() {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (anchorRef.current) setDoc(anchorRef.current.ownerDocument)
  }, [])

  const selectedId = useFrameStore((s) => s.selectedId)
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  const isLineMode = !!canvasDragId && !!canvasDragOver
  const isDragging = !!canvasDragId && canvasDragId === selectedId
  const showSel = !previewMode && (!!selectedId || selectedIds.size > 0) && !isDragging

  // When hovering a descendant of the selected element, resolve hover to the
  // direct child of selectedId that contains the hovered element (Figma-style).
  const effectiveHoveredId = useFrameStore((s) => {
    if (!s.hoveredId || !s.selectedId || s.hoveredId === s.selectedId) return s.hoveredId
    const selFrame = findInTree(s.root, s.selectedId)
    if (!selFrame || selFrame.type !== 'box') return s.hoveredId
    // Check if hovered is a descendant of selected
    if (!findInTree(selFrame as BoxElement, s.hoveredId)) return s.hoveredId
    // Walk up from hovered to find the direct child of selected
    let current = s.hoveredId
    let parent = findParent(s.root, current)
    while (parent && parent.id !== s.selectedId) {
      current = parent.id
      parent = findParent(s.root, current)
    }
    return parent ? current : s.hoveredId
  })
  const showHov = !previewMode && !!effectiveHoveredId && effectiveHoveredId !== selectedId && !canvasDragId

  const dragTargetParentId = canvasDragOver?.parentId ?? null
  const showDragGuides = !previewMode && !!canvasDragId && !!dragTargetParentId

  // Blue insertion line — only positioned element needed
  const [lineRect, setLineRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!isLineMode || !canvasDragOver || !canvasDragId || !doc) { setLineRect(null); return }
    setLineRect(computeLineRect(doc, canvasDragOver))
  }, [isLineMode, canvasDragOver?.parentId, canvasDragOver?.index, canvasDragId, doc])

  const rules = buildOverlayRules({ selectedId, selectedIds, hoveredId: effectiveHoveredId, showSel, showHov, canvasDragId, showDragGuides, dragTargetParentId })

  // Margin overlay — shows margin areas for selected/hovered element
  const zoom = useFrameStore((s) => s.canvasZoom)
  // root reference changes on every tree mutation (undo/redo, move, add, etc.)
  const root = useFrameStore((s) => s.root)
  const targetId = showSel ? selectedId : showHov ? effectiveHoveredId : null

  const [marginInfo, setMarginInfo] = useState<MarginInfo | null>(null)
  useLayoutEffect(() => {
    if (!targetId || !doc) { setMarginInfo(null); return }
    // Defer to next frame so DOM has updated after tree mutation
    const raf = requestAnimationFrame(() => {
      const wrapper = doc.querySelector('[data-canvas-wrapper]') as HTMLElement | null
      if (!wrapper) { setMarginInfo(null); return }
      setMarginInfo(computeMarginInfo(doc, targetId, wrapper, zoom))
    })
    return () => cancelAnimationFrame(raf)
  }, [targetId, doc, zoom, root])

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} />
      {rules.length > 0 && <style>{rules.join('\n')}</style>}
      {marginInfo && <MarginRects info={marginInfo} />}
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
