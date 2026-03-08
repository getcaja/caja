import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { CanvasInline } from './CanvasInline'
import { CanvasHints } from './CanvasHints'
import { Toolbar } from './Toolbar'

/** Threshold in px — when scroll is within this distance of the bottom, hide toolbar. */
const BOTTOM_THRESHOLD = 60

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nearBottom, setNearBottom] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    setNearBottom(remaining < BOTTOM_THRESHOLD)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    // Also check on resize (viewport change)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    checkScroll()
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex"
        style={previewMode ? undefined : { backgroundColor: 'var(--color-canvas-bg)' }}
      >
        <CanvasInline />
        {!hasChildren && !previewMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="fg-subtle text-[12px]">Add an element to start, or ask an Agent to build this page</span>
          </div>
        )}
      </div>
      {!previewMode && <CanvasHints />}
      <Toolbar hidden={nearBottom} />
    </div>
  )
}
