import { useFrameStore, findInTree, isRootId } from '../../store/frameStore'
import { useHoverStore } from '../../store/hoverStore'

/** Contextual keyboard shortcut hints — Safari-style bar at bottom-left of canvas. */
export function CanvasHints() {
  const hoveredId = useHoverStore((s) => s.hoveredId)
  const hint = useFrameStore((s) => {
    if (s.previewMode) return null

    if (!s.showHints) return null

    if (s.canvasDragId) {
      return '\u2318 Hold to drop inside'
    }

    // Show navigate hint when hovering a link with href
    if (hoveredId) {
      const frame = findInTree(s.root, hoveredId)
      if (frame && (frame.type === 'text' || frame.type === 'button') && frame.href) {
        return '\u2318 Click to follow link'
      }
    }

    // Deep-select mode active
    if (s.deepSelect) {
      return '\u2318 Click to deep select'
    }

    // Show "Esc to go up" when a non-root element is selected
    if (s.selectedId && !isRootId(s.selectedId)) {
      return 'Esc to select parent'
    }

    // Property panel hint (lowest priority)
    if (s.propertyHint) return s.propertyHint

    return null
  })

  if (!hint) return null

  return (
    <div className="c-canvas-hint">
      {hint}
    </div>
  )
}
