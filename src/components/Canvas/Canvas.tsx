import { useFrameStore } from '../../store/frameStore'
import { FrameRenderer } from './FrameRenderer'

export function Canvas() {
  const root = useFrameStore((s) => s.root)
  const hover = useFrameStore((s) => s.hover)
  const hasChildren = root.children.length > 0

  return (
    <div id="caja-canvas" className="flex-1 flex flex-col overflow-auto bg-surface-0 relative" onMouseLeave={() => hover(null)}>
      <FrameRenderer frame={root} rootMinHeight />
      {!hasChildren && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span className="text-text-muted text-[12px]">Add an element to start</span>
        </div>
      )}
    </div>
  )
}
