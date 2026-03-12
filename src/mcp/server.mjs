#!/usr/bin/env node

// Caja MCP Server — standalone Node.js script
// Bridges between MCP protocol (stdio) and Caja's HTTP API (localhost:3334)
//
// Usage in Claude Code config (~/.claude.json):
// {
//   "mcpServers": {
//     "caja": {
//       "command": "node",
//       "args": ["/Applications/Caja.app/Contents/Resources/resources/caja-mcp.mjs"]
//     }
//   }
// }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const CAJA_API = process.env.CAJA_API_URL || 'http://127.0.0.1:3334'

// Read auth token from ~/.caja/mcp-token (written by Caja on startup)
function loadAuthToken() {
  try {
    return readFileSync(join(homedir(), '.caja', 'mcp-token'), 'utf-8').trim()
  } catch {
    return null
  }
}

let authToken = loadAuthToken()

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  return headers
}

// ── HTTP helpers ──

async function callTool(name, params) {
  const res = await fetch(`${CAJA_API}/api/tool`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, params }),
  })
  if (res.status === 401) {
    // Token may have rotated (Caja restarted), try re-reading
    authToken = loadAuthToken()
    const retry = await fetch(`${CAJA_API}/api/tool`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, params }),
    })
    if (!retry.ok) throw new Error(`Caja API error: ${retry.status}`)
    return retry.json()
  }
  if (!res.ok) throw new Error(`Caja API error: ${res.status}`)
  return res.json()
}

async function readResource(uri) {
  const res = await fetch(`${CAJA_API}/api/resource?uri=${encodeURIComponent(uri)}`, {
    headers: authHeaders(),
  })
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

// ── Component tools ──

server.tool(
  'list_components',
  'List available components (reusable frame trees). Returns lightweight metadata. Filter by tag optionally.',
  {
    tag: z.string().optional().describe('Optional tag to filter by (e.g. "layout", "form", "card")'),
  },
  async ({ tag }) => {
    const result = await callTool('list_components', { tag })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'insert_component',
  'Insert a component into the tree. Clones with new IDs and adds as child of parent_id. Use overrides to customize cloned children by name without extra update calls.',
  {
    component_id: z.string().describe('ID of the component to insert'),
    parent_id: z.string().describe('ID of the parent box to insert into'),
    index: z.number().optional().describe('Position index within the parent. If omitted, appends at the end.'),
    overrides: z.record(z.string(), z.object({
      properties: z.record(z.string(), z.unknown()).optional(),
      classes: z.string().optional(),
    })).optional().describe('Map of frame name → patch. Matches children by name in the cloned tree. Example: { "price": { "properties": { "content": "$49" } }, "cta": { "classes": "bg-violet-600" } }'),
  },
  async ({ component_id, parent_id, index, overrides }) => {
    const result = await callTool('insert_component', { component_id, parent_id, index, overrides })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'save_component',
  'Save an existing frame from the tree as a reusable component. Name children meaningfully before saving — names become override slots.',
  {
    frame_id: z.string().describe('ID of the frame to save as component'),
    name: z.string().describe('Name for the component'),
    tags: z.array(z.string()).optional().describe('Optional tags (e.g. ["layout", "card"])'),
  },
  async ({ frame_id, name, tags }) => {
    const result = await callTool('save_component', { frame_id, name, tags })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'delete_component',
  'Delete a user-created component.',
  {
    component_id: z.string().describe('ID of the component to delete'),
  },
  async ({ component_id }) => {
    const result = await callTool('delete_component', { component_id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'edit_component',
  'Enter component edit mode. Switches the canvas to show the component in isolation for editing. Use update_frame, add_frame, etc. to modify it, then call exit_component_edit when done.',
  {
    component_id: z.string().describe('ID of the component to edit'),
  },
  async ({ component_id }) => {
    const result = await callTool('edit_component', { component_id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'exit_component_edit',
  'Exit component edit mode. Returns to the previous page and auto-propagates changes to all instances of the component.',
  {},
  async () => {
    const result = await callTool('exit_component_edit', {})
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── Asset tools ──

server.tool(
  'upload_asset',
  'Download an external image URL to local storage and return a local asset URL. Use this to ensure images are available offline and avoid CORS issues in the canvas.',
  {
    url: z.string().describe('The external image URL to download (must be http:// or https://)'),
  },
  async ({ url }) => {
    const result = await callTool('upload_asset', { url })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── Library tools ──

server.tool(
  'export_library',
  'Package all internal components into a .cjl file via save dialog. Returns the file path and component count.',
  {
    name: z.string().describe('Name for the library (e.g. "My Components")'),
    author: z.string().optional().describe('Optional author name'),
    description: z.string().optional().describe('Optional description'),
    version: z.string().optional().describe('Optional version string (e.g. "1.0.0")'),
  },
  async ({ name, author, description, version }) => {
    const result = await callTool('export_library', { name, author, description, version })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── File tools ──

server.tool(
  'new_file',
  'Reset the project to a blank state (equivalent to File > New). Clears all pages, frames, and internal components.',
  {},
  async () => {
    const result = await callTool('new_file', {})
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

// ── Responsive tools ──

server.tool(
  'set_breakpoint',
  'Switch the active responsive breakpoint. 3-zone system: "base" = default (768–1280px), "md" = small (≤768px, max-md:), "xl" = large (≥1280px, xl:). After switching, ALL update_frame/update_spacing/update_size calls write to that breakpoint\'s overrides instead of the base frame. Only changed properties are stored (sparse overrides). The canvas width is also adjusted to match. Call set_breakpoint({ breakpoint: "base" }) to return to base editing when done.',
  {
    breakpoint: z.enum(['base', 'md', 'xl']).describe('The breakpoint to activate. "base" = default 768–1280px, "md" = small ≤768px, "xl" = large ≥1280px.'),
  },
  async ({ breakpoint }) => {
    const result = await callTool('set_breakpoint', { breakpoint })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'get_breakpoint',
  'Get the currently active responsive breakpoint and canvas width.',
  {},
  async () => {
    const result = await callTool('get_breakpoint', {})
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'get_responsive_overrides',
  'Get the responsive overrides for a frame. Returns the sparse override objects for each breakpoint (md, xl), or null if no overrides exist. Use this to inspect what properties differ per breakpoint before making changes.',
  {
    id: z.string().describe('ID of the frame to inspect'),
  },
  async ({ id }) => {
    const result = await callTool('get_responsive_overrides', { id })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

server.tool(
  'clear_responsive_overrides',
  'Clear responsive overrides for a frame at a breakpoint. If keys are provided, only those specific properties are removed. If no keys, all overrides at the breakpoint are cleared.',
  {
    id: z.string().describe('ID of the frame'),
    breakpoint: z.enum(['md', 'xl']).describe('The breakpoint to clear overrides for'),
    keys: z.array(z.string()).optional().describe('Optional list of specific property keys to remove. If omitted, all overrides at the breakpoint are cleared.'),
  },
  async ({ id, breakpoint, keys }) => {
    const result = await callTool('clear_responsive_overrides', { id, breakpoint, keys })
    return { content: [{ type: 'text', text: JSON.stringify(result) }] }
  }
)

// ── Resources ──

server.resource(
  'guide',
  'caja://guide',
  { description: 'How to use Caja MCP — read this first before doing anything else' },
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: `# Caja MCP — Agent Guide

Caja is a visual design tool running as a native desktop app. You are connected to its live canvas via MCP.
DO NOT create files (HTML, CSS, etc.) — use the MCP tools to build layouts directly on the canvas.

## ⚡ The #1 Rule: Use Tailwind Classes

Caja runs the **Tailwind CSS v4 browser runtime** — every Tailwind class works, including arbitrary values.
The \`classes\` parameter on add_frame and update_frame is the fastest and most powerful way to style:

\`\`\`
add_frame({ parent_id: "root", element_type: "box", classes: "flex flex-col gap-8 p-12 bg-white rounded-2xl shadow-lg" })
add_frame({ parent_id: "$prev", element_type: "text", properties: { content: "Hello", tag: "h1" }, classes: "text-5xl font-bold text-gray-900 tracking-tight" })
\`\`\`

Classes are parsed into structured properties automatically. You can combine classes + properties — explicit properties override parsed classes.

### Supported Tailwind Classes (all of these work!)
- **Layout**: flex, flex-col, flex-row, grid, grid-cols-2, grid-cols-3, inline-flex, block, inline-block
- **Spacing**: p-4, px-8, py-12, pt-6, gap-4, gap-8 (also m-4, mx-auto, etc. via update_spacing)
- **Sizing**: w-full, w-1/2, w-[600px], h-screen, min-h-screen, max-w-7xl, max-w-[1200px]
- **Typography**: text-sm, text-lg, text-4xl, text-[40px], font-bold, font-semibold, font-medium, leading-tight, leading-relaxed, tracking-tight, uppercase, text-center
- **Colors**: bg-white, bg-gray-900, bg-blue-500, bg-[#1a1a2e], text-white, text-gray-600, text-[#ff6b35]
- **Borders**: rounded, rounded-lg, rounded-2xl, rounded-full, border, border-gray-200, border-2
- **Effects**: shadow-sm, shadow-lg, shadow-2xl, opacity-50, blur-sm, backdrop-blur-lg
- **Flexbox**: items-center, justify-between, justify-center, self-start, grow, shrink-0
- **Grid**: grid-cols-1, grid-cols-2, grid-cols-3, col-span-2, row-span-2
- **Overflow**: overflow-hidden, overflow-auto
- **Position**: relative, absolute, fixed, sticky (use update_spacing for inset values)
- **Transforms**: rotate-3, scale-105, translate-x-4
- **Transitions**: transition-all, duration-300, ease-in-out
- **Arbitrary values**: w-[500px], text-[40px], bg-[#1a1a2e], gap-[30px], rounded-[20px]

### Color Palette (auto-matched to tokens)
Standard Tailwind colors: slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose
Shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
Special: white, black, transparent, current

Example: bg-blue-500, text-gray-900, border-emerald-200

## Element Types
- **box** = div container (flex/grid). This is your main building block.
- **text** = text content. Set \`tag\` property: "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a" (link)
- **image** = img. Set \`src\` property. Use https://placehold.co/WxH for placeholders.
- **button** = clickable button
- **input** = text input field. Set \`placeholder\` property.
- **textarea** = multi-line input
- **select** = dropdown. Set \`options\` property as array: [{ value: "opt1", label: "Option 1" }]
- **link** = shorthand for text with tag "a"

## Properties Reference
Text: content, tag, fontFamily, textAlign, textTransform, whiteSpace, fontStyle, textDecoration
Visual: bg, color, opacity, bgImage, bgSize, bgPosition, bgRepeat, boxShadow, cursor
Layout: display, direction, justify, align, wrap, gap, grow, shrink, alignSelf
Grid: gridCols, gridRows, colSpan, rowSpan
Sizing: minWidth, maxWidth, minHeight, maxHeight (use update_size for width/height mode)
Border: borderRadius (number=uniform, object={topLeft,topRight,bottomRight,bottomLeft}), overflow
Position: position (relative/absolute/fixed/sticky), zIndex
Transform: rotate, scaleVal, translateX, translateY, skewX, skewY
Animation: transition, duration, ease, blur, backdropBlur
Custom: tailwindClasses (extra classes not parsed), className, htmlId

## Efficient Workflows

### batch_update is essential
Always use batch_update for building sections. It's faster (single HTTP round-trip) and creates a single undo step.

**Variable substitution:**
- \`$prev\` = result ID of the PREVIOUS operation (the one right before)
- \`$0\`, \`$1\`, \`$N\` = result ID of the Nth operation (zero-indexed)

**⚠️ CRITICAL: $prev vs $N when adding multiple children to the same parent**

Only box elements can have children. $prev changes with every operation. If you add a text child and then use $prev for the next child, $prev now points to that text — NOT the box.

WRONG — $prev points to the text, not the box:
\`\`\`
op 0: add box "Card"              → frame-10 (box)
op 1: add text "Title" to $prev   → frame-11 (text)  ← $prev = frame-10 ✓
op 2: add text "Body" to $prev    → ERROR! $prev = frame-11 (text, not box!)
\`\`\`

CORRECT — use $0 to always reference the box:
\`\`\`
op 0: add box "Card"              → frame-10 (box)
op 1: add text "Title" to $0      → frame-11 ✓  ($0 = frame-10, the box)
op 2: add text "Body" to $0       → frame-12 ✓  ($0 = frame-10, still the box)
\`\`\`

**Rule: When adding multiple children to the same parent, ALWAYS use $N to reference the parent box, NOT $prev.**
Use $prev only when nesting (parent → child → grandchild).

Example — build a hero section:
\`\`\`json
{ "operations": [
  { "tool": "add_frame", "params": { "parent_id": "root-id", "element_type": "box", "classes": "flex flex-col items-center gap-6 py-24 px-8 text-center" } },
  { "tool": "add_frame", "params": { "parent_id": "$0", "element_type": "text", "properties": { "content": "Build faster", "tag": "h1" }, "classes": "text-6xl font-bold text-gray-900 tracking-tight max-w-4xl" } },
  { "tool": "add_frame", "params": { "parent_id": "$0", "element_type": "text", "properties": { "content": "Ship products your users love." }, "classes": "text-xl text-gray-500 max-w-2xl" } },
  { "tool": "add_frame", "params": { "parent_id": "$0", "element_type": "box", "classes": "flex gap-4" } },
  { "tool": "add_frame", "params": { "parent_id": "$3", "element_type": "box", "classes": "flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium" } },
  { "tool": "add_frame", "params": { "parent_id": "$prev", "element_type": "text", "properties": { "content": "Get started" } } },
  { "tool": "rename_frame", "params": { "id": "$0", "name": "Hero" } }
]}
\`\`\`
Note: ops 1,2,3 all use $0 (the hero box). Op 4 uses $3 (the button container). Op 5 uses $prev (nesting text inside button).

### Name everything
Use rename_frame or properties.name to give semantic names. This makes the tree readable:
Hero, Nav, FeatureGrid, PricingCard, Footer — not Frame 1, Frame 2, Frame 3.

### Sizing: update_size
Width/height have modes: "default" (auto), "hug" (shrink to content), "fill" (stretch to parent), "fixed" (exact pixels).
\`\`\`
update_size({ id: "hero", dimension: "width", size: { mode: "fill" } })
update_size({ id: "sidebar", dimension: "width", size: { mode: "fixed", value: 280 } })
\`\`\`

### Spacing: update_spacing
Padding, margin, and inset are set via update_spacing with { top, right, bottom, left } in pixels:
\`\`\`
update_spacing({ id: "card", field: "padding", values: { top: 32, right: 32, bottom: 32, left: 32 } })
\`\`\`
Or use Tailwind classes: p-8 (= 32px all), px-6 py-4, pt-12, etc.

## Responsive Design
Caja uses a 3-breakpoint system: base (768–1280px), md (≤768px mobile), xl (≥1280px large).

1. **Design base first** — this is the default desktop layout
2. **Switch to mobile**: set_breakpoint({ breakpoint: "md" })
3. **Adjust for small screens**: stack columns, reduce font sizes, simplify grids
4. **Return to base**: set_breakpoint({ breakpoint: "base" })

Common mobile overrides:
- Grid cols: grid-cols-3 → grid-cols-1
- Flex direction: flex-row → flex-col
- Font size: text-5xl → text-3xl
- Padding: p-16 → p-6
- Hide decorative elements (update_frame with hidden: true)

## Design Patterns

### Section container pattern
Most landing page sections follow: full-width wrapper → max-width inner → content
\`\`\`
box "flex flex-col items-center py-20 px-8"        ← section (full-width, vertical padding)
  box "flex flex-col gap-8 w-full max-w-6xl"       ← inner container (constrained width)
    text "Section Title" tag:h2                      ← content
    box "grid grid-cols-3 gap-6"                     ← grid layout
\`\`\`

### Button pattern
A button is a box with text inside:
\`\`\`
box "flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
  text "Click me"
\`\`\`

### Card pattern
\`\`\`
box "flex flex-col gap-4 p-6 bg-white rounded-xl border border-gray-200 shadow-sm"
  text "Card Title" tag:h3 classes:"text-lg font-semibold text-gray-900"
  text "Description" classes:"text-gray-500"
\`\`\`

## Verification
Call screenshot() after major sections to verify the visual result. Fix issues immediately rather than building blindly.

## Available Tools (${31} total)
Frame: add_frame, update_frame, update_spacing, update_size, remove_frame, move_frame, wrap_frame, duplicate_frame, rename_frame, select_frame
Tree: get_tree, get_selected, batch_update
Responsive: set_breakpoint, get_breakpoint, get_responsive_overrides, clear_responsive_overrides
Components: list_components, insert_component, save_component, delete_component, edit_component, exit_component_edit, export_library
Media: screenshot, upload_asset
Pages: new_file, list_pages, switch_page, add_page, remove_page`,
      }],
    }
  }
)

server.resource(
  'tree',
  'caja://tree',
  { description: 'Full frame tree JSON — the complete layout structure on canvas' },
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
  'selected',
  'caja://selected',
  { description: 'Currently selected frame with all properties' },
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
  'export',
  'caja://export',
  { description: 'Exported Tailwind CSS classes for all frames' },
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
  'export-html',
  'caja://export/html',
  { description: 'Full HTML export of the current page' },
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

server.resource(
  'components',
  'caja://components',
  { description: 'Component catalog — reusable frame trees' },
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
