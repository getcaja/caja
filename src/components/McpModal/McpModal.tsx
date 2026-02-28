import { useState, useCallback } from 'react'
import { Dialog } from '../ui/Dialog'
import { useFrameStore } from '../../store/frameStore'
import { Check, Copy, Plus } from 'lucide-react'

interface McpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Client = 'claude-code' | 'claude-desktop' | 'codex' | 'vscode'

const CLIENTS: { id: Client; label: string }[] = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'codex', label: 'Codex' },
  { id: 'vscode', label: 'VS Code' },
]

function getConfig(client: Client): { snippet: string; instructions: string } {
  switch (client) {
    case 'claude-code':
      return {
        snippet: JSON.stringify({
          mcpServers: {
            caja: {
              command: 'node',
              args: ['src/mcp/server.mjs'],
            },
          },
        }, null, 2),
        instructions: 'Add to .mcp.json in your project root.\nCaja must be running when the MCP server starts.',
      }
    case 'claude-desktop':
      return {
        snippet: JSON.stringify({
          mcpServers: {
            caja: {
              command: 'node',
              args: ['/absolute/path/to/caja/src/mcp/server.mjs'],
            },
          },
        }, null, 2),
        instructions: 'Merge into ~/Library/Application Support/Claude/claude_desktop_config.json\nReplace the path with the absolute path to server.mjs.\nTip: copy this config and ask your AI assistant to install it for you.',
      }
    case 'codex':
      return {
        snippet: JSON.stringify({
          mcpServers: {
            caja: {
              command: 'node',
              args: ['src/mcp/server.mjs'],
            },
          },
        }, null, 2),
        instructions: 'Add to .codex/mcp.json in your project root.\nCaja must be running when the MCP server starts.',
      }
    case 'vscode':
      return {
        snippet: JSON.stringify({
          servers: {
            caja: {
              command: 'node',
              args: ['src/mcp/server.mjs'],
            },
          },
        }, null, 2),
        instructions: 'Add to .vscode/mcp.json in your project root.\nCaja must be running when the MCP server starts.',
      }
  }
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
      className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

async function installClaudeCode(): Promise<'installed' | 'already' | 'error'> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const result: string = await invoke('install_mcp_claude_code')
    return result as 'installed' | 'already'
  } catch (err) {
    console.error('Failed to install MCP config:', err)
    return 'error'
  }
}

export function McpModal({ open, onOpenChange }: McpModalProps) {
  const mcpConnected = useFrameStore((s) => s.mcpConnected)
  const [activeClient, setActiveClient] = useState<Client>('claude-code')
  const [installState, setInstallState] = useState<'idle' | 'installed' | 'already' | 'error'>('idle')

  const config = getConfig(activeClient)

  const handleInstall = useCallback(async () => {
    const result = await installClaudeCode()
    setInstallState(result)
    setTimeout(() => setInstallState('idle'), 3000)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-surface-1 border border-border rounded-xl w-[480px] max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[14px] font-semibold text-text-primary">MCP Server</h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              <div
                className={`w-1.5 h-1.5 rounded-full ${mcpConnected ? 'bg-accent' : 'bg-text-muted'}`}
              />
              <span className={mcpConnected ? 'text-accent' : 'text-text-muted'}>
                {mcpConnected ? 'Running' : 'Offline'}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-text-muted">localhost:3334</span>
        </div>

        {/* Description */}
        <p className="px-5 pb-4 text-[12px] text-text-secondary leading-relaxed">
          Connect AI agents to Caja's design canvas. The MCP server lets
          external tools read, create, and modify frames in real time.
        </p>

        {/* Client tabs */}
        <div className="flex gap-1 px-5 pb-3">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveClient(c.id)}
              className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                activeClient === c.id
                  ? 'bg-surface-3 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Config snippet */}
        <div className="mx-5 mb-3 rounded-lg bg-surface-0 border border-border overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
            <span className="text-[11px] text-text-muted">Configuration</span>
            <CopyButton text={config.snippet} />
          </div>
          <pre className="px-3 py-3 text-[11px] leading-relaxed text-text-secondary overflow-x-auto">
            {config.snippet}
          </pre>
        </div>

        {/* Install button (Claude Code only) */}
        {activeClient === 'claude-code' && (
          <div className="px-5 pb-3">
            <button
              onClick={handleInstall}
              disabled={installState !== 'idle'}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-60"
            >
              {installState === 'idle' && <>Add to Claude Code</>}
              {installState === 'installed' && <><Check size={14} /> Added to ~/.claude.json</>}
              {installState === 'already' && <><Check size={14} /> Already configured</>}
              {installState === 'error' && <>Failed — copy config manually</>}
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="px-5 pb-5">
          <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-line">
            {activeClient === 'claude-code'
              ? 'Or copy the config above and add it manually.\nCaja must be running when Claude Code starts.'
              : config.instructions}
          </p>
        </div>
      </div>
    </Dialog>
  )
}
