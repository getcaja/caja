import { RotateCcw } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'

const BP_LABELS: Record<string, string> = { md: 'md', sm: 'sm' }

function BreakpointBar() {
  const selectedId = useFrameStore((s) => s.selectedId)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const selected = useFrameStore((s) => s.getSelected())
  const clearResponsiveOverrides = useFrameStore((s) => s.clearResponsiveOverrides)

  if (activeBreakpoint === 'base' || !selectedId) return null

  const hasOverrides = selected != null
    && selected.responsive?.[activeBreakpoint as 'md' | 'sm'] != null
    && Object.keys(selected.responsive[activeBreakpoint as 'md' | 'sm']!).length > 0

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 shrink-0">
      <span className="px-1.5 py-0.5 text-[10px] font-medium leading-none rounded bg-accent/20 text-accent select-none">
        {BP_LABELS[activeBreakpoint]}
      </span>
      {hasOverrides && (
        <button
          onClick={() => clearResponsiveOverrides(selected!.id, activeBreakpoint as 'md' | 'sm')}
          className="w-4 h-4 flex items-center justify-center rounded text-text-muted hover:text-accent hover:bg-accent/10"
          title="Reset all overrides at this breakpoint"
        >
          <RotateCcw size={10} />
        </button>
      )}
    </div>
  )
}

export function RightPanel() {
  const selectedId = useFrameStore((s) => s.selectedId)

  return (
    <div className="h-full bg-surface-1/80 flex flex-col">
      <BreakpointBar />
      <div className="flex-1 overflow-y-auto">
        <ErrorBoundary fallback="inline" resetKey={selectedId}>
          <Properties />
        </ErrorBoundary>
      </div>
    </div>
  )
}
