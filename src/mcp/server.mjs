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
    element_type: z.enum(['box', 'text', 'image', 'button', 'input', 'textarea', 'select', 'link']).describe('Type of element to add. For images, set src in properties. Use placeholder services like https://placehold.co/600x400 for mockups.'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Optional initial properties. Can include "id" to assign a custom ID (useful in batch_update).'),
    classes: z.string().optional().describe('Tailwind classes to apply. Example: "flex gap-4 p-8 bg-blue-500 rounded-lg". Parsed into frame properties. Explicit properties override parsed classes.'),
    index: z.number().optional().describe('Position index within the parent. If omitted, appends at the end.'),
  },
  async ({ parent_id, element_type, properties, classes, index }) => {
    const result = await callTool('add_frame', { parent_id, element_type, properties, classes, index })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'update_frame',
  'Update properties of an existing frame. Settable: bg, display, direction, justify, align, gap, wrap, content, fontSize, fontWeight, fontStyle, textDecoration, letterSpacing, textTransform, whiteSpace, color, textAlign, borderRadius, overflow, grow, shrink, alignSelf, minWidth, maxWidth, minHeight, maxHeight, boxShadow, cursor, tailwindClasses, opacity, tag, options, className, htmlId, position, zIndex, bgImage, bgSize, bgPosition, bgRepeat, gridCols, gridRows, colSpan, rowSpan, rotate, scaleVal, translateX, translateY, transition, duration, ease, blur, backdropBlur. display: "flex"|"inline-flex"|"block"|"inline-block"|"inline"|"grid".',
  {
    id: z.string().describe('ID of the frame to update'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Properties to set (partial update)'),
    classes: z.string().optional().describe('Tailwind classes to apply. Example: "flex gap-4 p-8 bg-blue-500 rounded-lg". Parsed into frame properties. Explicit properties override parsed classes.'),
  },
  async ({ id, properties, classes }) => {
    const result = await callTool('update_frame', { id, properties, classes })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'update_spacing',
  'Update padding, margin, or inset of a frame. Values: { top, right, bottom, left } in pixels. Inset controls top/right/bottom/left offsets for positioned elements.',
  {
    id: z.string().describe('ID of the frame'),
    field: z.enum(['padding', 'margin', 'inset']).describe('Which spacing to update'),
    values: z.object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    }).describe('Partial spacing values to merge'),
  },
  async ({ id, field, values }) => {
    const result = await callTool('update_spacing', { id, field, values })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'get_tree',
  'Read the full frame tree. Returns the complete layout structure as JSON. Use summary=true for a lightweight tree (~5KB vs 241KB) with only id, type, name, content, display, and children — ideal for LLM context.',
  {
    summary: z.boolean().optional().describe('When true, return a compact tree with only structural info (id, type, name, content, display, childCount). Default false.'),
  },
  async ({ summary }) => {
    const result = await callTool('get_tree', { summary })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'get_selected',
  'Get the currently selected frame, or null if nothing is selected.',
  {},
  async () => {
    const result = await callTool('get_selected', {})
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'batch_update',
  'Execute multiple operations in a single undo step. Supports variable substitution: "$prev" = previous op\'s result ID, "$0"/"$1"/"$N" = Nth op\'s result ID (zero-indexed). Example: [add_frame(...), add_frame({ parent_id: "$prev" })].',
  {
    operations: z.array(z.object({
      tool: z.string().describe('Tool name (e.g. "add_frame", "update_frame")'),
      params: z.record(z.string(), z.unknown()).describe('Tool parameters. String values "$prev" and "$N" are replaced with result IDs from earlier operations.'),
    })).describe('Array of tool calls to execute sequentially'),
  },
  async ({ operations }) => {
    const result = await callTool('batch_update', { operations })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── Snippet tools ──

server.tool(
  'list_snippets',
  'List available snippets (reusable frame patterns). Returns lightweight metadata. Filter by tag optionally.',
  {
    tag: z.string().optional().describe('Optional tag to filter by (e.g. "layout", "form", "card")'),
  },
  async ({ tag }) => {
    const result = await callTool('list_snippets', { tag })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'insert_snippet',
  'Insert a snippet into the tree. Clones with new IDs and adds as child of parent_id. Use overrides to customize cloned children by name without extra update calls.',
  {
    snippet_id: z.string().describe('ID of the snippet to insert'),
    parent_id: z.string().describe('ID of the parent box to insert into'),
    index: z.number().optional().describe('Position index within the parent. If omitted, appends at the end.'),
    overrides: z.record(z.string(), z.object({
      properties: z.record(z.string(), z.unknown()).optional(),
      classes: z.string().optional(),
    })).optional().describe('Map of frame name → patch. Matches children by name in the cloned tree. Example: { "price": { "properties": { "content": "$49" } }, "cta": { "classes": "bg-violet-600" } }'),
  },
  async ({ snippet_id, parent_id, index, overrides }) => {
    const result = await callTool('insert_snippet', { snippet_id, parent_id, index, overrides })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'save_snippet',
  'Save an existing frame from the tree as a reusable snippet/pattern. Name children meaningfully before saving — names become override slots.',
  {
    frame_id: z.string().describe('ID of the frame to save as snippet'),
    name: z.string().describe('Name for the snippet'),
    tags: z.array(z.string()).optional().describe('Optional tags (e.g. ["layout", "card"])'),
  },
  async ({ frame_id, name, tags }) => {
    const result = await callTool('save_snippet', { frame_id, name, tags })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'delete_snippet',
  'Delete a user-created snippet.',
  {
    snippet_id: z.string().describe('ID of the snippet to delete'),
  },
  async ({ snippet_id }) => {
    const result = await callTool('delete_snippet', { snippet_id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── Page tools ──

server.tool(
  'list_pages',
  'List all pages in the project. Returns page id, name, route, and whether it is active.',
  {},
  async () => {
    const result = await callTool('list_pages', {})
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'switch_page',
  'Switch to a different page. The canvas and tree will show the new page.',
  {
    id: z.string().describe('ID of the page to switch to'),
  },
  async ({ id }) => {
    const result = await callTool('switch_page', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'add_page',
  'Add a new empty page. Automatically switches to the new page.',
  {
    name: z.string().optional().describe('Page name (e.g. "About", "Contact"). Defaults to "Page N".'),
    route: z.string().optional().describe('Page route (e.g. "/about"). Auto-generated from name if omitted.'),
  },
  async ({ name, route }) => {
    const result = await callTool('add_page', { name, route })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'remove_page',
  'Remove a page. Cannot remove the last remaining page.',
  {
    id: z.string().describe('ID of the page to remove'),
  },
  async ({ id }) => {
    const result = await callTool('remove_page', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
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
