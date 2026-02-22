import { Maximize, Smartphone, Tablet, Monitor } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'

const BREAKPOINTS = [
  { label: 'Default', icon: Maximize, width: null as number | null },
  { label: '1440', icon: Monitor, width: 1440 },
  { label: '1024', icon: Monitor, width: 1024 },
  { label: '768', icon: Tablet, width: 768 },
  { label: '375', icon: Smartphone, width: 375 },
]

export function ResponsiveBar() {
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-0.5 bg-surface-1 border border-border rounded-lg px-1 py-1 shadow-xl">
      {BREAKPOINTS.map((bp) => {
        const active = bp.width === canvasWidth
        const Icon = bp.icon
        return (
          <button
            key={bp.label}
            onClick={() => setCanvasWidth(bp.width)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
              active
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={bp.width ? `${bp.width}px` : 'Full width'}
          >
            <Icon size={12} />
            <span>{bp.label}</span>
          </button>
        )
      })}
    </div>
  )
}
