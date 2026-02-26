/**
 * SelectionOverlay — renders selection/hover outlines above the canvas content.
 * Always rectangular regardless of the element's border-radius (Figma-style).
 *
 * Architecture: The overlay container is position:absolute with page-relative
 * coordinates, so it scrolls naturally with the document content. This eliminates
 * scroll desync entirely — no scroll listeners needed for rect tracking.
 *
 * IMPORTANT: This component renders inside the iframe's React root, but the
 * JS module runs in the parent window context. We must use ownerDocument
 * (from a ref on our own DOM node) to query the iframe's DOM.
 */

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useFrameStore, findInTree } from '../../store/frameStore'
import type { BoxElement } from '../../types/frame'

interface Rect { top: number; left: number; width: number; height: number }

/** Get an element's rect relative to the page origin (not the viewport).
 *  Overlay uses absolute positioning, so page-relative coords scroll naturally. */
function getPageRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  const win = el.ownerDocument.defaultView!
  return {
    top: r.top + win.scrollY,
    left: r.left + win.scrollX,
    width: r.width,
    height: r.height,
  }
}

/** Track an element's page-relative rect via ResizeObserver + MutationObserver.
 *  No scroll listener needed — overlay scrolls with the document. */
function useTrackedRect(frameId: string | null, active: boolean, doc: Document | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active || !frameId || !doc) { setRect(null); return }
    const el = doc.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null
    if (!el) { setRect(null); return }

    let rafId = 0
    const update = () => {
      const r = getPageRect(el)
      setRect(prev =>
        prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
          ? prev
          : r,
      )
    }
    const schedule = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update) }

    update()

    const ro = new ResizeObserver(schedule)
    ro.observe(el)

    const mo = new MutationObserver(schedule)
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

    // Window resize (e.g. Rectangle window manager) causes reflow without ResizeObserver firing
    const win = doc.defaultView!
    win.addEventListener('resize', schedule)

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); mo.disconnect(); win.removeEventListener('resize', schedule) }
  }, [frameId, active, doc])

  return rect
}

/** Track rects of immediate children of the selected frame. */
function useChildRects(selectedId: string | null, active: boolean, doc: Document | null, excludeId: string | null = null): Rect[] {
  const [rects, setRects] = useState<Rect[]>([])

  const childIdsKey = useFrameStore((s) => {
    if (!active || !selectedId) return ''
    const frame = findInTree(s.root, selectedId)
    if (!frame || frame.type !== 'box') return ''
    return (frame as BoxElement).children.filter((c) => !c.hidden && (!excludeId || c.id !== excludeId)).map((c) => c.id).join(',')
  })
  const childIds = childIdsKey ? childIdsKey.split(',') : []

  useEffect(() => {
    if (!active || !doc || childIds.length === 0) { setRects([]); return }

    const elements = childIds
      .map((id) => doc.querySelector(`[data-frame-id="${id}"]`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[]

    if (elements.length === 0) { setRects([]); return }

    let rafId = 0
    const update = () => {
      setRects(elements.map((el) => getPageRect(el)))
    }
    const schedule = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update) }

    update()

    const ro = new ResizeObserver(schedule)
    for (const el of elements) ro.observe(el)

    const mo = new MutationObserver(schedule)
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

    const win = doc.defaultView!
    win.addEventListener('resize', schedule)

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); mo.disconnect(); win.removeEventListener('resize', schedule) }
  }, [childIds.join(','), active, doc])

  return rects
}

/** Compute the blue insertion line rect for line-mode drops.
 *  Returns page-relative coordinates.
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

  const parentRect = getPageRect(parentEl)
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
    // block, inline-block, etc. — always vertical stacking
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
      const r = getPageRect(children[0])
      x = r.left - 1
    } else if (idx >= children.length) {
      const r = getPageRect(children[children.length - 1])
      x = r.left + r.width + 1
    } else {
      const prev = getPageRect(children[idx - 1])
      const next = getPageRect(children[idx])
      x = (prev.left + prev.width + next.left) / 2
    }
    return { top: parentRect.top + LINE_INSET, left: x - LINE_THICKNESS / 2, width: LINE_THICKNESS, height: parentRect.height - LINE_INSET * 2 }
  } else {
    let y: number
    if (idx <= 0) {
      const r = getPageRect(children[0])
      y = r.top - 1
    } else if (idx >= children.length) {
      const r = getPageRect(children[children.length - 1])
      y = r.top + r.height + 1
    } else {
      const prev = getPageRect(children[idx - 1])
      const next = getPageRect(children[idx])
      y = (prev.top + prev.height + next.top) / 2
    }
    return { top: y - LINE_THICKNESS / 2, left: parentRect.left + LINE_INSET, width: parentRect.width - LINE_INSET * 2, height: LINE_THICKNESS }
  }
}

export function SelectionOverlay() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (containerRef.current) setDoc(containerRef.current.ownerDocument)
  }, [])

  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  // Line mode: any drag (frame or snippet) with a resolved drop target
  const isLineMode = !!canvasDragId && !!canvasDragOver

  const isDragging = !!canvasDragId && canvasDragId === selectedId
  const showSel = !previewMode && !!selectedId && !isDragging
  const showHov = !previewMode && !!hoveredId && hoveredId !== selectedId && !canvasDragId
  const selRect = useTrackedRect(selectedId, showSel, doc)
  const childRects = useChildRects(selectedId, showSel, doc, canvasDragId)

  // During drag: sibling outlines in the target container (layout slot guides)
  const dragTargetParentId = canvasDragOver?.parentId ?? null
  const showDragGuides = !previewMode && !!canvasDragId && !!dragTargetParentId
  const dragSiblingRects = useChildRects(dragTargetParentId, showDragGuides, doc, canvasDragId)

  // Blue insertion line
  const [lineRect, setLineRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!isLineMode || !canvasDragOver || !canvasDragId || !doc) { setLineRect(null); return }
    setLineRect(computeLineRect(doc, canvasDragOver))
  }, [isLineMode, canvasDragOver?.parentId, canvasDragOver?.index, canvasDragId, doc])

  // Hover: compute page-relative rect when hoveredId changes + on window resize
  const [hovRect, setHovRect] = useState<Rect | null>(null)
  const [hovChildRects, setHovChildRects] = useState<Rect[]>([])
  useEffect(() => {
    if (!showHov || !hoveredId || !doc) { setHovRect(null); setHovChildRects([]); return }

    const update = () => {
      const el = doc.querySelector(`[data-frame-id="${hoveredId}"]`) as HTMLElement | null
      if (!el) { setHovRect(null); setHovChildRects([]); return }
      setHovRect(getPageRect(el))

      const frame = findInTree(useFrameStore.getState().root, hoveredId)
      if (frame?.type === 'box') {
        const rects = (frame as BoxElement).children
          .filter((c) => !c.hidden)
          .map((c) => {
            const cel = doc.querySelector(`[data-frame-id="${c.id}"]`) as HTMLElement | null
            if (!cel) return null
            return getPageRect(cel)
          })
          .filter(Boolean) as Rect[]
        setHovChildRects(rects)
      } else {
        setHovChildRects([])
      }
    }

    update()

    const win = doc.defaultView!
    win.addEventListener('resize', update)
    return () => win.removeEventListener('resize', update)
  }, [hoveredId, showHov, doc])

  const SEL = 2
  const HOV = 1

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'clip', pointerEvents: 'none', zIndex: 9999 }}>
      {/* Hover outline */}
      {hovRect && (
        <div style={{
          position: 'absolute',
          top: hovRect.top - HOV,
          left: hovRect.left - HOV,
          width: hovRect.width + HOV * 2,
          height: hovRect.height + HOV * 2,
          border: `${HOV}px solid var(--color-focus)`,
        }} />
      )}
      {/* Hover child outlines (dotted) */}
      {hovChildRects.map((r, i) => (
        <div key={`hc-${i}`} style={{
          position: 'absolute',
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          border: '1px dotted var(--color-focus)',
          boxSizing: 'border-box',
        }} />
      ))}
      {/* Child outlines (dotted, Figma-style layout guides) */}
      {childRects.map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          border: '1px dotted var(--color-focus)',
          boxSizing: 'border-box',
        }} />
      ))}
      {/* Drag: sibling outlines in target container (slot guides) */}
      {showDragGuides && dragSiblingRects.map((r, i) => (
        <div key={`dc-${i}`} style={{
          position: 'absolute',
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          border: '1px dotted var(--color-focus)',
          boxSizing: 'border-box',
        }} />
      ))}
      {/* Drag: blue insertion line */}
      {isLineMode && lineRect && (
        <div style={{
          position: 'absolute',
          top: lineRect.top,
          left: lineRect.left,
          width: lineRect.width,
          height: lineRect.height,
          background: 'var(--color-focus)',
          borderRadius: 2,
        }} />
      )}
      {/* Selection outline + drag handle */}
      {selRect && (
        <div style={{
          position: 'absolute',
          top: selRect.top - SEL,
          left: selRect.left - SEL,
          width: selRect.width + SEL * 2,
          height: selRect.height + SEL * 2,
          border: `${SEL}px solid var(--color-focus)`,
        }} />
      )}
    </div>
  )
}
