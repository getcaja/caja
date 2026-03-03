import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import {
  Monitor, Tablet, Smartphone,
  Plus, MousePointer2, Type, Eye,
  Frame as FrameIcon, Link, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown,
} from 'lucide-react'
import { useFrameStore, isRootId } from '../../store/frameStore'
import { importLocalAsset } from '../../lib/assetOps'
import type { Frame, Breakpoint } from '../../types/frame'
import { ZOOM_LEVELS } from './ZoomBar'
import { canvasZoomTo } from './CanvasInline'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

const BREAKPOINTS: { label: string; width: number | null; icon: typeof Monitor; bp: Breakpoint }[] = [
  { label: 'Desktop', width: null, icon: Monitor, bp: 'base' },
  { label: 'Tablet', width: 767, icon: Tablet, bp: 'md' },
  { label: 'Mobile', width: 375, icon: Smartphone, bp: 'sm' },
]

const PRIMITIVES: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'box', icon: <FrameIcon size={12} />, label: 'Add Frame' },
  { type: 'text', icon: <Type size={12} />, label: 'Add Text' },
  { type: 'link', icon: <Link size={12} />, label: 'Add Link' },
  { type: 'image', icon: <ImageIcon size={12} />, label: 'Add Image' },
  { type: 'button', icon: <RectangleHorizontal size={12} />, label: 'Add Button' },
  { type: 'input', icon: <TextCursorInput size={12} />, label: 'Add Input' },
  { type: 'textarea', icon: <AlignLeft size={12} />, label: 'Add Textarea' },
  { type: 'select', icon: <ChevronDown size={12} />, label: 'Add Select' },
]

function findParentBox(root: Frame, id: string): Frame | null {
  if (root.type !== 'box') return null
  for (const child of root.children) {
    if (child.id === id) return root
    const found = findParentBox(child, id)
    if (found) return found
  }
  return null
}

/* ---------- Dropdown wrapper ---------- */
function DropdownButton({ icon, title, isActive, menu, menuClassName, children }: {
  icon?: React.ReactNode
  title: string
  isActive?: boolean
  menu: React.ReactNode
  menuClassName?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Close when another menu opens or window resizes
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('close-menus', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('close-menus', close)
      window.removeEventListener('resize', close)
    }
  }, [])

  const handleClick = () => {
    if (!open) {
      window.dispatchEvent(new Event('close-menus'))
      if (btnRef.current) {
        const rect = btnRef.current.getBoundingClientRect()
        setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
      }
    }
    setOpen((p) => !p)
  }

  const btnIconCls = 'w-7 h-7 flex items-center justify-center rounded-md'

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        className={`${btnIconCls} text-white ${open || isActive ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
        title={title}
      >
        {icon ?? children}
      </button>
      {open && (
        <>
          {/* Backdrop catches clicks outside menu (including on iframe) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`fixed c-menu-popup min-w-[120px] z-50 ${menuClassName ?? ''}`}
            style={{ left: pos.x, bottom: window.innerHeight - pos.y, transform: 'translateX(-50%)' }}
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
          >
            {menu}
          </div>
        </>
      )}
    </>
  )
}

/* ---------- Section divider ---------- */
function Divider() {
  return <div className="w-px self-stretch bg-border shrink-0" />
}

/* ---------- Zoom ---------- */
function ZoomSection() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
    }
    setOpen((p) => !p)
  }

  return (
    <>
      <div className="flex items-center py-1 pr-1">
        <button
          ref={btnRef}
          onClick={handleClick}
          className={`h-7 px-1.5 flex items-center gap-0.5 rounded-md text-white ${open ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
          title="Zoom"
        >
          <span className="text-[11px] tabular-nums">{Math.round(canvasZoom * 100)}%</span>
          <ChevronDown size={10} />
        </button>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed c-menu-popup min-w-[120px] z-50"
            style={{ left: pos.x, bottom: window.innerHeight - pos.y, transform: 'translateX(-50%)' }}
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
          >
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z}
                className={`c-menu-item ${Math.abs(canvasZoom - z) < 0.001 ? 'c-menu-item-active' : ''}`}
                onClick={() => canvasZoomTo(z)}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ---------- Toolbar ---------- */
export function Toolbar() {
  const previewMode = useFrameStore((s) => s.previewMode)
  const setPreviewMode = useFrameStore((s) => s.setPreviewMode)
  const canvasTool = useFrameStore((s) => s.canvasTool)
  const setCanvasTool = useFrameStore((s) => s.setCanvasTool)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const setActiveBreakpoint = useFrameStore((s) => s.setActiveBreakpoint)
  const addChild = useFrameStore((s) => s.addChild)
  const getSelected = useFrameStore((s) => s.getSelected)
  const selectedId = useFrameStore((s) => s.selectedId)

  const root = useFrameStore((s) => s.root)

  // Count frames with overrides per breakpoint
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

  // Current responsive icon
  const currentBp = BREAKPOINTS.find((bp) => bp.width === canvasWidth) ?? BREAKPOINTS[0]
  const CurrentIcon = currentBp.icon

  const handleInsert = (type: ElementType) => {
    let parentId = useFrameStore.getState().root.id
    if (selectedId && !isRootId(selectedId)) {
      const selected = getSelected()
      if (selected && selected.type === 'box') {
        parentId = selectedId
      } else if (selected) {
        const root = useFrameStore.getState().root
        const parent = findParentBox(root, selectedId)
        if (parent) parentId = parent.id
      }
    }
    addChild(parentId, type)
    useFrameStore.getState().setTreePanelTab('layers')
  }

  // Image button: delay single-click picker so double-click can cancel it
  const imgClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onImageClick = useCallback(() => {
    setPreviewMode(false)
    setCanvasTool('image')
    imgClickTimer.current = setTimeout(async () => {
      imgClickTimer.current = null
      const result = await importLocalAsset(useFrameStore.getState().filePath)
      if (result) {
        useFrameStore.getState().setPendingImageSrc(result.localPath)
      } else {
        useFrameStore.getState().setCanvasTool('pointer')
      }
    }, 250)
  }, [setPreviewMode, setCanvasTool])

  const onImageDoubleClick = useCallback(async () => {
    if (imgClickTimer.current) { clearTimeout(imgClickTimer.current); imgClickTimer.current = null }
    setPreviewMode(false)
    const result = await importLocalAsset(useFrameStore.getState().filePath)
    if (result) {
      handleInsert('image')
      const s = useFrameStore.getState()
      if (s.selectedId) s.updateFrame(s.selectedId, { src: result.localPath })
    }
    setCanvasTool('pointer')
    useFrameStore.getState().setPendingImageSrc(null)
  }, [setPreviewMode, setCanvasTool, handleInsert])

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md'

  return (
    // No transform on this wrapper — flexbox centering so fixed/absolute children work correctly
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="flex items-stretch bg-surface-1 border border-border rounded-lg pointer-events-auto">

        {/* Section 1: Tools + Add */}
        <div style={{
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          maxWidth: previewMode ? 0 : 340, opacity: previewMode ? 0 : 1,
          transition: previewMode
            ? 'max-width 200ms ease, opacity 150ms ease'
            : 'max-width 300ms ease-out, opacity 250ms ease-out 50ms',
        }}>
          <div className="flex items-center gap-0.5 py-1 pl-1.5 pr-1">
            <div className="flex items-center bg-overlay rounded-md">
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('pointer') }}
                className={`${btnIcon} text-white ${!previewMode && canvasTool === 'pointer' ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
                title="Pointer (V)"
              >
                <MousePointer2 size={12} />
              </button>
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('frame') }}
                onDoubleClick={() => { setPreviewMode(false); handleInsert('box'); setCanvasTool('pointer') }}
                className={`${btnIcon} text-white ${!previewMode && canvasTool === 'frame' ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
                title="Frame (F)"
              >
                <FrameIcon size={12} />
              </button>
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('text') }}
                onDoubleClick={() => { setPreviewMode(false); handleInsert('text'); setCanvasTool('pointer') }}
                className={`${btnIcon} text-white ${!previewMode && canvasTool === 'text' ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
                title="Text (T)"
              >
                <Type size={12} />
              </button>
              <button
                onClick={onImageClick}
                onDoubleClick={onImageDoubleClick}
                className={`${btnIcon} text-white ${!previewMode && canvasTool === 'image' ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
                title="Image (I)"
              >
                <ImageIcon size={12} />
              </button>
            </div>
            <DropdownButton
              icon={<Plus size={12} />}
              title="Add Element"
              menu={<>
                {PRIMITIVES.map((item) => (
                  <button
                    key={item.type}
                    className="c-menu-item"
                    onClick={() => handleInsert(item.type)}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </>}
            />
          </div>
        </div>

        {/* Section 3: Viewport + Zoom */}
        {!previewMode && <Divider />}
        <div className="flex items-center gap-0.5 py-1 px-1">
          <DropdownButton
            icon={<span className="relative">
              <CurrentIcon size={12} />
              {activeBreakpoint !== 'base' && overrideCounts[activeBreakpoint] > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
              )}
            </span>}
            title={currentBp.label}
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
        </div>
        <ZoomSection />

        {/* Section 4: Preview */}
        <Divider />
        <div className="flex items-center gap-0.5 py-1 pr-1.5 pl-1">
          <button
            onClick={() => { setPreviewMode(!previewMode); if (!previewMode) setCanvasTool('pointer') }}
            className={`${btnIcon} text-white ${previewMode ? 'bg-accent' : 'opacity-60 hover:opacity-100'}`}
            title="Preview (⌘⇧P)"
          >
            <Eye size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
