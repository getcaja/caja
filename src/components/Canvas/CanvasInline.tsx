/**
 * Inline canvas — renders directly in the main React tree.
 *
 * Replaces CanvasIframe: no iframe boundary, no separate React root,
 * no cross-boundary event proxying. Responsive behaviour uses container
 * queries (@sm:, @md:, etc.) instead of iframe viewport width.
 *
 * The canvas wrapper has `container-type: inline-size` so that
 * Tailwind container-query utilities trigger at the wrapper's width.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { FrameRenderer } from './FrameRenderer'
import { SelectionOverlay } from './SelectionOverlay'
import { GoogleFontsLoader } from './GoogleFontsLoader'
import { ErrorBoundary } from '../ErrorBoundary'
import { useCanvasContextMenu, CanvasContextMenu } from './CanvasContextMenu'
import './FrameRenderer.css'

/* ── Zoom-to-point helper ────────────────────────────────────
 * Shared by pinch-to-zoom and keyboard shortcuts.
 * cursorX/cursorY are relative to the scroll container viewport.
 * If null, zooms toward the center of the viewport. */
let _scrollEl: HTMLElement | null = null
let _cursorX: number | null = null
let _cursorY: number | null = null

export function canvasZoomTo(nextZoom: number) {
  // Fallback: if _scrollEl was lost (e.g. after HMR), re-acquire from DOM
  if (!_scrollEl) {
    const wrapper = document.querySelector<HTMLElement>('[data-canvas-wrapper]')
    _scrollEl = wrapper?.parentElement ?? null
  }
  const scrollEl = _scrollEl
  if (!scrollEl) return
  const { canvasZoom, setCanvasZoom } = useFrameStore.getState()
  if (nextZoom === canvasZoom) return

  const anchorX = _cursorX ?? scrollEl.clientWidth / 2
  const anchorY = _cursorY ?? scrollEl.clientHeight / 2

  const contentX = (scrollEl.scrollLeft + anchorX) / canvasZoom
  const contentY = (scrollEl.scrollTop + anchorY) / canvasZoom

  setCanvasZoom(nextZoom)

  requestAnimationFrame(() => {
    scrollEl.scrollLeft = contentX * nextZoom - anchorX
    scrollEl.scrollTop = contentY * nextZoom - anchorY
  })
}

export const CANVAS_GUTTER = 32

export function CanvasInline() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [workspaceW, setWorkspaceW] = useState(1200)
  const [workspaceH, setWorkspaceH] = useState(800)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const canvasTool = useFrameStore((s) => s.canvasTool)
  const previewMode = useFrameStore((s) => s.previewMode)
  const rootBgValue = useFrameStore((s) => s.root.bg.value)
  const root = useFrameStore((s) => s.root)
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const hover = useFrameStore((s) => s.hover)

  const GUTTER = CANVAS_GUTTER
  const fluidW = Math.max(320, workspaceW - GUTTER * 2)

  // In edit mode, render only the master being edited
  const renderFrame = editingComponentId && root.type === 'box'
    ? root.children.find((c) => c.id === editingComponentId) ?? root
    : root

  const onPreviewClick = useCallback((e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href) return

    // Always prevent default — never let the browser navigate the editor window
    e.preventDefault()

    const { pages, setActivePage } = useFrameStore.getState()
    const targetPage = pages.find((p) => p.route === href)
    if (targetPage) {
      setActivePage(targetPage.id)
    }
  }, [])

  const onCanvasClick = useCallback(() => {
    const store = useFrameStore.getState()
    if (store.canvasTool === 'text') {
      store.addChild(store.root.id, 'text', { content: '' })
      const newId = useFrameStore.getState().selectedId
      if (newId) useFrameStore.setState({ pendingTextEdit: newId })
      return
    }
    if (store.canvasTool === 'frame') {
      store.addChild(store.root.id, 'box')
      return
    }
    if (store.canvasTool === 'image') {
      const src = store.pendingImageSrc
      if (src) {
        store.addChild(store.root.id, 'image', { src })
        store.setPendingImageSrc(null)
        store.setCanvasTool('pointer')
      }
      return
    }
    store.select(store.root.id)
  }, [])

  const ctxMenu = useCanvasContextMenu()

  // Track actual canvas content height (for zoom != 1 where we need explicit dimensions)
  const [contentH, setContentH] = useState(0)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContentH(el.scrollHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Measure scroll container for workspace dimensions (used for zoomed sizing)
  useEffect(() => {
    let container = wrapperRef.current?.parentElement
    while (container && container !== document.body) {
      const { overflow } = getComputedStyle(container)
      if (overflow === 'auto' || overflow === 'scroll') break
      container = container.parentElement
    }
    if (!container) return
    const el = container
    const ro = new ResizeObserver(() => {
      setWorkspaceW(el.clientWidth)
      setWorkspaceH(el.clientHeight)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Track scroll container + cursor for zoom-to-point
  useEffect(() => {
    const scrollEl = wrapperRef.current?.parentElement
    if (!scrollEl || previewMode) { _scrollEl = null; return }
    _scrollEl = scrollEl
    const onMove = (e: MouseEvent) => {
      const rect = scrollEl.getBoundingClientRect()
      _cursorX = e.clientX - rect.left
      _cursorY = e.clientY - rect.top
    }
    const onLeave = () => { _cursorX = null; _cursorY = null }
    scrollEl.addEventListener('mousemove', onMove)
    scrollEl.addEventListener('mouseleave', onLeave)

    // Pinch-to-zoom (wheel + ctrlKey)
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const { canvasZoom } = useFrameStore.getState()
      const delta = -e.deltaY * 0.01
      const next = Math.round(Math.min(2, Math.max(0.25, canvasZoom + delta)) * 100) / 100
      canvasZoomTo(next)
    }
    scrollEl.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      _scrollEl = null
      scrollEl.removeEventListener('mousemove', onMove)
      scrollEl.removeEventListener('mouseleave', onLeave)
      scrollEl.removeEventListener('wheel', onWheel)
    }
  }, [previewMode])

  // Toggle data-cmd-held attribute on canvas div for CSS link cursor
  useEffect(() => {
    if (previewMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const toggle = (e: KeyboardEvent) => {
      if (e.metaKey) canvas.setAttribute('data-cmd-held', '')
      else canvas.removeAttribute('data-cmd-held')
    }
    const clear = () => canvas.removeAttribute('data-cmd-held')
    window.addEventListener('keydown', toggle)
    window.addEventListener('keyup', toggle)
    window.addEventListener('blur', clear)
    return () => {
      canvas.removeAttribute('data-cmd-held')
      window.removeEventListener('keydown', toggle)
      window.removeEventListener('keyup', toggle)
      window.removeEventListener('blur', clear)
    }
  }, [previewMode])

  // Compute styles
  let wrapperStyle: React.CSSProperties
  let canvasStyle: React.CSSProperties

  const canvasResetStyle: React.CSSProperties = {
    color: '#1c1917',
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 16,
    WebkitFontSmoothing: 'antialiased',
    minHeight: '100%',
    position: 'relative',
    backgroundColor: rootBgValue || '#ffffff',
  }

  if (editingComponentId) {
    // Component edit mode: center the component in the canvas
    wrapperStyle = { width: '100%', height: '100%' }
    canvasStyle = {
      ...canvasResetStyle,
      width: '100%',
      minHeight: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f4',
    }
  } else if (previewMode) {
    wrapperStyle = { width: '100%', height: '100%' }
    canvasStyle = {
      ...canvasResetStyle,
      width: '100%',
      minHeight: '100%',
    }
  } else {
    const userZoom = canvasZoom

    // Canvas is always fluid — canvasWidth acts as a max-width constraint
    // null = no constraint (LG), number = max-width (MD/SM preset)
    const maxW = canvasWidth ?? Infinity
    const effectiveFluid = Math.min(fluidW, maxW)

    if (userZoom === 1) {
      wrapperStyle = { width: '100%', height: '100%' }
      // Use CSS min() for smooth resize without React re-renders
      const widthExpr = canvasWidth
        ? `min(${canvasWidth}px, calc(100% - ${GUTTER * 2}px))`
        : `calc(100% - ${GUTTER * 2}px)`
      canvasStyle = { ...canvasResetStyle, width: widthExpr, margin: '0 auto' }
    } else {
      const canvasW = effectiveFluid
      const canvasH = Math.max(workspaceH, contentH)
      wrapperStyle = { width: canvasW * userZoom, height: canvasH * userZoom, flexShrink: 0, position: 'relative', margin: 'auto' }
      canvasStyle = { ...canvasResetStyle, position: 'absolute', top: 0, left: 0, width: canvasW, minHeight: workspaceH, transform: `scale(${userZoom})`, transformOrigin: 'top left' }
    }
  }

  return (
    <div ref={wrapperRef} data-canvas-wrapper style={{ ...wrapperStyle, position: 'relative' }}>
      <div
        ref={canvasRef}
        id="caja-canvas"
        className="@container"
        style={{ ...canvasStyle, ...((canvasTool === 'text' || canvasTool === 'frame' || canvasTool === 'image') && !previewMode ? { cursor: 'crosshair' } : {}) }}
        onMouseLeave={previewMode ? undefined : () => hover(null)}
        onClick={previewMode ? onPreviewClick : onCanvasClick}
        onContextMenu={previewMode ? undefined : ctxMenu.onContextMenu}
      >
        <ErrorBoundary fallback="inline" resetKey={renderFrame.id}>
          <FrameRenderer frame={renderFrame} />
        </ErrorBoundary>
        <GoogleFontsLoader />
      </div>
      {/* Canvas resize handles + gutter masks — see Canvas.tsx */}
      {/* SelectionOverlay must be OUTSIDE the @container div.
          container-type: inline-size implies layout containment which creates
          a new containing block for position:fixed — that would make the
          fixed insertion line position relative to the canvas instead of the
          viewport, causing coordinate mismatch with getBoundingClientRect(). */}
      {!previewMode && <SelectionOverlay />}
      {!previewMode && ctxMenu.menu && (
        <CanvasContextMenu menu={ctxMenu.menu} close={ctxMenu.close} />
      )}
    </div>
  )
}
