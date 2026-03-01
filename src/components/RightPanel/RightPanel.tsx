import { Component, Minus, Plus } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'

function DesignBar() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const selectedId = useFrameStore((s) => s.selectedId)
  const prevZoom = [...ZOOM_LEVELS].reverse().find((z) => z < canvasZoom - 0.001)
  const nextZoom = ZOOM_LEVELS.find((z) => z > canvasZoom + 0.001)

  const btn = 'h-6 w-6 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0">
      <button
        onClick={() => {
          const store = useFrameStore.getState()
          if (store.selectedId) {
            store.createComponent(store.selectedId)
            return
          }
          const tab = store.treePanelTab
          store.setTreePanelTab(tab !== 'components' ? 'components' : 'layers')
        }}
        className={btn}
        title={selectedId ? 'Save selected as component' : 'Components'}
      >
        <Component size={12} />
      </button>

      <div className="flex-1" />

      <button
        onClick={() => prevZoom != null && canvasZoomTo(prevZoom)}
        disabled={prevZoom == null}
        className={btn}
        title="Zoom out (⌘−)"
      >
        <Minus size={12} />
      </button>
      <span className="text-[12px] text-text-secondary min-w-[36px] text-center tabular-nums select-none">
        {Math.round(canvasZoom * 100)}%
      </span>
      <button
        onClick={() => nextZoom != null && canvasZoomTo(nextZoom)}
        disabled={nextZoom == null}
        className={btn}
        title="Zoom in (⌘+)"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

export function RightPanel() {
  const selectedId = useFrameStore((s) => s.selectedId)

  return (
    <div className="h-full bg-surface-1/80 flex flex-col">
      <DesignBar />
      <div className="flex-1 overflow-y-auto">
        <ErrorBoundary fallback="inline" resetKey={selectedId}>
          <Properties />
        </ErrorBoundary>
      </div>
    </div>
  )
}
