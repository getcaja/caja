/**
 * SelectionOverlay — renders selection/hover outlines as a fixed overlay
 * above the canvas content. Always rectangular regardless of the element's
 * border-radius, matching Figma's behavior.
 *
 * Also hosts the drag handle (no longer a child of user elements).
 *
 * IMPORTANT: This component renders inside the iframe's React root, but the
 * JS module runs in the parent window context. We must use ownerDocument
 * (from a ref on our own DOM node) to query the iframe's DOM.
 */

import { useEffect, useLayoutEffect, useState, useRef } from 'react'
import { useFrameStore, isRootId, findInTree, findParent } from '../../store/frameStore'
import type { BoxElement } from '../../types/frame'

interface Rect { top: number; left: number; width: number; height: number }

/** Track an element's viewport rect via ResizeObserver + MutationObserver + scroll. */
function useTrackedRect(frameId: string | null, active: boolean, doc: Document | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!active || !frameId || !doc) { setRect(null); return }
    const el = doc.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null
    if (!el) { setRect(null); return }

    let rafId = 0
    const update = () => {
      const r = el.getBoundingClientRect()
      setRect(prev =>
        prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height
          ? prev
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      )
    }
    const schedule = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update) }

    update()

    const ro = new ResizeObserver(schedule)
    ro.observe(el)

    const mo = new MutationObserver(schedule)
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

    doc.addEventListener('scroll', schedule, { capture: true, passive: true } as AddEventListenerOptions)

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); mo.disconnect(); doc.removeEventListener('scroll', schedule, true) }
  }, [frameId, active, doc])

  return rect
}

/** Track rects of immediate children of the selected frame. */
function useChildRects(selectedId: string | null, active: boolean, doc: Document | null, excludeId: string | null = null): Rect[] {
  const [rects, setRects] = useState<Rect[]>([])

  // Get child IDs from the store — return a stable string to avoid infinite re-renders
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
      const newRects = elements.map((el) => {
        const r = el.getBoundingClientRect()
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      })
      setRects(newRects)
    }
    const schedule = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(update) }

    update()

    const ro = new ResizeObserver(schedule)
    for (const el of elements) ro.observe(el)

    const mo = new MutationObserver(schedule)
    mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })

    doc.addEventListener('scroll', schedule, { capture: true, passive: true } as AddEventListenerOptions)

    return () => { cancelAnimationFrame(rafId); ro.disconnect(); mo.disconnect(); doc.removeEventListener('scroll', schedule, true) }
  }, [childIds.join(','), active, doc])

  return rects
}

/** Compute the blue insertion line rect for cross-parent (line mode) drops. */
function computeLineRect(
  doc: Document,
  dragOver: { parentId: string; index: number },
  dragId: string,
): Rect | null {
  const parentEl = doc.querySelector(`[data-frame-id="${dragOver.parentId}"]`) as HTMLElement | null
  if (!parentEl) return null

  // Get visible children excluding the dragged element (which has display:none in line mode)
  const children = Array.from(parentEl.children).filter((c) => {
    const el = c as HTMLElement
    return el.hasAttribute('data-frame-id') && el.getAttribute('data-frame-id') !== dragId
  }) as HTMLElement[]

  const parentRect = parentEl.getBoundingClientRect()
  const parentStyle = doc.defaultView!.getComputedStyle(parentEl)
  const dir = parentStyle.flexDirection || 'column'
  const isRow = dir === 'row' || dir === 'row-reverse'

  const LINE_THICKNESS = 3
  const LINE_INSET = 2 // small inset from parent edges

  if (children.length === 0) {
    // Empty parent: line at start
    if (isRow) {
      return { top: parentRect.top + LINE_INSET, left: parentRect.left + LINE_INSET, width: LINE_THICKNESS, height: parentRect.height - LINE_INSET * 2 }
    }
    return { top: parentRect.top + LINE_INSET, left: parentRect.left + LINE_INSET, width: parentRect.width - LINE_INSET * 2, height: LINE_THICKNESS }
  }

  const idx = dragOver.index
  if (isRow) {
    // Vertical line between children
    let x: number
    if (idx <= 0) {
      const firstRect = children[0].getBoundingClientRect()
      x = firstRect.left - 1
    } else if (idx >= children.length) {
      const lastRect = children[children.length - 1].getBoundingClientRect()
      x = lastRect.right + 1
    } else {
      const prevRect = children[idx - 1].getBoundingClientRect()
      const nextRect = children[idx].getBoundingClientRect()
      x = (prevRect.right + nextRect.left) / 2
    }
    return { top: parentRect.top + LINE_INSET, left: x - LINE_THICKNESS / 2, width: LINE_THICKNESS, height: parentRect.height - LINE_INSET * 2 }
  } else {
    // Horizontal line between children
    let y: number
    if (idx <= 0) {
      const firstRect = children[0].getBoundingClientRect()
      y = firstRect.top - 1
    } else if (idx >= children.length) {
      const lastRect = children[children.length - 1].getBoundingClientRect()
      y = lastRect.bottom + 1
    } else {
      const prevRect = children[idx - 1].getBoundingClientRect()
      const nextRect = children[idx].getBoundingClientRect()
      y = (prevRect.bottom + nextRect.top) / 2
    }
    return { top: y - LINE_THICKNESS / 2, left: parentRect.left + LINE_INSET, width: parentRect.width - LINE_INSET * 2, height: LINE_THICKNESS }
  }
}

export function SelectionOverlay() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<Document | null>(null)

  // Grab the iframe document from our own DOM node
  useEffect(() => {
    if (containerRef.current) setDoc(containerRef.current.ownerDocument)
  }, [])

  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  // Line mode: canvasDragOver is set AND it's a real frame drag (not a snippet)
  const isLineMode = !!canvasDragId && canvasDragId !== '__snippet__' && !!canvasDragOver

  const isDragging = !!canvasDragId && canvasDragId === selectedId
  const showSel = !previewMode && !!selectedId && !isDragging
  const showHov = !previewMode && !!hoveredId && hoveredId !== selectedId && !canvasDragId
  const selRect = useTrackedRect(selectedId, showSel, doc)
  const childRects = useChildRects(selectedId, showSel, doc, canvasDragId)

  // During drag: sibling outlines as slot guides (reorder mode only)
  const dragParentId = useFrameStore((s) => {
    if (!canvasDragId) return null
    const parent = findParent(s.root, canvasDragId)
    return parent?.id ?? null
  })
  const showDragGuides = !previewMode && !!canvasDragId && !isLineMode
  const dragSiblingRects = useChildRects(dragParentId, showDragGuides, doc, canvasDragId)

  // Blue insertion line for line mode
  const [lineRect, setLineRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!isLineMode || !canvasDragOver || !canvasDragId || !doc) { setLineRect(null); return }
    setLineRect(computeLineRect(doc, canvasDragOver, canvasDragId))
  }, [isLineMode, canvasDragOver?.parentId, canvasDragOver?.index, canvasDragId, doc])

  // Hover: recompute rect each time hoveredId changes (transient, no persistent tracking)
  const [hovRect, setHovRect] = useState<Rect | null>(null)
  const [hovChildRects, setHovChildRects] = useState<Rect[]>([])
  useLayoutEffect(() => {
    if (!showHov || !hoveredId || !doc) { setHovRect(null); setHovChildRects([]); return }
    const el = doc.querySelector(`[data-frame-id="${hoveredId}"]`) as HTMLElement | null
    if (!el) { setHovRect(null); setHovChildRects([]); return }
    const r = el.getBoundingClientRect()
    setHovRect({ top: r.top, left: r.left, width: r.width, height: r.height })

    // Child outlines on hover (same as selection, but transient)
    const frame = findInTree(useFrameStore.getState().root, hoveredId)
    if (frame?.type === 'box') {
      const rects = (frame as BoxElement).children
        .filter((c) => !c.hidden)
        .map((c) => {
          const cel = doc.querySelector(`[data-frame-id="${c.id}"]`) as HTMLElement | null
          if (!cel) return null
          const cr = cel.getBoundingClientRect()
          return { top: cr.top, left: cr.left, width: cr.width, height: cr.height }
        })
        .filter(Boolean) as Rect[]
      setHovChildRects(rects)
    } else {
      setHovChildRects([])
    }
  }, [hoveredId, showHov, doc])

  const SEL = 2
  const HOV = 1

  return (
    <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
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
      {/* Hover child outlines (dotted, same as selection children) */}
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
      {/* Drag: sibling outlines (slot guides) — reorder mode only */}
      {!isLineMode && dragSiblingRects.map((r, i) => (
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
      {/* Drag: blue insertion line — line mode only */}
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
