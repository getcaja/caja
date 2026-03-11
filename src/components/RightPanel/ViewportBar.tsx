import { useState, useRef, useMemo, useEffect } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { ChevronDown, ArrowRightLeft, Monitor, Smartphone, MonitorUp, RotateCcw } from 'lucide-react'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'
import type { Frame, Breakpoint } from '../../types/frame'
import { BP_LABEL } from '../../types/frame'

// Preview presets — only control canvasWidth, breakpoint is derived from width
const PRESETS: { label: string; width: number | null; icon: typeof Monitor; subtitle: string }[] = [
  { label: 'Fluid', width: null, icon: ArrowRightLeft, subtitle: 'Auto Switching' },
  { label: 'Mobile', width: 375, icon: Smartphone, subtitle: '375px' },
  { label: 'Desktop', width: 1280, icon: Monitor, subtitle: '1280px' },
  { label: 'Large', width: 1440, icon: MonitorUp, subtitle: '1440px' },
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

  const activeBpHasOverrides = activeBreakpoint !== 'base' && overrideCounts[activeBreakpoint] > 0
  // Only show reset when a fixed preset is selected (not in Fluid mode)
  const showReset = activeBpHasOverrides && canvasWidth != null

  const currentPreset = PRESETS.find((p) => p.width === canvasWidth) ?? PRESETS[0]
  const isCustomWidth = canvasWidth != null && !PRESETS.some((p) => p.width === canvasWidth)
  const currentLabel = isCustomWidth ? `${canvasWidth}px` : currentPreset.label
  const CurrentIcon = currentPreset.icon

  const presetMenu = PRESETS.map((preset, i) => {
    const Icon = preset.icon
    const active = preset.width === canvasWidth
    return (
      <div key={preset.label}>
        {i === 1 && <div className="h-px bg-border my-1" />}
        <button
          className={`c-menu-item ${active ? 'c-menu-item-active' : ''}`}
          onClick={() => setCanvasWidth(preset.width)}
        >
          <Icon size={12} />
          <span className="flex flex-col items-start">
            <span>{preset.label}</span>
            <span className="fg-muted text-[10px]">{preset.subtitle}</span>
          </span>
          <span className="flex-1" />
        </button>
      </div>
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
    <div className="c-section-header px-4 justify-between border-b border-border">
      <div className="flex items-center gap-1">
        <Dropdown
          trigger={
            <button className="h-6 flex items-center gap-2 rounded fg-default" title={currentPreset.label}>
              <CurrentIcon size={12} />
              <span className="text-[12px]">{currentLabel}</span>
              <ChevronDown size={8} />
            </button>
          }
          menuClassName="min-w-[220px]"
          menu={presetMenu}
        />
        {showReset && (
          <button
            onClick={() => clearAllResponsiveOverrides(activeBreakpoint as 'md' | 'xl')}
            className="c-icon-btn w-5 h-5"
            title="Reset all overrides at this breakpoint"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </div>
      <div className="flex items-center h-6 rounded overflow-hidden">
        {(['md', 'base', 'xl'] as Breakpoint[]).map((bp) => (
          <span
            key={bp}
            className={`px-2 h-full flex items-center text-[12px] ${activeBreakpoint === bp ? 'fg-default c-segment-active' : 'c-dimmed'}`}
          >
            {BP_LABEL[bp]}
          </span>
        ))}
      </div>
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
