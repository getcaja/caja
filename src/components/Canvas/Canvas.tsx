import { useFrameStore } from '../../store/frameStore'
import { CanvasIframe } from './CanvasIframe'
import { Toolbar } from './Toolbar'

export function Canvas() {
  const hasChildren = useFrameStore((s) => s.root.children.length > 0)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasWidth = useFrameStore((s) => s.canvasWidth)
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)

  // Padding only when a specific breakpoint is selected (iframe floats in workspace)
  // Default fills edge-to-edge, preview fills completely
  const showPadding = !previewMode && canvasWidth !== null
  const activePage = pages.find((p) => p.id === activePageId)
  const showPageLabel = !previewMode && showPadding && pages.length > 1 && activePage

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div
        className="flex-1 overflow-auto flex"
        style={previewMode ? undefined : { backgroundColor: '#0e0e11' }}
      >
        <div className={showPadding ? 'flex flex-col justify-center mx-auto px-8' : 'contents'}>
          {showPageLabel && (
            <div className="h-8 flex items-center shrink-0">
              <span className="text-[13px] text-text-secondary font-medium">{activePage.name}</span>
            </div>
          )}
          <CanvasIframe />
          {showPageLabel && <div className="h-8 shrink-0" />}
        </div>
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
