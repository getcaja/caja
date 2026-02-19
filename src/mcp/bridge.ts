// Frontend MCP bridge — listens for events from the Rust HTTP server,
// executes tools/reads resources, and sends results back.

import { executeTool } from './tools'
import { readResource } from './resources'

// Deduplicate events by ID — each Rust HTTP request has a unique ID,
// so even if multiple listeners exist (React Strict Mode, HMR, etc.),
// each tool call executes exactly once.
const handled = new Set<string>()

// Serialize tool execution — mutations must run one at a time to avoid
// Zustand state races when multiple MCP calls arrive in parallel.
let toolQueue = Promise.resolve()

let unlisten: (() => void)[] = []

export async function startMcpBridge() {
  stopMcpBridge()

  if (!('__TAURI_INTERNALS__' in window)) return

  const { listen } = await import('@tauri-apps/api/event')
  const { invoke } = await import('@tauri-apps/api/core')

  // Handle tool calls from MCP server (serialized)
  const unlistenTool = await listen<{ id: string; name: string; params: Record<string, unknown> }>(
    'mcp-tool-call',
    (event) => {
      const { id, name, params } = event.payload
      if (handled.has(id)) return
      handled.add(id)
      toolQueue = toolQueue.then(async () => {
        const result = await executeTool(name, params)
        await invoke('mcp_respond', { id, result: JSON.stringify(result) })
      })
    }
  )

  // Handle resource reads from MCP server (no serialization needed — read-only)
  const unlistenResource = await listen<{ id: string; uri: string }>(
    'mcp-resource-read',
    async (event) => {
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

  unlisten = [unlistenTool, unlistenResource]
}

export function stopMcpBridge() {
  unlisten.forEach((fn) => fn())
  unlisten = []
}

// Clean up on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => stopMcpBridge())
}
