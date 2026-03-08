import { useFrameStore } from '../../store/frameStore'

/** Contextual keyboard shortcut hints — Safari-style bar at bottom-left of canvas. */
export function CanvasHints() {
  const hint = useFrameStore((s) => {
    if (!s.showHints || s.previewMode) return null

    if (s.canvasDragId) {
      return 'Hold \u2318 to deep drop'
    }

    return null
  })

  if (!hint) return null

  return (
    <div className="c-canvas-hint">
      {hint}
    </div>
  )
}
