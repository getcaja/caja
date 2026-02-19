import { useFrameStore } from '../../store/frameStore'

const TRAFFIC_LIGHT_WIDTH = 70
const TITLE_BAR_HEIGHT = 38

export function TitleBar() {
  const filePath = useFrameStore((s) => s.filePath)
  const dirty = useFrameStore((s) => s.dirty)
  const mcpConnected = useFrameStore((s) => s.mcpConnected)

  const fileName = filePath ? filePath.split('/').pop()?.replace('.caja', '') : 'Untitled'

  return (
    <div
      data-tauri-drag-region
      className="flex items-center bg-surface-0 border-b border-border select-none"
      style={{ height: TITLE_BAR_HEIGHT, paddingLeft: TRAFFIC_LIGHT_WIDTH }}
    >
      {/* Tab bar */}
      <div className="flex items-center h-full">
        <div className="flex items-center gap-1.5 px-3 h-[28px] rounded-md bg-surface-1 text-[12px] text-text-primary">
          <span>{fileName}</span>
          {dirty && (
            <span className="text-text-muted text-[10px]" title="Unsaved changes">●</span>
          )}
        </div>
      </div>

      {/* Spacer — drag region */}
      <div data-tauri-drag-region className="flex-1 h-full" />

      {/* MCP status */}
      <div className="flex items-center gap-1.5 px-4 text-[11px] text-text-muted">
        <div
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            backgroundColor: mcpConnected ? '#22C55E' : '#71717a',
          }}
        />
        <span>MCP</span>
      </div>
    </div>
  )
}
