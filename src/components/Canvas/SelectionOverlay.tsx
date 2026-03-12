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
import { useFrameStore, findParent, isRootId } from '../../store/frameStore'
import { useHoverStore } from '../../store/hoverStore'
import { getDrillContext, resolveToContextLevel } from '../../store/treeHelpers'

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
  selectedParentId: string | null
  showSel: boolean
  canvasDragId: string | null
  showDragGuides: boolean
  dragTargetParentId: string | null
}): string[] {
  const { selectedId, selectedIds, selectedParentId, showSel, canvasDragId, showDragGuides, dragTargetParentId } = state
  const rules: string[] = []
  const color = 'var(--color-accent)'

  if (showSel) {
    // Parent hint — dotted outline on immediate parent (spatial context)
    if (selectedParentId) {
      rules.push(`[data-frame-id="${selectedParentId}"] { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
    }
    // Primary selection — thin 1px solid (persistent, subtle)
    if (selectedId) {
      rules.push(`[data-frame-id="${selectedId}"] { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`)
      const excDrag = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
      rules.push(`[data-frame-id="${selectedId}"] > [data-frame-id]${excDrag} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
    }
    // Secondary selections — thin 1px
    for (const id of selectedIds) {
      if (id === selectedId) continue
      rules.push(`[data-frame-id="${id}"] { outline: 1px solid ${color} !important; outline-offset: -1px !important; }`)
    }
  }

  // Build exclusion selector for selected elements so drag child-hints don't overwrite
  if (showDragGuides && dragTargetParentId) {
    const selExclusions: string[] = []
    if (selectedId) selExclusions.push(`:not([data-frame-id="${selectedId}"])`)
    for (const id of selectedIds) {
      if (id !== selectedId) selExclusions.push(`:not([data-frame-id="${id}"])`)
    }
    const exc = canvasDragId ? `:not([data-frame-id="${canvasDragId}"])` : ''
    rules.push(`[data-frame-id="${dragTargetParentId}"] > [data-frame-id]${exc}${selExclusions.join('')} { outline: 1px dotted ${color} !important; outline-offset: -1px; }`)
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

/** Padding for a single element (in px, already scaled by zoom). */
interface PaddingInfo {
  el: Rect
  top: number
  right: number
  bottom: number
  left: number
}

/** Gap indicators between children of a flex/grid container. */
interface GapInfo {
  rects: Rect[]
}

/** Read computed padding of a frame element relative to a wrapper element. */
function computePaddingInfo(
  doc: Document,
  frameId: string,
  wrapperEl: HTMLElement,
  zoom: number,
): PaddingInfo | null {
  const el = doc.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null
  if (!el) return null

  const cs = doc.defaultView!.getComputedStyle(el)
  const pt = parseFloat(cs.paddingTop) || 0
  const pr = parseFloat(cs.paddingRight) || 0
  const pb = parseFloat(cs.paddingBottom) || 0
  const pl = parseFloat(cs.paddingLeft) || 0

  if (pt === 0 && pr === 0 && pb === 0 && pl === 0) return null

  const elRect = el.getBoundingClientRect()
  const wrapperRect = wrapperEl.getBoundingClientRect()

  return {
    el: {
      top: elRect.top - wrapperRect.top,
      left: elRect.left - wrapperRect.left,
      width: elRect.width,
      height: elRect.height,
    },
    top: pt * zoom,
    right: pr * zoom,
    bottom: pb * zoom,
    left: pl * zoom,
  }
}

/** Compute gap rects between children of a flex/grid container. */
function computeGapInfo(
  doc: Document,
  frameId: string,
  wrapperEl: HTMLElement,
): GapInfo | null {
  const el = doc.querySelector(`[data-frame-id="${frameId}"]`) as HTMLElement | null
  if (!el) return null

  const cs = doc.defaultView!.getComputedStyle(el)
  const gap = parseFloat(cs.gap) || 0
  if (gap === 0) return null

  const children = Array.from(el.children).filter(
    (c) => (c as HTMLElement).hasAttribute('data-frame-id')
  ) as HTMLElement[]
  if (children.length < 2) return null

  const display = cs.display
  let isRow: boolean
  if (display === 'flex' || display === 'inline-flex') {
    const dir = cs.flexDirection
    isRow = dir === 'row' || dir === 'row-reverse'
  } else if (display === 'grid' || display === 'inline-grid') {
    const cols = cs.gridTemplateColumns
    isRow = !!cols && cols.trim().split(/\s+/).length > 1
  } else {
    return null
  }

  const wrapperRect = wrapperEl.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()

  // Use container's content box for cross-axis extent (resilient to child transforms)
  const pt = parseFloat(cs.paddingTop) || 0
  const pr = parseFloat(cs.paddingRight) || 0
  const pb = parseFloat(cs.paddingBottom) || 0
  const pl = parseFloat(cs.paddingLeft) || 0
  const contentTop = elRect.top + pt - wrapperRect.top
  const contentLeft = elRect.left + pl - wrapperRect.left
  const contentHeight = elRect.height - pt - pb
  const contentWidth = elRect.width - pl - pr

  const rects: Rect[] = []

  for (let i = 0; i < children.length - 1; i++) {
    const cur = children[i].getBoundingClientRect()
    const next = children[i + 1].getBoundingClientRect()

    if (isRow) {
      const left = cur.right - wrapperRect.left
      const gapWidth = next.left - cur.right
      if (gapWidth > 0) {
        rects.push({
          top: contentTop,
          left,
          width: gapWidth,
          height: contentHeight,
        })
      }
    } else {
      const top = cur.bottom - wrapperRect.top
      const gapHeight = next.top - cur.bottom
      if (gapHeight > 0) {
        rects.push({
          top,
          left: contentLeft,
          width: contentWidth,
          height: gapHeight,
        })
      }
    }
  }

  return rects.length > 0 ? { rects } : null
}

/** Renders semi-transparent margin indicators around an element. */
function MarginRects({ info }: { info: MarginInfo }) {
  const fill = 'rgba(246, 178, 51, 0.12)'
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

/** Renders semi-transparent padding indicators inside an element. */
function PaddingRects({ info }: { info: PaddingInfo }) {
  const fill = 'rgba(46, 196, 112, 0.10)'
  const common = { position: 'absolute' as const, pointerEvents: 'none' as const, background: fill }

  const rects: React.CSSProperties[] = []

  if (info.top > 0) {
    rects.push({ ...common, top: info.el.top, left: info.el.left, width: info.el.width, height: info.top })
  }
  if (info.bottom > 0) {
    rects.push({ ...common, top: info.el.top + info.el.height - info.bottom, left: info.el.left, width: info.el.width, height: info.bottom })
  }
  if (info.left > 0) {
    rects.push({ ...common, top: info.el.top + info.top, left: info.el.left, width: info.left, height: info.el.height - info.top - info.bottom })
  }
  if (info.right > 0) {
    rects.push({ ...common, top: info.el.top + info.top, left: info.el.left + info.el.width - info.right, width: info.right, height: info.el.height - info.top - info.bottom })
  }

  return (
    <>
      {rects.map((style, i) => (
        <div key={i} style={style} />
      ))}
    </>
  )
}

/** Renders semi-transparent gap indicators between children. */
function GapRects({ info }: { info: GapInfo }) {
  const fill = 'rgba(12, 140, 233, 0.12)'
  const common = { position: 'absolute' as const, pointerEvents: 'none' as const, background: fill }

  return (
    <>
      {info.rects.map((rect, i) => (
        <div key={i} style={{ ...common, top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
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

  // Parent hint: show dotted outline on the immediate parent of the selected element
  const selectedParentId = useFrameStore((s) => {
    if (!s.selectedId || isRootId(s.selectedId)) return null
    const parent = findParent(s.root, s.selectedId)
    if (!parent || isRootId(parent.id)) return null
    return parent.id
  })

  const isLineMode = !!canvasDragId && !!canvasDragOver
  const isDragging = !!canvasDragId && canvasDragId === selectedId
  const showSel = !previewMode && (!!selectedId || selectedIds.size > 0) && !isDragging

  // Hover outline — managed via direct DOM manipulation for performance.
  // Bypasses React render cycle entirely (critical for 100+ frame trees).
  const hoverElRef = useRef<HTMLElement | null>(null)
  const hoverChildRulesRef = useRef<HTMLStyleElement | null>(null)
  useEffect(() => {
    const applyHover = () => {
      const prevEl = hoverElRef.current
      // Clear previous hover
      if (prevEl) {
        prevEl.style.outline = ''
        prevEl.style.outlineOffset = ''
        hoverElRef.current = null
      }
      if (hoverChildRulesRef.current) {
        hoverChildRulesRef.current.textContent = ''
      }

      const h = useHoverStore.getState()
      const s = useFrameStore.getState()
      if (!h.hoveredId || s.previewMode || s.canvasDragId || !doc) return

      // Resolve effective hover ID (drill-down for canvas, exact for tree)
      let effectiveId: string | null = h.hoveredId
      if (!h.isTreeHover && !s.deepSelect) {
        const contextId = getDrillContext(s.root, s.selectedId)
        effectiveId = resolveToContextLevel(s.root, contextId, h.hoveredId)
      }
      if (!effectiveId) return

      const el = doc.querySelector(`[data-frame-id="${effectiveId}"]`) as HTMLElement | null
      if (!el) return

      el.style.outline = '2px solid var(--color-accent)'
      el.style.outlineOffset = '-2px'
      hoverElRef.current = el

      // Child hints (dotted outlines on direct children) — only for canvas hover.
      // Tree hover skips this: user already sees structure in the tree, and the CSS
      // injection + recalc across 100+ elements is the main source of hover lag.
      if (!h.isTreeHover) {
        if (!hoverChildRulesRef.current) {
          hoverChildRulesRef.current = doc.createElement('style')
          doc.head.appendChild(hoverChildRulesRef.current)
        }
        const excParts: string[] = []
        if (s.selectedId) excParts.push(`:not([data-frame-id="${s.selectedId}"])`)
        for (const id of s.selectedIds) {
          if (id !== s.selectedId) excParts.push(`:not([data-frame-id="${id}"])`)
        }
        hoverChildRulesRef.current.textContent = `[data-frame-id="${effectiveId}"] > [data-frame-id]${excParts.join('')} { outline: 1px dotted var(--color-accent) !important; outline-offset: -1px; }`
      }
    }
    // Subscribe to hover store (fires only on hover changes, not on every main store update)
    const unsubHover = useHoverStore.subscribe(applyHover)
    return () => {
      unsubHover()
      if (hoverChildRulesRef.current) {
        hoverChildRulesRef.current.remove()
        hoverChildRulesRef.current = null
      }
    }
  }, [doc])

  const dragTargetParentId = canvasDragOver?.parentId ?? null
  const showDragGuides = !previewMode && !!canvasDragId && !!dragTargetParentId

  // Blue insertion line — only positioned element needed
  const [lineRect, setLineRect] = useState<Rect | null>(null)
  useLayoutEffect(() => {
    if (!isLineMode || !canvasDragOver || !canvasDragId || !doc) { setLineRect(null); return }
    setLineRect(computeLineRect(doc, canvasDragOver))
  }, [isLineMode, canvasDragOver?.parentId, canvasDragOver?.index, canvasDragId, doc])

  const rules = buildOverlayRules({ selectedId, selectedIds, selectedParentId, showSel, canvasDragId, showDragGuides, dragTargetParentId })

  // Margin overlays — blue semi-transparent rects showing margin areas.
  // Triggers: hover on canvas element, or hovering margin inputs in panel.
  const zoom = useFrameStore((s) => s.canvasZoom)
  const root = useFrameStore((s) => s.root)
  const showMarginOverlay = useFrameStore((s) => s.showMarginOverlay)
  const showPaddingOverlay = useFrameStore((s) => s.showPaddingOverlay)
  const showGapOverlay = useFrameStore((s) => s.showGapOverlay)
  const [marginInfos, setMarginInfos] = useState<MarginInfo[]>([])
  const [paddingInfos, setPaddingInfos] = useState<PaddingInfo[]>([])
  const [gapInfos, setGapInfos] = useState<GapInfo[]>([])
  useLayoutEffect(() => {
    if (!doc) { setMarginInfos([]); setPaddingInfos([]); setGapInfos([]); return }
    const raf = requestAnimationFrame(() => {
      const wrapper = doc.querySelector('[data-canvas-wrapper]') as HTMLElement | null
      if (!wrapper) { setMarginInfos([]); setPaddingInfos([]); setGapInfos([]); return }

      const margins: MarginInfo[] = []
      const paddings: PaddingInfo[] = []
      const gaps: GapInfo[] = []

      if (showMarginOverlay && selectedId) {
        const info = computeMarginInfo(doc, selectedId, wrapper, zoom)
        if (info) margins.push(info)
      }

      if (showPaddingOverlay && selectedId) {
        const info = computePaddingInfo(doc, selectedId, wrapper, zoom)
        if (info) paddings.push(info)
      }

      if (showGapOverlay && selectedId) {
        const info = computeGapInfo(doc, selectedId, wrapper)
        if (info) gaps.push(info)
      }

      setMarginInfos(margins)
      setPaddingInfos(paddings)
      setGapInfos(gaps)
    })
    return () => cancelAnimationFrame(raf)
  }, [selectedId, showSel, showMarginOverlay, showPaddingOverlay, showGapOverlay, doc, zoom, root])

  return (
    <>
      <span ref={anchorRef} style={{ display: 'none' }} />
      {rules.length > 0 && <style>{rules.join('\n')}</style>}
      {marginInfos.map((info, i) => <MarginRects key={i} info={info} />)}
      {paddingInfos.map((info, i) => <PaddingRects key={i} info={info} />)}
      {gapInfos.map((info, i) => <GapRects key={i} info={info} />)}
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
