#!/usr/bin/env node

// Caja MCP Server — standalone Node.js script
// Bridges between MCP protocol (stdio) and Caja's HTTP API (localhost:3334)
//
// Usage in Claude Code config (~/.claude.json):
// {
//   "mcpServers": {
//     "caja": {
//       "command": "node",
//       "args": ["/path/to/caja/src/mcp/server.mjs"]
//     }
//   }
// }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const CAJA_API = process.env.CAJA_API_URL || 'http://127.0.0.1:3334'

// ── HTTP helpers ──

async function callTool(name, params) {
  const res = await fetch(`${CAJA_API}/api/tool`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, params }),
  })
  if (!res.ok) throw new Error(`Caja API error: ${res.status}`)
  return res.json()
}

async function readResource(uri) {
  const res = await fetch(`${CAJA_API}/api/resource?uri=${encodeURIComponent(uri)}`)
  if (!res.ok) throw new Error(`Caja API error: ${res.status}`)
  return res.json()
}

async function checkHealth() {
  try {
    const res = await fetch(`${CAJA_API}/api/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

// ── MCP Server Setup ──

const server = new McpServer({
  name: 'caja',
  version: '0.1.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
})

// ── Tools ──

server.tool(
  'add_frame',
  'Add a new frame (box) or text element as a child of the given parent.',
  {
    parent_id: z.string().describe('ID of the parent box to add into'),
    element_type: z.enum(['box', 'text']).describe('Type of element to add'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Optional initial properties. Can include "id" to assign a custom ID (useful in batch_update).'),
  },
  async ({ parent_id, element_type, properties }) => {
    const result = await callTool('add_frame', { parent_id, element_type, properties })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'update_frame',
  'Update properties of an existing frame. Settable: bg, direction, justify, align, gap, wrap, content, fontSize, fontWeight, fontStyle, textDecoration, color, textAlign, borderRadius, overflow, grow, shrink, tailwindClasses.',
  {
    id: z.string().describe('ID of the frame to update'),
    properties: z.record(z.string(), z.unknown()).describe('Properties to set (partial update)'),
  },
  async ({ id, properties }) => {
    const result = await callTool('update_frame', { id, properties })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'update_spacing',
  'Update padding or margin of a frame. Values: { top, right, bottom, left } in pixels.',
  {
    id: z.string().describe('ID of the frame'),
    field: z.enum(['padding', 'margin']).describe('Which spacing to update'),
    values: z.object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    }).describe('Partial spacing values to merge'),
  },
  async ({ id, field, values }) => {
    const result = await callTool('update_spacing', { id, field, values })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'update_size',
  'Update width or height of a frame. Mode: default, hug, fill, or fixed (with pixel value).',
  {
    id: z.string().describe('ID of the frame'),
    dimension: z.enum(['width', 'height']).describe('Which dimension to update'),
    size: z.object({
      mode: z.enum(['default', 'hug', 'fill', 'fixed']).describe('Size mode'),
      value: z.number().optional().describe('Pixel value (only used when mode is fixed)'),
    }).describe('Size configuration'),
  },
  async ({ id, dimension, size }) => {
    const result = await callTool('update_size', { id, dimension, size })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'remove_frame',
  'Delete a frame from the tree. Cannot delete the root.',
  {
    id: z.string().describe('ID of the frame to remove'),
  },
  async ({ id }) => {
    const result = await callTool('remove_frame', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'move_frame',
  'Move a frame to a new parent at a specific index.',
  {
    id: z.string().describe('ID of the frame to move'),
    new_parent_id: z.string().describe('ID of the new parent box'),
    index: z.number().describe('Position index within the new parent'),
  },
  async ({ id, new_parent_id, index }) => {
    const result = await callTool('move_frame', { id, new_parent_id, index })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'wrap_frame',
  'Wrap a frame in a new parent box element.',
  {
    id: z.string().describe('ID of the frame to wrap'),
  },
  async ({ id }) => {
    const result = await callTool('wrap_frame', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'duplicate_frame',
  'Duplicate a frame (deep clone with new IDs), placed next to the original.',
  {
    id: z.string().describe('ID of the frame to duplicate'),
  },
  async ({ id }) => {
    const result = await callTool('duplicate_frame', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'rename_frame',
  'Rename a frame.',
  {
    id: z.string().describe('ID of the frame'),
    name: z.string().describe('New name'),
  },
  async ({ id, name }) => {
    const result = await callTool('rename_frame', { id, name })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'select_frame',
  'Select a frame in the UI (highlights it in the tree and canvas).',
  {
    id: z.string().describe('ID of the frame to select, or null to deselect'),
  },
  async ({ id }) => {
    const result = await callTool('select_frame', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'get_tree',
  'Read the full frame tree. Returns the complete layout structure as JSON.',
  {},
  async () => {
    const result = await callTool('get_tree', {})
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'get_selected',
  'Get the currently selected frame, or null if nothing is selected.',
  {},
  async () => {
    const result = await callTool('get_selected', {})
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'screenshot',
  'Take a screenshot of the canvas. Returns a base64-encoded PNG image. Selection outlines are temporarily hidden.',
  {},
  async () => {
    const result = await callTool('screenshot', {})
    if (result.success && result.data?.image) {
      return {
        content: [{
          type: 'image',
          data: result.data.image,
          mimeType: result.data.mimeType || 'image/png',
        }],
      }
    }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'batch_update',
  'Execute multiple operations in a single undo step. Use for coherent multi-frame changes.',
  {
    operations: z.array(z.object({
      tool: z.string().describe('Tool name (e.g. "add_frame", "update_frame")'),
      params: z.record(z.string(), z.unknown()).describe('Tool parameters'),
    })).describe('Array of tool calls to execute sequentially'),
  },
  async ({ operations }) => {
    const result = await callTool('batch_update', { operations })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

// ── Resources ──

server.resource(
  'caja://tree',
  'caja://tree',
  async (uri) => {
    const result = await readResource(uri.href)
    return {
      contents: [{
        uri: uri.href,
        text: result.content || JSON.stringify(result),
        mimeType: result.mimeType || 'application/json',
      }],
    }
  }
)

server.resource(
  'caja://selected',
  'caja://selected',
  async (uri) => {
    const result = await readResource(uri.href)
    return {
      contents: [{
        uri: uri.href,
        text: result.content || JSON.stringify(result),
        mimeType: result.mimeType || 'application/json',
      }],
    }
  }
)

server.resource(
  'caja://export',
  'caja://export',
  async (uri) => {
    const result = await readResource(uri.href)
    return {
      contents: [{
        uri: uri.href,
        text: result.content || JSON.stringify(result),
        mimeType: result.mimeType || 'text/plain',
      }],
    }
  }
)

server.resource(
  'caja://export/html',
  'caja://export/html',
  async (uri) => {
    const result = await readResource(uri.href)
    return {
      contents: [{
        uri: uri.href,
        text: result.content || JSON.stringify(result),
        mimeType: result.mimeType || 'text/html',
      }],
    }
  }
)

// ── Start ──

async function main() {
  const healthy = await checkHealth()
  if (!healthy) {
    console.error('Warning: Caja is not running on', CAJA_API)
    console.error('Start Caja first, then restart this MCP server.')
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('MCP server error:', err)
  process.exit(1)
})
