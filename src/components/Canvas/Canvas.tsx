import { useFrameStore } from '../../store/frameStore'
import { CanvasInline } from './CanvasInline'
import { Toolbar } from './Toolbar'

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        className="flex-1 overflow-auto flex"
        style={previewMode ? undefined : { backgroundColor: 'var(--color-canvas-bg)' }}
      >
        <CanvasInline />
        {!hasChildren && !previewMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="fg-subtle text-[12px]">Add an element to start, or ask an Agent to build this page</span>
          </div>
        )}
      </div>
      <Toolbar />
    </div>
  )
}
