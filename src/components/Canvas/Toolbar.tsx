import { useState, useRef } from 'react'
import {
  Monitor, Tablet, Smartphone,
  Plus, MousePointer2, Type, Eye, Folder,
  Frame as FrameIcon, Link, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown,
} from 'lucide-react'
import { useFrameStore, isRootId } from '../../store/frameStore'
import type { Frame } from '../../types/frame'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

const BREAKPOINTS = [
  { label: 'Full', width: null as number | null, icon: Monitor },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Mobile', width: 375, icon: Smartphone },
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
            onClick={(e) => e.stopPropagation()}
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
  const addChild = useFrameStore((s) => s.addChild)
  const getSelected = useFrameStore((s) => s.getSelected)
  const selectedId = useFrameStore((s) => s.selectedId)
  const addPage = useFrameStore((s) => s.addPage)

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
    useFrameStore.getState().setTreePanelTab('elements')
  }

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md'

  return (
    // No transform on this wrapper — flexbox centering so fixed/absolute children work correctly
    <div className="fixed bottom-3 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="flex items-stretch bg-surface-1 border border-border rounded-lg pointer-events-auto">

        {/* Section 1: Tools */}
        <div style={{
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          maxWidth: previewMode ? 0 : 200, opacity: previewMode ? 0 : 1,
          transition: 'max-width 200ms ease, opacity 150ms ease',
        }}>
          <div className="flex items-center gap-0.5 py-1 pl-1.5 pr-1">
            <DropdownButton
              icon={<Plus size={14} />}
              title="Add"
              menu={<>
                <button
                  className="c-menu-item"
                  onClick={() => { addPage(); useFrameStore.getState().setTreePanelTab('elements') }}
                >
                  <Folder size={12} /> Page
                </button>
                <div className="border-t border-border my-1" />
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

        {/* Section 2: Mode toggle */}
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
            <button
              onClick={() => { setPreviewMode(true); setCanvasTool('pointer') }}
              className={`${btnIcon} ${previewMode ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              title="Preview (⌘⇧P)"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Section 3: Viewport */}
        <div style={{
          display: 'flex', alignItems: 'center', overflow: 'hidden',
          maxWidth: previewMode ? 0 : 300, opacity: previewMode ? 0 : 1,
          transition: 'max-width 200ms ease, opacity 150ms ease',
        }}>
          <Divider />
          <div className="flex items-center gap-0.5 py-1 pl-1 pr-1.5">
            <DropdownButton
              icon={<CurrentIcon size={14} />}
              title={currentBp.label}
              menu={BREAKPOINTS.map((bp) => {
                const Icon = bp.icon
                const active = bp.width === canvasWidth
                return (
                  <button
                    key={bp.label}
                    className={`c-menu-item ${active ? '!text-text-primary !bg-surface-3/60' : ''}`}
                    onClick={() => setCanvasWidth(bp.width)}
                  >
                    <Icon size={12} />
                    {bp.label}
                    {bp.width && <span className="ml-auto text-text-muted text-[10px]">{bp.width}px</span>}
                  </button>
                )
              })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
