import { Minus, Plus } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1]

export function ZoomBar() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const setCanvasZoom = useFrameStore((s) => s.setCanvasZoom)

  const idx = ZOOM_LEVELS.indexOf(canvasZoom)

  return (
    <div className="absolute bottom-3 left-3 z-40 flex items-center gap-0.5 bg-surface-1 border border-border rounded-lg px-1 py-1 shadow-xl">
      <button
        onClick={() => idx > 0 && setCanvasZoom(ZOOM_LEVELS[idx - 1])}
        disabled={idx <= 0}
        className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
        title="Zoom out (⌘−)"
      >
        <Minus size={12} />
      </button>
      <span className="text-[11px] text-text-secondary min-w-[36px] text-center tabular-nums">
        {Math.round(canvasZoom * 100)}%
      </span>
      <button
        onClick={() => idx < ZOOM_LEVELS.length - 1 && setCanvasZoom(ZOOM_LEVELS[idx + 1])}
        disabled={idx >= ZOOM_LEVELS.length - 1}
        className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
        title="Zoom in (⌘+)"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
