import { useState } from 'react'
import { ChevronRight, RotateCcw } from 'lucide-react'

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

export function Section({
  title,
  children,
  icon,
  collapsible = true,
  defaultCollapsed = false,
  hasOverrides = false,
  onResetOverrides,
  isDirty = false,
  onReset,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  hasOverrides?: boolean
  onResetOverrides?: () => void
  isDirty?: boolean
  onReset?: () => void
}) {
  const [collapsed, setCollapsed] = useState(() => collapsible ? readCollapsed(title, defaultCollapsed) : false)

  const toggle = () => {
    if (!collapsible) return
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(getStorageKey(title), next ? '1' : '0') } catch { /* expected: localStorage unavailable — collapsed state is non-critical */ }
  }

  return (
    <div className={`c-section${collapsed ? ' is-collapsed' : ''}`}>
      <div
        className="c-section-header relative group/section"
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
        {hasOverrides && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 ml-1" title="Modified at this breakpoint" />}
        <div className="flex-1" />
        {isDirty && onReset && !hasOverrides && (
          <button
            onClick={(e) => { e.stopPropagation(); onReset() }}
            className="c-slot"
            title="Reset section to defaults"
          >
            <RotateCcw size={12} />
          </button>
        )}
        {hasOverrides && onResetOverrides && (
          <button
            onClick={(e) => { e.stopPropagation(); onResetOverrides() }}
            className="c-slot"
            title="Reset overrides for this section"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
      {!collapsed && children}
    </div>
  )
}
