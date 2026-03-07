import { useFrameStore } from '../../store/frameStore'
import { Properties } from '../Properties/Properties'
import { ErrorBoundary } from '../ErrorBoundary'
import { ViewportBar } from './ViewportBar'

export function RightPanel() {
  const selectedId = useFrameStore((s) => s.selectedId)

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <ViewportBar />
      <div className="flex-1 overflow-y-auto">
        <ErrorBoundary fallback="inline" resetKey={selectedId}>
          <Properties />
        </ErrorBoundary>
      </div>
    </div>
  )
}
