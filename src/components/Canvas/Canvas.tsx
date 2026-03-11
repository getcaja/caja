import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { CanvasInline, CANVAS_GUTTER } from './CanvasInline'
import { CanvasHints } from './CanvasHints'
import { Toolbar } from './Toolbar'

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const showToolbar = useFrameStore((s) => s.showToolbar)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollW, setScrollW] = useState(1200)

  // Measure scroll container for gutter mask sizing
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setScrollW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Gutter masks + handles — computed at scroll container level so they work at all zoom levels
  const fluidW = Math.max(320, scrollW - CANVAS_GUTTER * 2)
  const effectiveCanvasW = Math.min(fluidW, canvasWidth ?? Infinity)
  const gutterW = Math.max(CANVAS_GUTTER, (scrollW - effectiveCanvasW * canvasZoom) / 2)
  // Hide handles when canvas fills or overflows the viewport (zoom > ~1)
  // Hide handles when canvas overflows the viewport (scaled canvas wider than scroll area)
  const showHandles = !previewMode && !editingComponentId && effectiveCanvasW * canvasZoom < scrollW

  // Canvas resize handles — drag to set width, double-click to reset to fluid
  const [handleDragging, setHandleDragging] = useState(false)
  const [handleHovered, setHandleHovered] = useState(false)
  const onHandleDown = useCallback((side: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const { canvasWidth: startCW, canvasZoom: zoom } = useFrameStore.getState()
    const maxW = Math.max(320, scrollW - CANVAS_GUTTER * 2)
    const startWidth = Math.min(startCW ?? maxW, maxW)
    setHandleDragging(true)

    const onMove = (me: MouseEvent) => {
      const delta = side === 'right'
        ? (me.clientX - startX) * 2 / zoom
        : (startX - me.clientX) * 2 / zoom
      const newWidth = Math.round(Math.max(320, Math.min(maxW, startWidth + delta)))
      if (newWidth >= maxW - 16) {
        useFrameStore.getState().setCanvasWidth(null)
      } else {
        useFrameStore.getState().setCanvasWidth(newWidth)
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setHandleDragging(false)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [scrollW])

  const onHandleDblClick = useCallback(() => {
    useFrameStore.getState().setCanvasWidth(null)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Scroll area + gutter masks + handles share a relative wrapper */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto flex"
          style={previewMode ? undefined : { backgroundColor: 'var(--color-canvas-bg)' }}
        >
          <CanvasInline />
          {!hasChildren && !previewMode && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="fg-subtle text-[12px]">Add an element to start, or ask an Agent to build this page</span>
            </div>
          )}
        </div>
        {/* Resize handles — positioned at canvas edges */}
        {showHandles && (
          <>
            <div
              className={`c-canvas-handle ${handleDragging || handleHovered ? 'is-active' : ''}`}
              style={{ left: gutterW - 6 }}
              onMouseDown={onHandleDown('left')}
              onMouseEnter={() => setHandleHovered(true)}
              onMouseLeave={() => setHandleHovered(false)}
              onDoubleClick={onHandleDblClick}
            />
            <div
              className={`c-canvas-handle ${handleDragging || handleHovered ? 'is-active' : ''}`}
              style={{ right: gutterW - 6 }}
              onMouseDown={onHandleDown('right')}
              onMouseEnter={() => setHandleHovered(true)}
              onMouseLeave={() => setHandleHovered(false)}
              onDoubleClick={onHandleDblClick}
            />
          </>
        )}
      </div>
      {!previewMode && <CanvasHints />}
      {showToolbar && <Toolbar />}
    </div>
  )
}
