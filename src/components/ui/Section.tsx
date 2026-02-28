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
  collapsible = true,
  defaultCollapsed = false,
}: {
  title: string
  children: React.ReactNode
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
    <div className="p-3 border-b border-border">
      <div className={`flex items-center${collapsed ? '' : ' mb-2'}`}>
        <span
          className={`inline-flex items-center gap-1 ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={toggle}
        >
          {collapsible && (
            <ChevronRight
              size={12}
              className={`text-text-muted transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
            />
          )}
          <span className="c-section-title">{title}</span>
        </span>
      </div>
      {!collapsed && children}
    </div>
  )
}
