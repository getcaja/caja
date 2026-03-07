import { useState, useRef, useMemo, useEffect } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { ChevronDown, Monitor, Tablet, Smartphone } from 'lucide-react'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'
import type { Frame, Breakpoint } from '../../types/frame'

const BREAKPOINTS: { label: string; width: number | null; icon: typeof Monitor; bp: Breakpoint }[] = [
  { label: 'Desktop', width: null, icon: Monitor, bp: 'base' },
  { label: 'Tablet', width: 767, icon: Tablet, bp: 'md' },
  { label: 'Mobile', width: 375, icon: Smartphone, bp: 'sm' },
]

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
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const setActiveBreakpoint = useFrameStore((s) => s.setActiveBreakpoint)
  const root = useFrameStore((s) => s.root)

  const overrideCounts = useMemo(() => {
    const counts: Record<string, number> = { md: 0, sm: 0 }
    const walk = (f: Frame) => {
      if (f.responsive?.md && Object.keys(f.responsive.md).length > 0) counts.md++
      if (f.responsive?.sm && Object.keys(f.responsive.sm).length > 0) counts.sm++
      if (f.type === 'box') f.children.forEach(walk)
    }
    walk(root)
    return counts
  }, [root])

  const activeBpHasOverrides = activeBreakpoint !== 'base' && overrideCounts[activeBreakpoint] > 0
  const currentBp = BREAKPOINTS.find((bp) => bp.width === canvasWidth) ?? BREAKPOINTS[0]
  const CurrentIcon = currentBp.icon

  const breakpointMenu = BREAKPOINTS.map((bpItem) => {
    const Icon = bpItem.icon
    const active = bpItem.width === canvasWidth
    const hasOverrides = bpItem.bp !== 'base' && overrideCounts[bpItem.bp] > 0
    return (
      <button
        key={bpItem.label}
        className={`c-menu-item ${active ? 'c-menu-item-active' : ''}`}
        onClick={() => { setCanvasWidth(bpItem.width); setActiveBreakpoint(bpItem.bp) }}
      >
        <span className="relative">
          <Icon size={12} />
          {hasOverrides && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />}
        </span>
        {bpItem.label}
        {bpItem.bp !== 'base' && <span className="px-1 py-px text-[9px] leading-none font-medium rounded bg-accent/15 text-accent-text uppercase">{bpItem.bp}</span>}
        <span className="flex-1" />
        {bpItem.width && <span className="fg-muted text-[10px]">{bpItem.width}px</span>}
      </button>
    )
  })

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
    <div className="flex items-center justify-between c-section">
      <Dropdown
        trigger={
          <button className="h-6 flex items-center gap-2 rounded fg-default" title={currentBp.label}>
            <span className="relative">
              <CurrentIcon size={12} />
              {activeBpHasOverrides && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </span>
            <span className="text-[12px]">{currentBp.label}</span>
            <ChevronDown size={8} />
          </button>
        }
        menuClassName="min-w-[180px]"
        menu={breakpointMenu}
      />
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
