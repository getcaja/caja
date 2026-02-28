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
import './FrameRenderer.css'

export function CanvasInline() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [workspaceW, setWorkspaceW] = useState(1200)
  const [workspaceH, setWorkspaceH] = useState(800)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const previewMode = useFrameStore((s) => s.previewMode)
  const rootBgValue = useFrameStore((s) => s.root.bg.value)
  const root = useFrameStore((s) => s.root)
  const hover = useFrameStore((s) => s.hover)

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
    useFrameStore.getState().select(null)
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

  if (previewMode) {
    wrapperStyle = { width: '100%', height: '100%' }
    canvasStyle = {
      ...canvasResetStyle,
      width: '100%',
      minHeight: '100%',
    }
  } else {
    const zoom = canvasZoom

    if (zoom === 1) {
      wrapperStyle = { width: '100%', height: '100%' }
      canvasStyle = {
        ...canvasResetStyle,
        width: '100%',
        maxWidth: canvasWidth ?? undefined,
        margin: '0 auto',
      }
    } else {
      const canvasW = canvasWidth || workspaceW
      const canvasH = workspaceH

      wrapperStyle = {
        width: canvasW * zoom,
        height: canvasH * zoom,
        flexShrink: 0,
        position: 'relative',
        margin: 'auto',
      }

      canvasStyle = {
        ...canvasResetStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        width: canvasW,
        height: canvasH,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left',
      }
    }
  }

  return (
    <div ref={wrapperRef} style={{ ...wrapperStyle, position: 'relative' }}>
      <div
        ref={canvasRef}
        id="caja-canvas"
        className="@container"
        style={canvasStyle}
        onMouseLeave={previewMode ? undefined : () => hover(null)}
        onClick={previewMode ? onPreviewClick : onCanvasClick}
      >
        <ErrorBoundary fallback="inline" resetKey={root.id}>
          <FrameRenderer frame={root} />
        </ErrorBoundary>
        <GoogleFontsLoader />
      </div>
      {/* SelectionOverlay must be OUTSIDE the @container div.
          container-type: inline-size implies layout containment which creates
          a new containing block for position:fixed — that would make the
          fixed insertion line position relative to the canvas instead of the
          viewport, causing coordinate mismatch with getBoundingClientRect(). */}
      {!previewMode && <SelectionOverlay />}
    </div>
  )
}
