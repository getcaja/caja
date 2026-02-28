import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'

export function RightPanel() {
  const selectedId = useFrameStore((s) => s.selectedIds[0] ?? null)

  return (
    <div className="h-full bg-surface-1/80">
      <ErrorBoundary fallback="inline" resetKey={selectedId}>
        <Properties />
      </ErrorBoundary>
    </div>
  )
}
