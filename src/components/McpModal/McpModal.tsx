import { useState, useCallback, useEffect } from 'react'
import { Dialog } from '../ui/Dialog'
import { Check, Copy, ChevronDown, ChevronRight, X } from 'lucide-react'

interface McpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Client = 'claude-code' | 'claude-desktop' | 'cursor' | 'vscode' | 'codex'

const isTauri = '__TAURI_INTERNALS__' in window

const CLIENTS: { id: Client; label: string }[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'codex', label: 'Codex' },
]

function getSnippet(client: Client, serverPath: string): string {
  const isNode = serverPath.endsWith('.mjs')
  const entry = isNode
    ? { command: 'node', args: [serverPath] }
    : { command: serverPath }

  if (client === 'codex') {
    if (isNode) {
      return `[mcp_servers.caja]\ncommand = "node"\nargs = ["${serverPath}"]`
    }
    return `[mcp_servers.caja]\ncommand = "${serverPath}"`
  }
  const key = client === 'vscode' ? 'servers' : 'mcpServers'
  return JSON.stringify({ [key]: { caja: entry } }, null, 2)
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 px-2 py-1 rounded text-[11px] fg-muted hover:fg-default hover:bg-inset transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

async function installMcp(client: Client): Promise<'installed' | 'already' | 'error'> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result: string = await invoke('install_mcp', { client })
    return result as 'installed' | 'already'
  } catch (err) {
    console.error('Failed to install MCP config:', err)
    return 'error'
  }
}

export function McpModal({ open, onOpenChange }: McpModalProps) {
  const [activeClient, setActiveClient] = useState<Client>('claude-code')
  const [installState, setInstallState] = useState<'idle' | 'installed' | 'already' | 'error'>('idle')
  const [showManual, setShowManual] = useState(false)
  const [serverPath, setServerPath] = useState<string | null>(null)

  // Resolve the real server.mjs path once
  useEffect(() => {
    if (!isTauri || !open) return
    import('@tauri-apps/api/core').then(({ invoke }) =>
      invoke<string>('resolve_mcp_server_path').then(setServerPath).catch(() => {}),
    )
  }, [open])

  const config = getSnippet(activeClient, serverPath ?? '/Applications/Caja.app/Contents/Resources/resources/caja-mcp')

  const handleInstall = useCallback(async () => {
    const result = await installMcp(activeClient)
    setInstallState(result)
    setTimeout(() => setInstallState('idle'), 3000)
  }, [activeClient])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="c-modal w-[480px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold fg-default">MCP Server</h2>
          <button className="w-5 h-5 c-icon-btn" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        {/* Description */}
        <p className="px-4 pt-3 pb-3 text-[12px] fg-muted leading-relaxed">
          Connect AI agents to Caja's design canvas. The MCP server lets
          external tools read, create, and modify frames in real time.
        </p>

        {/* Client tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveClient(c.id); setInstallState('idle') }}
              className={`px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                activeClient === c.id
                  ? 'bg-emphasis fg-default'
                  : 'fg-muted hover:fg-default hover:bg-inset'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Install button */}
        {isTauri && (
          <div className="px-4 pb-3">
            <button
              onClick={handleInstall}
              disabled={installState !== 'idle'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-accent fg-default text-[12px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {installState === 'idle' && <>Add to {CLIENTS.find((c) => c.id === activeClient)!.label}</>}
              {installState === 'installed' && <><Check size={14} /> Installed</>}
              {installState === 'already' && <><Check size={14} /> Already configured</>}
              {installState === 'error' && <>Failed — try manual setup below</>}
            </button>
          </div>
        )}

        {/* Manual setup (collapsible) */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-2 text-[11px] fg-muted hover:fg-default transition-colors mb-2"
          >
            {showManual ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            Manual setup
          </button>
          {showManual && (
            <div className="rounded-lg bg-surface-0 border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
                <span className="text-[11px] fg-subtle">Configuration</span>
                <CopyButton text={config} />
              </div>
              <pre className="px-3 py-3 text-[11px] leading-relaxed fg-muted overflow-x-auto">
                {config}
              </pre>
            </div>
          )}
          {!showManual && (
            <p className="text-[11px] fg-subtle leading-relaxed">
              Caja must be running when the MCP client starts.
            </p>
          )}
        </div>
      </div>
    </Dialog>
  )
}
