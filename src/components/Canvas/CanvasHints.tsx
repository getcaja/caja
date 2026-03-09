import { useFrameStore, findInTree } from '../../store/frameStore'

/** Contextual keyboard shortcut hints — Safari-style bar at bottom-left of canvas. */
export function CanvasHints() {
  const hint = useFrameStore((s) => {
    if (!s.showHints || s.previewMode) return null

    if (s.canvasDragId) {
      return 'Hold \u2318 to deep drop'
    }

    // Show navigate hint when hovering a link with href
    if (s.hoveredId) {
      const frame = findInTree(s.root, s.hoveredId)
      if (frame && (frame.type === 'text' || frame.type === 'button') && frame.href) {
        return '\u2318 Click to follow link'
      }
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
