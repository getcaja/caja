import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Ellipsis } from 'lucide-react'
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

function SectionMenu({ onReset, onResetOverrides, onClose, triggerRef }: {
  onReset?: () => void
  onResetOverrides?: () => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [onClose, triggerRef])

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 c-menu-popup min-w-[200px] z-50">
      {onReset && (
        <button
          className="c-menu-item"
          onClick={() => { onReset(); onClose() }}
        >
          Reset Section to Defaults
        </button>
      )}
      {onResetOverrides && (
        <button
          className="c-menu-item"
          onClick={() => { onResetOverrides(); onClose() }}
        >
          Reset Responsive Overrides
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
  const setPropertyHint = useFrameStore((s) => s.setPropertyHint)
  const [collapsed, setCollapsed] = useState(() => collapsible ? readCollapsed(title, defaultCollapsed) : false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

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
        <span
          className={`c-section-title${collapsible ? ' cursor-pointer select-none' : ''}`}
          onClick={collapsible ? toggle : undefined}
          onMouseEnter={() => setPropertyHint(`${title} Section`)}
          onMouseLeave={() => setPropertyHint(null)}
        >{title}</span>
        <div className="flex-1" />
        {onReset && activeBreakpoint !== 'base' && (
          <span className={`c-bp-pill ${hasOverrides ? 'is-active' : ''}`}>{activeBreakpoint}</span>
        )}
        {onReset && (
          <div className="relative">
            <button
              ref={menuTriggerRef}
              onClick={(e) => { e.stopPropagation(); setMenuOpen((p) => !p) }}
              className={`c-slot ${menuOpen ? 'is-active' : ''}`}
              onMouseEnter={() => setPropertyHint(`${title} Options`)}
              onMouseLeave={() => setPropertyHint(null)}
            >
              <Ellipsis size={12} />
            </button>
            {menuOpen && (
              <SectionMenu
                onReset={activeBreakpoint === 'base' ? onReset : undefined}
                onResetOverrides={activeBreakpoint !== 'base' && hasOverrides && onResetOverrides ? onResetOverrides : undefined}
                onClose={() => setMenuOpen(false)}
                triggerRef={menuTriggerRef}
              />
            )}
          </div>
        )}
      </div>
      {!collapsed && children}
    </div>
  )
}
