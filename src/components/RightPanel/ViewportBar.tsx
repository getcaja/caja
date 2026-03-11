import { useState, useRef, useMemo, useEffect } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { ChevronDown, Monitor, Smartphone, Laptop, RotateCcw } from 'lucide-react'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'
import type { Frame, Breakpoint } from '../../types/frame'

/** Viewport modes map to canvasWidth values: null = fluid (LG), number = fixed */
export const VIEWPORT_MODES: Breakpoint[] = ['xl', 'base', 'md']

export const MODE_WIDTH: Record<Breakpoint, number | null> = {
  xl: null,
  base: 1024,
  md: 375,
}

const MODE_LABEL: Record<Breakpoint, string> = {
  xl: 'LG',
  base: 'MD',
  md: 'SM',
}

const MODE_ICON: Record<Breakpoint, typeof Monitor> = {
  xl: Monitor,
  base: Laptop,
  md: Smartphone,
}

function Dropdown({ trigger, menu, menuClassName }: {
  trigger: React.ReactNode
  menu: React.ReactNode
  menuClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('close-menus', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('close-menus', close)
      window.removeEventListener('resize', close)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [open])

  const handleClick = () => {
    if (!open) {
      window.dispatchEvent(new Event('close-menus'))
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        setPos({ x: rect.right, y: rect.bottom + 4 })
      }
    }
    setOpen((p) => !p)
  }

  return (
    <>
      <div ref={btnRef} onClick={handleClick}>
        {trigger}
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className={`fixed c-menu-popup min-w-[120px] z-50 ${menuClassName ?? ''}`}
            style={{ right: window.innerWidth - pos.x, top: pos.y }}
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
          >
            {menu}
          </div>
        </>
      )}
    </>
  )
}

const MODES: Breakpoint[] = VIEWPORT_MODES

export function ViewportBar() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const root = useFrameStore((s) => s.root)
  const clearAllResponsiveOverrides = useFrameStore((s) => s.clearAllResponsiveOverrides)

  const overrideCounts = useMemo(() => {
    const counts: Record<string, number> = { md: 0, xl: 0 }
    const walk = (f: Frame) => {
      if (f.responsive?.md && Object.keys(f.responsive.md).length > 0) counts.md++
      if (f.responsive?.xl && Object.keys(f.responsive.xl).length > 0) counts.xl++
      if (f.type === 'box') f.children.forEach(walk)
    }
    walk(root)
    return counts
  }, [root])

  const canvasWidth = useFrameStore((s) => s.canvasWidth)

  // Observe actual rendered canvas width
  const [displayWidth, setDisplayWidth] = useState<number | null>(null)
  useEffect(() => {
    const el = document.getElementById('caja-canvas')
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setDisplayWidth(Math.round(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeMode: Breakpoint = canvasWidth === null ? 'xl' : activeBreakpoint === 'md' ? 'md' : activeBreakpoint === 'xl' ? 'xl' : 'base'
  const activeBpHasOverrides = activeBreakpoint !== 'base' && overrideCounts[activeBreakpoint] > 0

  const handleSegmentClick = (bp: Breakpoint) => {
    setCanvasWidth(MODE_WIDTH[bp])
  }

  const zoomIn = () => {
    const next = ZOOM_LEVELS.find((z) => z > canvasZoom + 0.001)
    if (next != null) canvasZoomTo(next)
  }
  const zoomOut = () => {
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < canvasZoom - 0.001)
    if (prev != null) canvasZoomTo(prev)
  }

  const zoomMenu = <>
    <button className="c-menu-item" onClick={zoomIn}>
      Zoom in<span className="flex-1" /><kbd className="text-[10px] fg-subtle font-mono">⌘+</kbd>
    </button>
    <button className="c-menu-item" onClick={zoomOut}>
      Zoom out<span className="flex-1" /><kbd className="text-[10px] fg-subtle font-mono">⌘−</kbd>
    </button>
    <div className="h-px bg-border my-1" />
    {ZOOM_LEVELS.map((z) => (
      <button
        key={z}
        className={`c-menu-item ${Math.abs(canvasZoom - z) < 0.001 ? 'c-menu-item-active' : ''}`}
        onClick={() => canvasZoomTo(z)}
      >
        {Math.round(z * 100)}%
        {z === 1 && <><span className="flex-1" /><kbd className="text-[10px] fg-subtle font-mono">⌘0</kbd></>}
      </button>
    ))}
  </>

  return (
    <div className="c-section-header px-4 justify-between border-b border-border">
      {/* Breakpoint segments — primary control */}
      <div className="flex items-center gap-2">
        {displayWidth != null && (
          <span className="text-[12px] tabular-nums fg-muted min-w-[48px] text-right">{displayWidth}px</span>
        )}
        <div className="c-toggle-group flex items-center h-6 rounded overflow-hidden">
          {MODES.map((bp) => {
            const Icon = MODE_ICON[bp]
            const isActive = activeMode === bp
            const hasOverrides = bp !== 'base' && overrideCounts[bp] > 0
            return (
              <button
                key={bp}
                onClick={() => handleSegmentClick(bp)}
                className={`px-2 h-full flex items-center gap-1 text-[12px] ${isActive ? 'fg-default c-segment-active' : 'c-dimmed-i'}`}
                title={`${MODE_LABEL[bp]}${bp === 'base' ? '' : hasOverrides ? ` (${overrideCounts[bp]} overrides)` : ''}`}
              >
                <Icon size={12} />
                {MODE_LABEL[bp]}
              </button>
            )
          })}
        </div>
        {activeBpHasOverrides && (
          <button
            onClick={() => clearAllResponsiveOverrides(activeBreakpoint as 'md' | 'xl')}
            className="c-icon-btn w-5 h-5"
            title="Reset all overrides at this breakpoint"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
      {/* Zoom */}
      <Dropdown
        trigger={
          <button className="h-6 flex items-center gap-0.5 rounded fg-default" title="Zoom">
            <span className="text-[12px] tabular-nums">{Math.round(canvasZoom * 100)}%</span>
            <ChevronDown size={8} />
          </button>
        }
        menu={zoomMenu}
      />
    </div>
  )
}
