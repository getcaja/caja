import { useState, useRef, useEffect } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { ChevronDown, Monitor, Laptop, Smartphone, Asterisk } from 'lucide-react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'
import { BP_LABEL } from '../../types/frame'
import type { Breakpoint } from '../../types/frame'

/** Switcher presets — click sets canvasWidth, breakpoint derives from width */
export const VIEWPORT_MODES: Breakpoint[] = ['base', 'xl', 'md']

export const MODE_WIDTH: Record<Breakpoint, number | null> = {
  base: null,   // LG — fluid
  xl: 1024,     // MD
  md: 375,      // SM
}

const MODE_ICON: Record<Breakpoint, typeof Monitor> = {
  base: Monitor,
  xl: Laptop,
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

export function ViewportBar() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)

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
    <div className="c-section-header px-3 justify-between border-b border-border">
      <div className="flex items-center gap-2">
        <div className="c-toggle-group flex items-center h-6 rounded overflow-hidden">
          {VIEWPORT_MODES.map((bp) => {
            const Icon = MODE_ICON[bp]
            const isActive = activeBreakpoint === bp
            return (
              bp === 'base' ? (
                <RadixTooltip.Root delayDuration={200}>
                  <RadixTooltip.Trigger asChild>
                    <button
                      key={bp}
                      onClick={() => setCanvasWidth(MODE_WIDTH[bp])}
                      className={`px-2 h-full flex items-center gap-1 text-[12px] ${isActive ? 'fg-default c-segment-active' : 'c-dimmed-i'}`}
                    >
                      <Icon size={12} />
                      {BP_LABEL[bp]}
                      <Asterisk size={8} />
                    </button>
                  </RadixTooltip.Trigger>
                  <RadixTooltip.Portal>
                    <RadixTooltip.Content
                      side="bottom"
                      sideOffset={8}
                      className="c-menu-popup max-w-[240px] p-3 z-50"
                    >
                      <div className="text-[12px] font-medium fg-default mb-1">
                        Base breakpoint
                      </div>
                      <p className="text-[11px] fg-muted leading-relaxed">
                        Styles set here apply to all breakpoints. Design at desktop size first, then override for smaller screens.
                      </p>
                      <RadixTooltip.Arrow className="fill-[var(--color-surface-sunken)]" />
                    </RadixTooltip.Content>
                  </RadixTooltip.Portal>
                </RadixTooltip.Root>
              ) : (
                <button
                  key={bp}
                  onClick={() => setCanvasWidth(MODE_WIDTH[bp])}
                  className={`px-2 h-full flex items-center gap-1 text-[12px] ${isActive ? 'fg-default c-segment-active' : 'c-dimmed-i'}`}
                  title={BP_LABEL[bp]}
                >
                  <Icon size={12} />
                  {BP_LABEL[bp]}
                </button>
              )
            )
          })}
        </div>
        {displayWidth != null && (
          <span className="text-[12px] tabular-nums fg-muted">{displayWidth}px</span>
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
