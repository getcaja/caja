import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Ellipsis, MousePointer2, Type,
  Frame as FrameIcon, Link, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ListCollapse,
} from 'lucide-react'
import { useFrameStore, isRootId } from '../../store/frameStore'
import { importLocalAsset } from '../../lib/assetOps'
import type { Frame } from '../../types/frame'

type ElementType = 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link'

/** Extra primitives not shown as dedicated toolbar buttons. */
const MORE_PRIMITIVES: { type: ElementType; icon: React.ReactNode; label: string }[] = [
  { type: 'link', icon: <Link size={12} />, label: 'Link' },
  { type: 'button', icon: <RectangleHorizontal size={12} />, label: 'Button' },
  { type: 'input', icon: <TextCursorInput size={12} />, label: 'Input' },
  { type: 'textarea', icon: <AlignLeft size={12} />, label: 'Textarea' },
  { type: 'select', icon: <ListCollapse size={12} />, label: 'Select' },
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

  const menuRef = useRef<HTMLDivElement>(null)

  // Close when another menu opens, window resizes, or click anywhere outside
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
        className={`${btnIconCls} ${open || isActive ? 'bg-accent fg-default' : 'fg-default hover:bg-surface-1'}`}
        title={title}
      >
        {icon ?? children}
      </button>
      {open && (
        <>
          {/* Backdrop catches clicks outside menu (including on iframe) */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
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

/* ---------- Toolbar ---------- */
export function Toolbar() {
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasTool = useFrameStore((s) => s.canvasTool)
  const setCanvasTool = useFrameStore((s) => s.setCanvasTool)
  const addChild = useFrameStore((s) => s.addChild)
  const getSelected = useFrameStore((s) => s.getSelected)
  const selectedId = useFrameStore((s) => s.selectedId)

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
    useFrameStore.getState().setPreviewMode(false)
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
  }, [setCanvasTool])

  const onImageDoubleClick = useCallback(async () => {
    if (imgClickTimer.current) { clearTimeout(imgClickTimer.current); imgClickTimer.current = null }
    useFrameStore.getState().setPreviewMode(false)
    const result = await importLocalAsset(useFrameStore.getState().filePath)
    if (result) {
      handleInsert('image')
      const s = useFrameStore.getState()
      if (s.selectedId) s.updateFrame(s.selectedId, { src: result.localPath })
    }
    setCanvasTool('pointer')
    useFrameStore.getState().setPendingImageSrc(null)
  }, [setCanvasTool, handleInsert])

  const btnIcon = 'w-7 h-7 flex items-center justify-center rounded-md'

  // Animate in/out for preview mode transitions
  const [mounted, setMounted] = useState(!previewMode)
  const [animateIn, setAnimateIn] = useState(!previewMode)
  useEffect(() => {
    if (!previewMode) {
      // Mount hidden, then animate in on next frame
      setMounted(true)
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    } else {
      // Animate out, then unmount
      setAnimateIn(false)
      const t = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(t)
    }
  }, [previewMode])

  if (!mounted) return null

  const shouldHide = !animateIn

  return (
    <div
      className="fixed bottom-3 inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{
        opacity: shouldHide ? 0 : 1,
        transform: shouldHide ? 'translateY(16px)' : 'translateY(0)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
    >
      <div className={`flex items-stretch rounded-lg ${shouldHide ? 'pointer-events-none' : 'pointer-events-auto'}`} style={{ backgroundColor: 'var(--toolbar-bg)', border: '1px solid var(--color-float-border)', boxShadow: 'var(--elevation-toolbar)' }}>
        <div className="flex items-center gap-0.5 py-1 pl-1.5 pr-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCanvasTool('pointer')}
              className={`${btnIcon} ${canvasTool === 'pointer' ? 'bg-accent fg-default' : 'fg-default hover:bg-surface-1'}`}
              title="Pointer (V)"
            >
              <MousePointer2 size={12} />
            </button>
            <button
              onClick={() => setCanvasTool('frame')}
              onDoubleClick={() => { handleInsert('box'); setCanvasTool('pointer') }}
              className={`${btnIcon} ${canvasTool === 'frame' ? 'bg-accent fg-default' : 'fg-default hover:bg-surface-1'}`}
              title="Frame (F)"
            >
              <FrameIcon size={12} />
            </button>
            <button
              onClick={() => setCanvasTool('text')}
              onDoubleClick={() => { handleInsert('text'); setCanvasTool('pointer') }}
              className={`${btnIcon} ${canvasTool === 'text' ? 'bg-accent fg-default' : 'fg-default hover:bg-surface-1'}`}
              title="Text (T)"
            >
              <Type size={12} />
            </button>
            <button
              onClick={onImageClick}
              onDoubleClick={onImageDoubleClick}
              className={`${btnIcon} ${canvasTool === 'image' ? 'bg-accent fg-default' : 'fg-default hover:bg-surface-1'}`}
              title="Image (I)"
            >
              <ImageIcon size={12} />
            </button>
          </div>
          <DropdownButton
            icon={<Ellipsis size={12} />}
            title="More Elements"
            menu={<>
              {MORE_PRIMITIVES.map((item) => (
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
    </div>
  )
}
