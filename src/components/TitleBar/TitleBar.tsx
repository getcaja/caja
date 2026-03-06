import { useState, useRef, useMemo, useEffect } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { McpModal } from '../McpModal/McpModal'
import { ShortcutsButton } from './ShortcutsPanel'
import { Cable, Loader2, Eye, ChevronDown, Monitor, Tablet, Smartphone } from 'lucide-react'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'
import type { Frame, Breakpoint } from '../../types/frame'

const BREAKPOINTS: { label: string; width: number | null; icon: typeof Monitor; bp: Breakpoint }[] = [
  { label: 'Desktop', width: null, icon: Monitor, bp: 'base' },
  { label: 'Tablet', width: 767, icon: Tablet, bp: 'md' },
  { label: 'Mobile', width: 375, icon: Smartphone, bp: 'sm' },
]

const TRAFFIC_LIGHT_WIDTH = 70
const TITLE_BAR_HEIGHT = 38

/* ---------- Dropdown (opens below) ---------- */
function TitleDropdown({ trigger, menu, menuClassName }: {
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
        setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 4 })
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
            style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
          >
            {menu}
          </div>
        </>
      )}
    </>
  )
}

export function TitleBar() {
  const filePath = useFrameStore((s) => s.filePath)
  const projectName = useFrameStore((s) => s.projectName)
  const dirty = useFrameStore((s) => s.dirty)
  const mcpConnected = useFrameStore((s) => s.mcpConnected)
  const mcpBusy = useFrameStore((s) => s.mcpBusy)
  const previewMode = useFrameStore((s) => s.previewMode)
  const setPreviewMode = useFrameStore((s) => s.setPreviewMode)
  const setCanvasTool = useFrameStore((s) => s.setCanvasTool)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const setActiveBreakpoint = useFrameStore((s) => s.setActiveBreakpoint)
  const root = useFrameStore((s) => s.root)
  const [showMcp, setShowMcp] = useState(false)

  const fileName = filePath ? filePath.split('/').pop()?.replace('.caja', '') : projectName ?? 'Untitled'

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

  const currentBp = BREAKPOINTS.find((bp) => bp.width === canvasWidth) ?? BREAKPOINTS[0]
  const CurrentIcon = currentBp.icon

  const btn = 'w-6 h-6 flex items-center justify-center rounded'

  return (
    <div
      className="relative flex items-center border-b border-border select-none"
      style={{ height: TITLE_BAR_HEIGHT, paddingLeft: TRAFFIC_LIGHT_WIDTH, backgroundColor: 'rgb(20 20 20 / 0.33)' }}
      data-tauri-drag-region
    >
      {/* Centered title — absolute so it's truly centered across full width */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[12px] fg-muted">
          {fileName}
          {dirty && (
            <span className="fg-subtle text-[10px] ml-1" title="Unsaved changes">●</span>
          )}
        </span>
      </div>

      {/* Spacer — drag region (explicit attribute for WKWebView reliability) */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Right-side buttons */}
      <div className="flex items-center gap-1.5 pr-2.5">
        {/* Breakpoint */}
        <TitleDropdown
          trigger={
            <button
              className={`${btn} fg-icon-subtle hover:fg-icon-muted hover:bg-inset`}
              title={currentBp.label}
            >
              <span className="relative">
                <CurrentIcon size={12} />
                {activeBreakpoint !== 'base' && overrideCounts[activeBreakpoint] > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
              </span>
            </button>
          }
          menuClassName="min-w-[180px]"
          menu={BREAKPOINTS.map((bpItem) => {
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
                {bpItem.bp !== 'base' && <span className="px-1 py-px text-[9px] leading-none font-medium rounded bg-subtle fg-subtle">{bpItem.bp}</span>}
                <span className="flex-1" />
                {bpItem.width && <span className="fg-subtle text-[10px]">{bpItem.width}px</span>}
              </button>
            )
          })}
        />

        {/* Zoom dropdown */}
        <TitleDropdown
          trigger={
            <button
              className={`h-6 px-1.5 flex items-center gap-0.5 rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset`}
              title="Zoom"
            >
              <span className="text-[11px] tabular-nums">{Math.round(canvasZoom * 100)}%</span>
              <ChevronDown size={8} />
            </button>
          }
          menu={ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              className={`c-menu-item ${Math.abs(canvasZoom - z) < 0.001 ? 'c-menu-item-active' : ''}`}
              onClick={() => canvasZoomTo(z)}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        />

        {/* Preview */}
        <button
          onClick={() => { setPreviewMode(!previewMode); if (!previewMode) setCanvasTool('pointer') }}
          className={`${btn} ${previewMode ? 'bg-accent text-white' : 'fg-icon-subtle hover:fg-icon-muted hover:bg-inset'}`}
          title="Preview (⌘⇧P)"
        >
          <Eye size={12} />
        </button>

        <div className="w-px bg-border shrink-0 -my-[38px] h-[38px]" />

        <ShortcutsButton />
        <button
          onClick={() => setShowMcp(true)}
          className={`${btn} fg-icon-subtle hover:fg-icon-muted hover:bg-inset`}
          title={mcpConnected ? 'MCP Connected' : 'MCP Offline'}
        >
          {mcpBusy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Cable size={12} />
          )}
        </button>
      </div>

      <McpModal open={showMcp} onOpenChange={setShowMcp} />
    </div>
  )
}
