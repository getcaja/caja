/**
 * [Experiment] Renders the canvas inside an iframe.
 * The iframe's viewport = canvasWidth, making standard Tailwind
 * responsive classes (md:, sm:, max-md:) work natively.
 *
 * Architecture:
 * - Separate React root inside the iframe (createRoot)
 * - Same Zustand store (shared JS module singleton)
 * - Tailwind browser runtime loaded inside the iframe
 * - FrameRenderer.css injected into iframe head
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useFrameStore } from '../../store/frameStore'
import { FrameRenderer } from './FrameRenderer'
import { GoogleFontsLoader } from './GoogleFontsLoader'
import { resolveCanvasDrop } from '../../utils/canvasDrop'
// Raw CSS string — injected into iframe <style>, not the parent document
import frameRendererCSS from './FrameRenderer.css?raw'

// Canvas reset — form controls, default text color, scrollbar
const CANVAS_RESET_CSS = `
body {
  margin: 0;
  color: #1c1917;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
input, textarea, select, button {
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  border: none;
  outline: none;
  font: inherit;
  color: inherit;
  padding: 0;
  margin: 0;
  resize: none;
}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #71717a; }
`

// Tailwind theme — needed for editor overlay classes (surface-3 dashed outline, etc.)
const TAILWIND_THEME = `@theme {
  --font-mono: SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --color-surface-0: #111114;
  --color-surface-1: #1b1b1f;
  --color-surface-2: #26262b;
  --color-surface-3: #3f3f46;
  --color-accent: #20744A;
  --color-accent-hover: #25875a;
  --color-text-primary: #f0f0f2;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  --color-border: #32323a;
  --color-border-accent: #3e3e48;
  --color-focus: #4A90D9;
  --color-destructive: #ef4444;
}`

/**
 * Inner component — rendered inside the iframe's React root.
 * Uses the same Zustand store as the parent app.
 */
function IframeCanvas() {
  const root = useFrameStore((s) => s.root)
  const hover = useFrameStore((s) => s.hover)
  const previewMode = useFrameStore((s) => s.previewMode)

  const onPreviewClick = useCallback((e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
    if (!anchor) return
    const href = anchor.getAttribute('href')
    if (!href) return

    const { pages, setActivePage } = useFrameStore.getState()
    const targetPage = pages.find((p) => p.route === href)
    if (targetPage) {
      e.preventDefault()
      setActivePage(targetPage.id)
    }
  }, [])

  return (
    <div
      className={previewMode ? 'preview-mode' : ''}
      onMouseLeave={previewMode ? undefined : () => hover(null)}
      onClick={previewMode ? onPreviewClick : undefined}
    >
      <FrameRenderer frame={root} />
      <GoogleFontsLoader />
    </div>
  )
}

export function CanvasIframe() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<Root | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [workspaceW, setWorkspaceW] = useState(1200)
  const [workspaceH, setWorkspaceH] = useState(800)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const previewMode = useFrameStore((s) => s.previewMode)
  const pages = useFrameStore((s) => s.pages)
  const isSnippetDrag = useFrameStore((s) => s.snippetDragFrame !== null)
  const rootBgValue = useFrameStore((s) => s.root.bg.value)

  // Sync root frame's background to the iframe <body>.
  // Per CSS spec, body's background propagates to the viewport canvas,
  // so it fills the entire viewport even if the root div is shorter.
  useEffect(() => {
    const body = iframeRef.current?.contentDocument?.body
    if (!body) return
    body.style.backgroundColor = rootBgValue || ''
  }, [rootBgValue])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return

    // Build the iframe document
    doc.open()
    doc.write('<!DOCTYPE html><html><head></head><body><div id="caja-root"></div></body></html>')
    doc.close()

    // 1. Tailwind theme config
    const theme = doc.createElement('style')
    theme.setAttribute('type', 'text/tailwindcss')
    theme.textContent = TAILWIND_THEME
    doc.head.appendChild(theme)

    // 2. Canvas reset
    const reset = doc.createElement('style')
    reset.textContent = CANVAS_RESET_CSS
    doc.head.appendChild(reset)

    // 3. FrameRenderer CSS (overlays, selection, hover, etc.)
    const frCss = doc.createElement('style')
    frCss.textContent = frameRendererCSS
    doc.head.appendChild(frCss)

    // 4. Tailwind browser runtime — load last so it sees theme + initial DOM
    const script = doc.createElement('script')
    script.src = '/tailwindcss-browser.js'
    script.onload = () => {
      const mount = doc.getElementById('caja-root')
      if (!mount) return
      const reactRoot = createRoot(mount)
      reactRoot.render(<IframeCanvas />)
      rootRef.current = reactRoot
    }
    doc.head.appendChild(script)

    // Register iframe window in store so App.tsx can listen for keyboard events
    const iframeWin = iframe.contentWindow
    if (iframeWin) {
      useFrameStore.getState().setIframeWindow(iframeWin)
    }

    return () => {
      useFrameStore.getState().setIframeWindow(null)
      rootRef.current?.unmount()
      rootRef.current = null
    }
  }, [])

  // Measure the scroll container viewport for iframe sizing.
  // Must observe the scrollable ancestor (overflow:auto), NOT a content wrapper,
  // to avoid ResizeObserver feedback loops when content changes size.
  // clientWidth/clientHeight give the viewport dimensions (includes padding).
  // The border is on the wrapper div (not the iframe), so the iframe's
  // viewport = workspaceH exactly, matching 100vh in preview mode.
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

  // Toggle .cmd-held on iframe body so CSS can show pointer cursor on navigable links.
  // Listen on both parent and iframe windows — focus could be in either.
  useEffect(() => {
    if (previewMode) return
    const iframeBody = iframeRef.current?.contentDocument?.body
    if (!iframeBody) return
    const iframeWin = iframeRef.current?.contentWindow
    const toggle = (e: KeyboardEvent) => iframeBody.classList.toggle('cmd-held', e.metaKey)
    const clear = () => iframeBody.classList.remove('cmd-held')
    window.addEventListener('keydown', toggle)
    window.addEventListener('keyup', toggle)
    window.addEventListener('blur', clear)
    iframeWin?.addEventListener('keydown', toggle)
    iframeWin?.addEventListener('keyup', toggle)
    iframeWin?.addEventListener('blur', clear)
    return () => {
      iframeBody.classList.remove('cmd-held')
      window.removeEventListener('keydown', toggle)
      window.removeEventListener('keyup', toggle)
      window.removeEventListener('blur', clear)
      iframeWin?.removeEventListener('keydown', toggle)
      iframeWin?.removeEventListener('keyup', toggle)
      iframeWin?.removeEventListener('blur', clear)
    }
  }, [previewMode])

  // --- Snippet → canvas drag handlers (HTML5 DnD, cross-iframe) ---
  // The iframe swallows drag events, so we render a transparent overlay on top
  // of the iframe during snippet drags. The overlay captures dragover/drop,
  // then we use iframeDoc.elementFromPoint() to resolve the drop target.

  const onOverlayDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const iframe = iframeRef.current
    if (!iframe) return
    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) return

    const store = useFrameStore.getState()
    // Set canvasDragId lazily on first dragover — suppresses hover highlights in canvas
    if (!store.canvasDragId) store.setCanvasDrag('__snippet__')

    const rect = iframe.getBoundingClientRect()
    const borderLeft = iframe.clientLeft
    const borderTop = iframe.clientTop
    const iframeX = (e.clientX - rect.left - borderLeft) / store.canvasZoom
    const iframeY = (e.clientY - rect.top - borderTop) / store.canvasZoom

    const result = resolveCanvasDrop(iframeDoc, iframeX, iframeY, '__snippet__', store.root)
    store.setCanvasDragOver(result)
  }, [])

  const onOverlayDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const { snippetDragFrame, canvasDragOver, insertFrameAt, setCanvasDrag, setCanvasDragOver, setSnippetDragFrame } = useFrameStore.getState()
    if (!snippetDragFrame || !canvasDragOver) return
    insertFrameAt(canvasDragOver.parentId, snippetDragFrame, canvasDragOver.index)
    setCanvasDrag(null)
    setCanvasDragOver(null)
    setSnippetDragFrame(null)
  }, [])

  const onOverlayDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the overlay entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    const store = useFrameStore.getState()
    store.setCanvasDragOver(null)
    store.setCanvasDrag(null)
  }, [])

  // Compute wrapper + iframe styles based on mode
  let wrapperStyle: React.CSSProperties
  let iframeStyle: React.CSSProperties
  let showDeviceFrame = false

  if (previewMode) {
    // Preview: fill entire workspace, no border/zoom
    wrapperStyle = { width: '100%', height: '100%' }
    iframeStyle = { width: '100%', height: '100%', border: 'none', display: 'block' }
  } else {
    const zoom = canvasZoom
    const isDefault = canvasWidth === null

    if (isDefault && zoom === 1) {
      // Default at 100%: fill workspace edge-to-edge, no border
      wrapperStyle = { width: '100%', height: '100%' }
      iframeStyle = { width: '100%', height: '100%', display: 'block', border: 'none' }
    } else {
      showDeviceFrame = !isDefault
      // Breakpoint (fixed width + border) or Default zoomed (no border)
      const iframeW = canvasWidth || workspaceW
      // Subtract chrome (page label + matching bottom spacer) so iframe fits without overflow
      const hasPageLabel = canvasWidth !== null && pages.length > 1
      const chromeH = hasPageLabel ? 64 : 0 // 32px label + 32px bottom spacer
      const iframeH = workspaceH - chromeH

      wrapperStyle = {
        width: iframeW * zoom,
        height: iframeH * zoom,
        flexShrink: 0,
        position: 'relative',
        margin: hasPageLabel ? '0 auto' : 'auto',
      }

      iframeStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: iframeW,
        height: iframeH,
        transform: zoom !== 1 ? `scale(${zoom})` : undefined,
        transformOrigin: 'top left',
        display: 'block',
        border: 'none',
        borderRadius: isDefault ? undefined : 6,
      }
    }
  }

  return (
    <div ref={wrapperRef} style={{ ...wrapperStyle, position: 'relative' }}>
      <iframe ref={iframeRef} title="Caja Canvas" style={iframeStyle} />
      {/* Device frame chrome — separate element on top of iframe so it's
          immune to iframe repaints (blur, shadows, transitions inside). */}
      {showDeviceFrame && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 6,
            outline: '3px solid #3f3f46',
            outlineOffset: -3,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
      {isSnippetDrag && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10 }}
          onDragOver={onOverlayDragOver}
          onDrop={onOverlayDrop}
          onDragLeave={onOverlayDragLeave}
        />
      )}
    </div>
  )
}
