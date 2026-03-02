import { useState, useRef, useMemo } from 'react'
import {
  Monitor, Tablet, Smartphone,
  Plus, MousePointer2, Type, Eye,
  Frame as FrameIcon, Link, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown,
} from 'lucide-react'
import { useFrameStore, isRootId } from '../../store/frameStore'
import type { Frame, Breakpoint } from '../../types/frame'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

const BREAKPOINTS: { label: string; width: number | null; icon: typeof Monitor; bp: Breakpoint }[] = [
  { label: 'Full', width: null, icon: Monitor, bp: 'base' },
  { label: 'Tablet', width: 767, icon: Tablet, bp: 'md' },
  { label: 'Mobile', width: 375, icon: Smartphone, bp: 'sm' },
]

const PRIMITIVES: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'box', icon: <FrameIcon size={12} />, label: 'Frame' },
  { type: 'text', icon: <Type size={12} />, label: 'Text' },
  { type: 'link', icon: <Link size={12} />, label: 'Link' },
  { type: 'image', icon: <ImageIcon size={12} />, label: 'Image' },
  { type: 'button', icon: <RectangleHorizontal size={12} />, label: 'Button' },
  { type: 'input', icon: <TextCursorInput size={12} />, label: 'Input' },
  { type: 'textarea', icon: <AlignLeft size={12} />, label: 'Textarea' },
  { type: 'select', icon: <ChevronDown size={12} />, label: 'Select' },
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
function DropdownButton({ icon, title, isActive, menu, children }: {
  icon?: React.ReactNode
  title: string
  isActive?: boolean
  menu: React.ReactNode
  children?: React.ReactNode
}) {
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

  const btnIconCls = 'w-7 h-7 flex items-center justify-center rounded-md'

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        className={`${btnIconCls} ${open || isActive ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'}`}
        title={title}
      >
        {icon ?? children}
      </button>
      {open && (
        <>
          {/* Backdrop catches clicks outside menu (including on iframe) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed c-menu-popup min-w-[120px] z-50"
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

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md'

  return (
    // No transform on this wrapper — flexbox centering so fixed/absolute children work correctly
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="flex items-stretch bg-surface-1 border border-border rounded-lg pointer-events-auto">

        {/* Section 1: Add */}
        <div style={{
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          maxWidth: previewMode ? 0 : 200, opacity: previewMode ? 0 : 1,
          transition: previewMode
            ? 'max-width 200ms ease, opacity 150ms ease'
            : 'max-width 300ms ease-out, opacity 250ms ease-out 50ms',
        }}>
          <div className="flex items-center gap-0.5 py-1 pl-1.5 pr-1">
            <DropdownButton
              icon={<Plus size={14} />}
              title="Add"
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
          <Divider />
        </div>

        {/* Section 2: Tools */}
        <div style={{
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          maxWidth: previewMode ? 0 : 200, opacity: previewMode ? 0 : 1,
          transition: previewMode
            ? 'max-width 200ms ease, opacity 150ms ease'
            : 'max-width 300ms ease-out, opacity 250ms ease-out 50ms',
        }}>
          <div className="flex items-center gap-0.5 py-1 px-1">
            <div className="flex items-center bg-surface-0/50 rounded-md">
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('pointer') }}
                className={`${btnIcon} ${!previewMode && canvasTool === 'pointer' ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="Pointer (V)"
              >
                <MousePointer2 size={14} />
              </button>
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('frame') }}
                className={`${btnIcon} ${!previewMode && canvasTool === 'frame' ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="Frame (F)"
              >
                <FrameIcon size={14} />
              </button>
              <button
                onClick={() => { setPreviewMode(false); setCanvasTool('text') }}
                className={`${btnIcon} ${!previewMode && canvasTool === 'text' ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                title="Text (T)"
              >
                <Type size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Viewport (always visible) */}
        {!previewMode && <Divider />}
        <div className="flex items-center gap-0.5 py-1 px-1">
          <DropdownButton
            icon={<span className="relative">
              <CurrentIcon size={14} />
              {activeBreakpoint !== 'base' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
              )}
            </span>}
            title={currentBp.label}
            menu={BREAKPOINTS.map((bpItem) => {
              const Icon = bpItem.icon
              const active = bpItem.width === canvasWidth
              const hasOverrides = bpItem.bp !== 'base' && overrideCounts[bpItem.bp] > 0
              return (
                <button
                  key={bpItem.label}
                  className={`c-menu-item ${active ? '!text-text-primary !bg-surface-3/60' : ''}`}
                  onClick={() => { setCanvasWidth(bpItem.width); setActiveBreakpoint(bpItem.bp) }}
                >
                  <span className="relative">
                    <Icon size={12} />
                    {hasOverrides && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />}
                  </span>
                  {bpItem.label}
                  {bpItem.width && <span className="ml-auto text-text-muted text-[10px]">{bpItem.width}px</span>}
                </button>
              )
            })}
          />
        </div>

        {/* Section 4: Preview (always visible, far right) */}
        <div className="flex items-center gap-0.5 py-1 pr-1.5">
          <button
            onClick={() => { setPreviewMode(!previewMode); if (!previewMode) setCanvasTool('pointer') }}
            className={`${btnIcon} ${previewMode ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Preview (⌘⇧P)"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
