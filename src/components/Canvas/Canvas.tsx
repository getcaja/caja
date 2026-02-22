import { useFrameStore } from '../../store/frameStore'
import { FrameRenderer } from './FrameRenderer'
import { InsertBar } from './InsertBar'
import { ResponsiveBar } from './ResponsiveBar'

export function Canvas() {
  const root = useFrameStore((s) => s.root)
  const hover = useFrameStore((s) => s.hover)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const hasChildren = root.children.length > 0

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        id="caja-canvas"
        className={`flex-1 flex flex-col overflow-auto bg-surface-0 ${canvasWidth ? 'items-center' : ''} ${previewMode ? 'preview-mode' : ''}`}
        onMouseLeave={previewMode ? undefined : () => hover(null)}
      >
        <div
          className="flex-1 flex flex-col"
          style={canvasWidth ? { width: canvasWidth, maxWidth: '100%' } : undefined}
        >
          <FrameRenderer frame={root} rootMinHeight />
        </div>
        {!hasChildren && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="text-text-muted text-[12px]">Add an element to start</span>
          </div>
        )}
      </div>
      {!previewMode && <ResponsiveBar />}
      {!previewMode && <InsertBar />}
    </div>
  )
}
