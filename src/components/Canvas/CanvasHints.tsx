import { useFrameStore, findInTree, isRootId } from '../../store/frameStore'

/** Contextual keyboard shortcut hints — Safari-style bar at bottom-left of canvas. */
export function CanvasHints() {
  const hint = useFrameStore((s) => {
    if (s.previewMode) return null

    if (!s.showHints) return null

    if (s.canvasDragId) {
      return '\u2318 Hold to drop inside'
    }

    // Show navigate hint when hovering a link with href
    if (s.hoveredId) {
      const frame = findInTree(s.root, s.hoveredId)
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
