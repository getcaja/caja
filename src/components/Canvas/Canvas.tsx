import { useFrameStore } from '../../store/frameStore'
import { CanvasIframe } from './CanvasIframe'
import { InsertBar } from './InsertBar'
import { ResponsiveBar } from './ResponsiveBar'
import { ZoomBar } from './ZoomBar'

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)

  // Padding only when a specific breakpoint is selected (iframe floats in workspace)
  // Default fills edge-to-edge, preview fills completely
  const showPadding = !previewMode && canvasWidth !== null

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        className={`flex-1 overflow-auto flex ${showPadding ? 'p-8' : ''}`}
        style={previewMode ? undefined : { backgroundColor: '#0e0e11' }}
      >
        <CanvasIframe />
      </div>
      {!hasChildren && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-text-muted text-[12px]">Add an element to start</span>
        </div>
      )}
      {!previewMode && (
        <div className="absolute bottom-3 inset-x-3 z-40 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto"><ResponsiveBar /></div>
          <div className="pointer-events-auto"><InsertBar /></div>
          <div className="pointer-events-auto"><ZoomBar /></div>
        </div>
      )}
    </div>
  )
}
