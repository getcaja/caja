import { useFrameStore } from '../../store/frameStore'

const BREAKPOINTS = [
  { label: 'Auto', width: null as number | null },
  { label: 'Large', width: 1440 },
  { label: 'Medium', width: 768 },
  { label: 'Small', width: 375 },
]

export function ResponsiveBar() {
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const setCanvasWidth = useFrameStore((s) => s.setCanvasWidth)

  return (
    <div className="flex items-center gap-0.5 bg-surface-1 border border-border rounded-lg px-1 py-1">
      <button
        onClick={() => setCanvasWidth(null)}
        className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
          canvasWidth === null
            ? 'bg-surface-3 text-text-primary'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
        }`}
        title="Full width"
      >
        Auto
      </button>
      <div className="w-px h-3.5 bg-border mx-0.5" />
      {BREAKPOINTS.slice(1).map((bp) => {
        const active = bp.width === canvasWidth
        return (
          <button
            key={bp.label}
            onClick={() => setCanvasWidth(bp.width)}
            className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
              active
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
            }`}
            title={`${bp.width}px`}
          >
            {bp.label}
          </button>
        )
      })}
    </div>
  )
}
