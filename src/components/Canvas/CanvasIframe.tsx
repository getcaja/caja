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

import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useFrameStore } from '../../store/frameStore'
import { FrameRenderer } from './FrameRenderer'
import { GoogleFontsLoader } from './GoogleFontsLoader'
// Raw CSS string — injected into iframe <style>, not the parent document
import frameRendererCSS from './FrameRenderer.css?raw'

// Canvas reset — form controls, default text color, scrollbar
const CANVAS_RESET_CSS = `
body {
  margin: 0;
  background: #ffffff;
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

  return (
    <div
      className={previewMode ? 'preview-mode' : ''}
      onMouseLeave={previewMode ? undefined : () => hover(null)}
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

  // Measure workspace container height for iframe viewport sizing
  useEffect(() => {
    const container = wrapperRef.current?.parentElement
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect) {
        setWorkspaceW(rect.width)
        setWorkspaceH(rect.height)
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Compute wrapper + iframe styles based on mode
  let wrapperStyle: React.CSSProperties
  let iframeStyle: React.CSSProperties

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
      // Breakpoint (fixed width + border) or Default zoomed (no border)
      const iframeW = canvasWidth || workspaceW
      const iframeH = workspaceH

      wrapperStyle = {
        width: iframeW * zoom,
        height: iframeH * zoom,
        flexShrink: 0,
        position: 'relative',
        margin: 'auto',
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
        border: isDefault ? 'none' : '3px solid #3f3f46',
        borderRadius: isDefault ? undefined : 6,
        boxSizing: isDefault ? undefined : ('border-box' as const),
      }
    }
  }

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <iframe ref={iframeRef} title="Caja Canvas" style={iframeStyle} />
    </div>
  )
}
