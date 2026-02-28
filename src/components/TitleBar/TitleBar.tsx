import { useState } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { McpModal } from '../McpModal/McpModal'

const TRAFFIC_LIGHT_WIDTH = 70
const TITLE_BAR_HEIGHT = 38

export function TitleBar() {
  const filePath = useFrameStore((s) => s.filePath)
  const dirty = useFrameStore((s) => s.dirty)
  const mcpConnected = useFrameStore((s) => s.mcpConnected)
  const [showMcp, setShowMcp] = useState(false)

  const fileName = filePath ? filePath.split('/').pop()?.replace('.caja', '') : 'Untitled — Caja'

  return (
    <div
      className="relative flex items-center bg-surface-0/60 backdrop-blur-md border-b border-border select-none"
      data-tauri-drag-region
      style={{ height: TITLE_BAR_HEIGHT, paddingLeft: TRAFFIC_LIGHT_WIDTH }}
    >
      {/* Centered title — absolute so it's truly centered across full width */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[12px] text-text-secondary">
          {fileName}
          {dirty && (
            <span className="text-text-muted text-[10px] ml-1" title="Unsaved changes">●</span>
          )}
        </span>
      </div>

      {/* Spacer — drag region (explicit attribute for WKWebView reliability) */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* MCP status button */}
      <div className="flex items-center px-1 pr-2">
        <button
          onClick={() => setShowMcp(true)}
          className="flex items-center gap-1.5 px-2.5 h-[24px] rounded-md text-[11px] text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-colors"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${mcpConnected ? 'bg-accent' : 'bg-text-muted'}`}
          />
          <span>MCP</span>
        </button>
      </div>

      <McpModal open={showMcp} onOpenChange={setShowMcp} />
    </div>
  )
}
