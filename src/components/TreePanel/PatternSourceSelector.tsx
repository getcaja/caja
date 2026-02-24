import { useCatalogStore } from '../../store/catalogStore'
import { ChevronDown, Library, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface PatternSourceSelectorProps {
  onManageLibraries: () => void
}

export function PatternSourceSelector({ onManageLibraries }: PatternSourceSelectorProps) {
  const activeSource = useCatalogStore((s) => s.activeSource)
  const setActiveSource = useCatalogStore((s) => s.setActiveSource)
  const libraryIndex = useCatalogStore((s) => s.libraryIndex)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    setTimeout(() => document.addEventListener('click', handler), 0)
    return () => document.removeEventListener('click', handler)
  }, [open])

  const activeLabel = libraryIndex.find((m) => m.id === activeSource)?.name || 'Select a library'

  return (
    <div ref={ref} className="relative px-1 pb-1">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-2/60 transition-colors"
      >
        <Library size={11} className="shrink-0" />
        <span className="flex-1 text-left truncate">{activeLabel}</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-1 right-1 top-full mt-1 c-menu-popup z-[100] min-w-0">
          {libraryIndex.map((lib) => (
            <button
              key={lib.id}
              className={`c-menu-item ${activeSource === lib.id ? '!text-text-primary !bg-surface-3/60' : ''}`}
              onClick={() => { setActiveSource(lib.id); setOpen(false) }}
            >
              <Library size={12} />
              <span className="truncate">{lib.name}</span>
            </button>
          ))}

          <div className="border-t border-border my-1" />

          <button
            className="c-menu-item"
            onClick={() => { onManageLibraries(); setOpen(false) }}
          >
            <Settings size={12} /> Manage Libraries...
          </button>
        </div>
      )}
    </div>
  )
}
