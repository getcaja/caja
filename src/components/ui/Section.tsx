import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

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
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(() => collapsible ? readCollapsed(title, defaultCollapsed) : false)

  const toggle = () => {
    if (!collapsible) return
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(getStorageKey(title), next ? '1' : '0') } catch { /* expected: localStorage unavailable — collapsed state is non-critical */ }
  }

  return (
    <div className="px-4 py-3.5 border-b border-border">
      <div
        className={`relative flex items-center group/section${collapsed ? '' : ' mb-2'}`}
      >
        {collapsible && (
          <ChevronRight
            size={12}
            className={`absolute -left-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer opacity-0 group-hover/section:opacity-100 ${collapsed ? '' : 'rotate-90'}`}
            onClick={toggle}
          />
        )}
        {icon && <span className="text-text-muted">{icon}</span>}
        <span className={`c-section-title${collapsible ? ' cursor-pointer select-none' : ''}`} onClick={collapsible ? toggle : undefined}>{title}</span>
      </div>
      {!collapsed && children}
    </div>
  )
}
