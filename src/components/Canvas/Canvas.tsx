import { useFrameStore } from '../../store/frameStore'
import { CanvasIframe } from './CanvasIframe'
import { Toolbar } from './Toolbar'

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        className="flex-1 overflow-auto flex"
        style={previewMode ? undefined : { backgroundColor: '#0e0e11' }}
      >
        <CanvasIframe />
        {!hasChildren && !previewMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-text-muted text-[12px]">Add an element to start</span>
          </div>
        )}
      </div>
      <Toolbar />
    </div>
  )
}
