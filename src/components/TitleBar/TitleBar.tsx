import { useState } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { McpModal } from '../McpModal/McpModal'
import { ShortcutsListener } from './ShortcutsPanel'
import { Cable, Loader2, Eye } from 'lucide-react'

const TRAFFIC_LIGHT_WIDTH = 70
const TITLE_BAR_HEIGHT = 38

export function TitleBar() {
  const filePath = useFrameStore((s) => s.filePath)
  const projectName = useFrameStore((s) => s.projectName)
  const dirty = useFrameStore((s) => s.dirty)
  const mcpConnected = useFrameStore((s) => s.mcpConnected)
  const mcpBusy = useFrameStore((s) => s.mcpBusy)
  const previewMode = useFrameStore((s) => s.previewMode)
  const setPreviewMode = useFrameStore((s) => s.setPreviewMode)
  const setCanvasTool = useFrameStore((s) => s.setCanvasTool)
  const [showMcp, setShowMcp] = useState(false)

  const fileName = filePath ? filePath.split('/').pop()?.replace('.caja', '') : projectName ?? 'Untitled'

  const btn = 'w-6 h-6 flex items-center justify-center rounded'

  return (
    <div
      className="relative flex items-center border-b border-border select-none"
      style={{ height: TITLE_BAR_HEIGHT, paddingLeft: TRAFFIC_LIGHT_WIDTH, backgroundColor: 'var(--panel-bg)' }}
      data-tauri-drag-region
    >
      {/* Centered title — absolute so it's truly centered across full width */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[12px] fg-default">
          {fileName}
          {dirty && (
            <span className="fg-default text-[10px] ml-1" title="Unsaved changes">●</span>
          )}
        </span>
      </div>

      {/* Spacer — drag region */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Right-side buttons */}
      <div className="flex items-center gap-1.5 pr-3">
        <button
          onClick={() => { setPreviewMode(!previewMode); if (!previewMode) setCanvasTool('pointer') }}
          className={`${btn} c-icon-btn ${previewMode ? 'is-active !bg-accent !fg-default' : ''}`}
          title="Preview (⌘⇧P)"
        >
          <Eye size={12} />
        </button>
        <button
          onClick={() => setShowMcp(true)}
          className={`${btn} c-icon-btn`}
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
      <ShortcutsListener />
    </div>
  )
}
