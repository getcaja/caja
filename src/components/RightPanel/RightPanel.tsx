import { Component, Minus, Plus, RotateCcw } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'
import { ZOOM_LEVELS } from '../Canvas/ZoomBar'
import { canvasZoomTo } from '../Canvas/CanvasInline'

const BP_LABELS: Record<string, string> = { md: 'md', sm: 'sm' }

function DesignBar() {
  const canvasZoom = useFrameStore((s) => s.canvasZoom)
  const selectedId = useFrameStore((s) => s.selectedId)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const selected = useFrameStore((s) => s.getSelected())
  const clearResponsiveOverrides = useFrameStore((s) => s.clearResponsiveOverrides)
  const prevZoom = [...ZOOM_LEVELS].reverse().find((z) => z < canvasZoom - 0.001)
  const nextZoom = ZOOM_LEVELS.find((z) => z > canvasZoom + 0.001)

  const hasOverridesAtBp = activeBreakpoint !== 'base' && selected != null
    && selected.responsive?.[activeBreakpoint as 'md' | 'sm'] != null
    && Object.keys(selected.responsive[activeBreakpoint as 'md' | 'sm']!).length > 0

  const btn = 'w-5 h-5 flex items-center justify-center shrink-0 rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted'

  return (
    <div className={`flex items-center gap-1 px-4 py-1.5 shrink-0${selectedId ? '' : ' border-b border-border'}`}>
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

      {activeBreakpoint !== 'base' && (
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 text-[10px] font-medium leading-none rounded bg-accent/20 text-accent select-none">
            {BP_LABELS[activeBreakpoint]}
          </span>
          {hasOverridesAtBp && (
            <button
              onClick={() => clearResponsiveOverrides(selected!.id, activeBreakpoint as 'md' | 'sm')}
              className="w-4 h-4 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-accent/10"
              title="Reset all overrides at this breakpoint"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      )}

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
      <div
        className="flex-1 overflow-y-auto"
      >
        <ErrorBoundary fallback="inline" resetKey={selectedId}>
          <Properties />
        </ErrorBoundary>
      </div>
    </div>
  )
}
