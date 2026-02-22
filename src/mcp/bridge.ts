// Frontend MCP bridge — listens for events from the Rust HTTP server,
// executes tools/reads resources, and sends results back.

import { executeTool } from './tools'
import { readResource } from './resources'

// Deduplicate events by ID — persisted on window so it survives HMR module
// re-evaluation. Without this, leaked listeners from React StrictMode's
// double-mount hold the OLD Set while new listeners get a fresh one,
// causing the same event to be processed twice after HMR.
const handled: Set<string> = ((window as any).__cajaHandled ??= new Set<string>())

// Generation counter — incremented on every startMcpBridge(). Leaked listeners
// from concurrent/double starts (React StrictMode) compare their captured gen
// against the current one and self-invalidate if stale.
let bridgeGen: number = ((window as any).__cajaBridgeGen as number) ?? 0

// Serialize tool execution — mutations must run one at a time to avoid
// Zustand state races when multiple MCP calls arrive in parallel.
let toolQueue = Promise.resolve()

let unlisten: (() => void)[] = []

export async function startMcpBridge() {
  stopMcpBridge()

  if (!('__TAURI_INTERNALS__' in window)) return

  // Claim a new generation — any in-flight start with an older gen will bail
  const myGen = ++bridgeGen
  ;(window as any).__cajaBridgeGen = bridgeGen

  const { listen } = await import('@tauri-apps/api/event')
  const { invoke } = await import('@tauri-apps/api/core')
  const { useFrameStore } = await import('../store/frameStore')

  // If another startMcpBridge() was called while we awaited, abort
  if (myGen !== (window as any).__cajaBridgeGen) return

  // Handle tool calls from MCP server (serialized)
  const unlistenTool = await listen<{ id: string; name: string; params: Record<string, unknown> }>(
    'mcp-tool-call',
    (event) => {
      if (myGen !== (window as any).__cajaBridgeGen) return // stale listener
      const { id, name, params } = event.payload
      if (handled.has(id)) return
      handled.add(id)
      toolQueue = toolQueue.then(async () => {
        const result = await executeTool(name, params)
        await invoke('mcp_respond', { id, result: JSON.stringify(result) })
      })
    }
  )

  // Check again after async registration
  if (myGen !== (window as any).__cajaBridgeGen) {
    unlistenTool()
    return
  }

  // Handle resource reads from MCP server (no serialization needed — read-only)
  const unlistenResource = await listen<{ id: string; uri: string }>(
    'mcp-resource-read',
    async (event) => {
      if (myGen !== (window as any).__cajaBridgeGen) return // stale listener
      const { id, uri } = event.payload
      if (handled.has(id)) return
      handled.add(id)
      const resource = readResource(uri)
      await invoke('mcp_respond', {
        id,
        result: JSON.stringify(resource ?? { error: `Resource not found: ${uri}` }),
      })
    }
  )

  // Final check
  if (myGen !== (window as any).__cajaBridgeGen) {
    unlistenTool()
    unlistenResource()
    return
  }

  unlisten = [unlistenTool, unlistenResource]

  // MCP bridge runs in-process — mark connected when listeners are up
  useFrameStore.setState({ mcpConnected: true })
}

export function stopMcpBridge() {
  unlisten.forEach((fn) => fn())
  unlisten = []
}

// Clean up and restart on HMR so tool code changes take effect
if (import.meta.hot) {
  import.meta.hot.dispose(() => stopMcpBridge())
  import.meta.hot.accept(() => {
    startMcpBridge()
  })
}
