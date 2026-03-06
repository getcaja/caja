import { useState } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { McpModal } from '../McpModal/McpModal'
import { ShortcutsButton } from './ShortcutsPanel'
import { Cable, Loader2 } from 'lucide-react'

const TRAFFIC_LIGHT_WIDTH = 70
const TITLE_BAR_HEIGHT = 38

export function TitleBar() {
  const filePath = useFrameStore((s) => s.filePath)
  const projectName = useFrameStore((s) => s.projectName)
  const dirty = useFrameStore((s) => s.dirty)
  const mcpConnected = useFrameStore((s) => s.mcpConnected)
  const mcpBusy = useFrameStore((s) => s.mcpBusy)
  const [showMcp, setShowMcp] = useState(false)

  const fileName = filePath ? filePath.split('/').pop()?.replace('.caja', '') : projectName ?? 'Untitled'

  return (
    <div
      className="relative flex items-center bg-overlay border-b border-border select-none"
      data-tauri-drag-region
      style={{ height: TITLE_BAR_HEIGHT, paddingLeft: TRAFFIC_LIGHT_WIDTH }}
    >
      {/* Centered title — absolute so it's truly centered across full width */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[12px] fg-muted">
          {fileName}
          {dirty && (
            <span className="fg-subtle text-[10px] ml-1" title="Unsaved changes">●</span>
          )}
        </span>
      </div>

      {/* Spacer — drag region (explicit attribute for WKWebView reliability) */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Right-side buttons */}
      <div className="flex items-center gap-1 pr-4">
        <ShortcutsButton />
        <button
          onClick={() => setShowMcp(true)}
          className="w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset"
          title={mcpConnected ? 'MCP Connected' : 'MCP Offline'}
        >
          {mcpBusy ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Cable size={12} />
          )}
        </button>
      </div>

      <McpModal open={showMcp} onOpenChange={setShowMcp} />
    </div>
  )
}
