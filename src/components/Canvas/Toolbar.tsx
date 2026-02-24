import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Monitor, Tablet, Smartphone, Maximize,
  File, ToyBrick, Code, Minus, Plus, Palette, Eye,
  Square, Type, Link, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown,
} from 'lucide-react'
import { useFrameStore, isRootId, findInTree } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { ZOOM_LEVELS } from './ZoomBar'
import type { Frame } from '../../types/frame'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

const BREAKPOINTS = [
  { label: 'Auto', width: null as number | null, icon: Maximize },
  { label: 'Desktop', width: 1440, icon: Monitor },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Mobile', width: 375, icon: Smartphone },
]

const PRIMITIVES: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'box', icon: <Square size={12} />, label: 'Frame' },
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
  const stableOpen = useRef(open)
  stableOpen.current = open

  useEffect(() => {
    if (!open) return
    const handler = () => { if (stableOpen.current) setOpen(false) }
    const id = setTimeout(() => window.addEventListener('click', handler), 0)
    return () => { clearTimeout(id); window.removeEventListener('click', handler) }
  }, [open])

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md transition-colors'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={`${btnIcon} ${open || isActive ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'}`}
        title={title}
      >
        {icon ?? children}
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 c-menu-popup min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          {menu}
        </div>
      )}
    </div>
  )
}

/* ---------- Section divider ---------- */
function Divider() {
  return <div className="w-px h-4 bg-border mx-1 shrink-0" />
}

/* ---------- Toolbar ---------- */
export function Toolbar() {
  const previewMode = useFrameStore((s) => s.previewMode)
  const setPreviewMode = useFrameStore((s) => s.setPreviewMode)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const setCanvasZoom = useFrameStore((s) => s.setCanvasZoom)
  const addChild = useFrameStore((s) => s.addChild)
  const getSelected = useFrameStore((s) => s.getSelected)
  const selectedId = useFrameStore((s) => s.selectedId)
  const addPage = useFrameStore((s) => s.addPage)
  const treePanelTab = useFrameStore((s) => s.treePanelTab)

  // Current responsive icon
  const currentBp = BREAKPOINTS.find((bp) => bp.width === canvasWidth) ?? BREAKPOINTS[0]
  const CurrentIcon = currentBp.icon

  // Zoom helpers
  const zoomIdx = ZOOM_LEVELS.indexOf(canvasZoom)

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

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md transition-colors'
  const btnMuted = `${btnIcon} text-text-muted hover:text-text-secondary hover:bg-surface-2`

  return (
    // No transform on this wrapper — flexbox centering so fixed/absolute children work correctly
    <div className="absolute bottom-3 inset-x-0 z-40 flex justify-center pointer-events-none">
      <div className="flex items-center bg-surface-1 border border-border rounded-lg px-1.5 py-1 gap-0.5 pointer-events-auto">

        {/* Section 1: Creation tools (icon-only) */}
        {!previewMode && (
          <>
            <button
              onClick={() => { addPage(); useFrameStore.getState().setTreePanelTab('elements') }}
              className={btnMuted}
              title="New page"
            >
              <File size={14} />
            </button>

            <DropdownButton
              icon={<ToyBrick size={14} />}
              title="Add element"
              menu={PRIMITIVES.map((item) => (
                <button
                  key={item.type}
                  className="c-menu-item"
                  onClick={() => handleInsert(item.type)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            />

            <button
              onClick={() => {
                const store = useFrameStore.getState()
                if (store.selectedId) {
                  const frame = findInTree(store.root, store.selectedId)
                  if (frame) {
                    useCatalogStore.getState().savePattern(frame.name || 'Pattern', [], frame)
                    useCatalogStore.getState().setActiveSource('internal')
                    store.setTreePanelTab('patterns')
                    return
                  }
                }
                // No selection — just toggle the tab
                if (treePanelTab !== 'patterns') {
                  useCatalogStore.getState().setActiveSource('internal')
                  store.setTreePanelTab('patterns')
                } else {
                  store.setTreePanelTab('elements')
                }
              }}
              className={`${btnIcon} ${treePanelTab === 'patterns' ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'}`}
              title={selectedId ? 'Save selected as pattern' : 'Patterns'}
            >
              <Code size={14} />
            </button>

            <Divider />
          </>
        )}

        {/* Section 2: Mode toggle */}
        <div className="flex items-center bg-surface-0/50 rounded-md">
          <button
            onClick={() => setPreviewMode(false)}
            className={`${btnIcon} ${!previewMode ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Design mode"
          >
            <Palette size={14} />
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={`${btnIcon} ${previewMode ? 'bg-surface-3 text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Preview mode (⌘⇧P)"
          >
            <Eye size={14} />
          </button>
        </div>

        {!previewMode && (
          <>
            <Divider />

            {/* Section 3: Responsive + Zoom */}
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

            <div className="w-px h-3.5 bg-border mx-0.5 shrink-0" />

            <button
              onClick={() => zoomIdx > 0 && setCanvasZoom(ZOOM_LEVELS[zoomIdx - 1])}
              disabled={zoomIdx <= 0}
              className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
              title="Zoom out (⌘−)"
            >
              <Minus size={12} />
            </button>
            <span className="text-[11px] text-text-secondary min-w-[36px] text-center tabular-nums">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              onClick={() => zoomIdx < ZOOM_LEVELS.length - 1 && setCanvasZoom(ZOOM_LEVELS[zoomIdx + 1])}
              disabled={zoomIdx >= ZOOM_LEVELS.length - 1}
              className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
              title="Zoom in (⌘+)"
            >
              <Plus size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
