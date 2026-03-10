import { useState, useRef, useEffect } from 'react'
import { ChevronRight, RotateCcw, Ellipsis } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'

function getStorageKey(title: string) {
  return `caja-section-${title}`
}

function readCollapsed(title: string, defaultCollapsed: boolean): boolean {
  try {
    const v = localStorage.getItem(getStorageKey(title))
    if (v !== null) return v === '1'
  } catch { /* expected: localStorage unavailable — collapsed state is non-critical */ }
  return defaultCollapsed
}

function SectionMenu({ onReset, onResetOverrides, onClose }: {
  onReset?: () => void
  onResetOverrides?: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 c-menu-popup min-w-[200px] z-50">
      {onReset && (
        <button
          className="c-menu-item"
          onClick={() => { onReset(); onClose() }}
        >
          <RotateCcw size={12} />
          Reset to defaults
        </button>
      )}
      {onResetOverrides && (
        <button
          className="c-menu-item"
          onClick={() => { onResetOverrides(); onClose() }}
        >
          <RotateCcw size={12} />
          Reset overrides
        </button>
      )}
    </div>
  )
}

export function Section({
  title,
  children,
  icon,
  collapsible = true,
  defaultCollapsed = false,
  hasOverrides = false,
  onResetOverrides,
  onReset,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  hasOverrides?: boolean
  onResetOverrides?: () => void
  onReset?: () => void
}) {
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const [collapsed, setCollapsed] = useState(() => collapsible ? readCollapsed(title, defaultCollapsed) : false)
  const [menuOpen, setMenuOpen] = useState(false)

  const toggle = () => {
    if (!collapsible) return
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(getStorageKey(title), next ? '1' : '0') } catch { /* expected: localStorage unavailable — collapsed state is non-critical */ }
  }

  return (
    <div className={`c-section${collapsed ? ' is-collapsed' : ''}`}>
      <div
        className="c-section-header relative group/section gap-2"
      >
        {collapsible && (
          <ChevronRight
            size={12}
            className={`absolute -left-3 top-1/2 -translate-y-1/2 fg-icon-subtle cursor-pointer opacity-0 group-hover/section:opacity-100 ${collapsed ? '' : 'rotate-90'}`}
            onClick={toggle}
          />
        )}
        {icon && <span className="fg-icon-subtle">{icon}</span>}
        <span className={`c-section-title${collapsible ? ' cursor-pointer select-none' : ''}`} onClick={collapsible ? toggle : undefined}>{title}</span>
        <div className="flex-1" />
        {onReset && activeBreakpoint !== 'base' && (
          <span className={`c-bp-pill ${hasOverrides ? 'is-active' : ''}`}>{activeBreakpoint}</span>
        )}
        {onReset && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p) }}
              className={`c-slot ${menuOpen ? 'is-active' : ''}`}
            >
              <Ellipsis size={12} />
            </button>
            {menuOpen && (
              <SectionMenu
                onReset={onReset}
                onResetOverrides={hasOverrides && onResetOverrides ? onResetOverrides : undefined}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        )}
      </div>
      {!collapsed && children}
    </div>
  )
}
