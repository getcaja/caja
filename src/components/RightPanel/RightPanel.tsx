import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'

export function RightPanel() {
  const selectedId = useFrameStore((s) => s.selectedId)

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="flex-1 overflow-y-auto">
        <ErrorBoundary fallback="inline" resetKey={selectedId}>
          <Properties />
        </ErrorBoundary>
      </div>
    </div>
  )
}
