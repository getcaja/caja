# Caja — Architecture

## What is Caja

Visual Flexbox layout builder that exports Tailwind JSX. Desktop app built with React + Zustand + Tailwind v4 + Tauri v2.

## Decisions made

### Stack
- **Frontend**: React 19, Zustand (state), Tailwind v4 (styling + export target)
- **Desktop**: Tauri v2 (Rust backend, WKWebView on macOS)
- **UI Primitives**: Radix UI for most controls (Tabs, ToggleGroup, Select, Switch, Dialog, Popover, Tooltip)
- **Build**: Vite 7

### Architecture
- **Single store** (`frameStore.ts`): Zustand store holds the full frame tree (`BoxElement` root), selection state, undo/redo history. All mutations go through tree-manipulation pure functions.
- **Frame tree**: Recursive `Frame = BoxElement | TextElement`. Internal root (`__root__`) is always a box. User never sees it — UI shows "Body".
- **Two rendering paths**:
  - `frameToPreviewStyle()` — inline styles for the canvas (supports dynamic values like hex colors)
  - `frameToClasses()` — Tailwind class strings for JSX export
- **File format**: `.caja` — JSON file containing `{ root: BoxElement }`. Open format, human-readable.
- **Persistence**: localStorage auto-save (500ms debounce) + file save/open via Tauri dialog/fs plugins.

### Known constraints
- **Tailwind v4 can't resolve runtime-generated arbitrary values** (e.g., `bg-[#fe0000]`). Canvas uses inline styles; export uses Tailwind classes.
- **Radix portals with anchor positioning don't work in Tauri's WKWebView**. DropdownMenu and ContextMenu reverted to manual `position: fixed` + `getBoundingClientRect()`. Other Radix components (Tabs, ToggleGroup, Select, Switch, Dialog, Popover, Tooltip) work fine.
- **Tauri's native drag-drop handler intercepts HTML5 drag events**. Fixed with `"dragDropEnabled": false` in window config.

---

## MCP Integration Architecture

### Goal
Allow AI agents (Claude Code, Cursor, or any MCP-compatible client) to read and manipulate Caja layouts through a standard protocol. Also power the built-in chat panel with the same tool interface.

### Caja plays two roles

```
┌─────────────────────────────────────────────┐
│                   Caja                       │
│                                              │
│  ┌──────────┐    ┌────────────────────────┐  │
│  │ Built-in │───▶│    Tool Executor        │  │
│  │ Chat     │    │ (maps tool calls →      │  │
│  │ (MCP     │    │  frameStore actions)    │  │
│  │  client) │    └────────────────────────┘  │
│  └──────────┘              ▲                 │
│                            │                 │
│  ┌──────────────┐          │                 │
│  │ MCP Server   │──────────┘                 │
│  │ (stdio/SSE)  │                            │
│  └──────┬───────┘                            │
│         │                                    │
└─────────┼────────────────────────────────────┘
          │
          ▼
  External agents
  (Claude Code, Cursor, etc.)
```

**MCP Server** (Caja exposes): External agents connect and call tools to manipulate layouts.
**MCP Client** (built-in chat): Connects to an LLM provider, sends tool definitions, executes returned tool calls against the same store.

Both paths converge at the **Tool Executor** — a thin mapping layer from tool call params to `useFrameStore.getState()` actions.

### Resources (read-only)

| Resource URI | Description |
|---|---|
| `caja://tree` | Full frame tree as JSON |
| `caja://tree/{id}` | Single frame's properties |
| `caja://selected` | Currently selected frame (or null) |
| `caja://export` | Tailwind JSX output of the current layout |

Future: `caja://screenshot` — PNG snapshot of the canvas for vision models.

### Tools (mutations)

| Tool | Params | Maps to |
|---|---|---|
| `add_frame` | `parent_id, type, properties?` | `addChild()` + optional `updateFrame()` |
| `update_frame` | `id, properties` | `updateFrame()` |
| `update_spacing` | `id, field, values` | `updateSpacing()` |
| `update_size` | `id, dimension, size` | `updateSize()` |
| `remove_frame` | `id` | `removeFrame()` |
| `move_frame` | `id, new_parent_id, index` | `moveFrame()` |
| `wrap_frame` | `id` | `wrapInFrame()` |
| `duplicate_frame` | `id` | `duplicateFrame()` |
| `rename_frame` | `id, name` | `renameFrame()` |
| `select_frame` | `id` | `select()` |
| `batch_update` | `operations[]` | Multiple actions in sequence |

### What the agent cannot do
- Access the file system beyond the open `.caja` file
- Modify app settings, UI preferences, or panel layout
- Execute arbitrary code or shell commands
- Interact with external services (git, APIs)

### Key design decisions

**1. All agent mutations go through the store's undo pipeline.**
Every tool call triggers `pushHistory()` just like manual edits. The user can Cmd+Z any AI change. No special "AI undo" — it's the same stack.

**2. `batch_update` for coherent multi-step changes.**
Without this, an agent building a "card layout" would produce N individual undo entries. `batch_update` wraps them in a single history entry so Cmd+Z reverts the whole operation.

**3. JSON tree as primary context, not screenshots.**
The frame tree is small, structured, and cheap to include in every prompt. Vision-based reasoning (screenshots) is optional and expensive — treat it as a supplementary resource, not the default.

**4. The chat panel is a generic MCP client.**
It doesn't hardcode Claude. It takes tool definitions from the executor, formats them per the connected LLM's expectations, and routes responses back. Swapping providers means changing the transport, not the tool layer.

**5. MCP server transport: stdio first, SSE later.**
stdio is simplest for local agents (Claude Code runs on the same machine). SSE adds HTTP overhead but enables remote/multi-client scenarios. Start with stdio.

**6. Tool responses include the modified subtree.**
After a mutation, the tool response returns the updated frame (or parent frame). This gives the agent immediate feedback without requiring a separate `caja://tree` read.

### Implementation (completed)

**Phase 1: Tool Executor (`src/mcp/tools.ts`)** — DONE
- 13 tools: add_frame, update_frame, update_spacing, update_size, remove_frame, move_frame, wrap_frame, duplicate_frame, rename_frame, select_frame, get_tree, get_selected, batch_update
- All mutations go through the Zustand store (undo-able)
- Tool responses include the modified frame data

**Phase 2: MCP HTTP Bridge + Server** — DONE
- Rust HTTP server (axum) on `127.0.0.1:3334` runs inside Tauri process
- Endpoints: `POST /api/tool`, `GET /api/resource?uri=...`, `GET /api/health`
- Bridge: HTTP request → Tauri event → frontend executor → Tauri command → HTTP response
- Uses `tokio::sync::oneshot` channels for async request-response with 10s timeout
- Frontend bridge (`src/mcp/bridge.ts`) listens for events and responds
- Standalone MCP server (`src/mcp/server.mjs`) bridges stdio ↔ HTTP using `@modelcontextprotocol/sdk`

**Phase 3: Built-in Chat as MCP Client** — TODO
- Chat panel connects to Claude API (or configurable provider)
- Sends system prompt with tool definitions + current tree context
- Executes returned tool calls via the Tool Executor
- Shows agent actions in the chat as visual diffs

### Connecting Claude Code to Caja

Add to `~/.claude.json` (or Claude Code MCP config):
```json
{
  "mcpServers": {
    "caja": {
      "command": "node",
      "args": ["/absolute/path/to/caja/src/mcp/server.mjs"]
    }
  }
}
```

Caja must be running (Tauri app open) for the MCP server to work. The server connects to the HTTP bridge on port 3334.

### File structure

```
src/
  mcp/
    tools.ts          # Tool executor (maps tool calls → store actions)
    resources.ts      # Resource readers (tree, selected, export)
    schema.ts         # JSON Schema definitions for all tools
    bridge.ts         # Frontend ↔ Rust event bridge
    server.mjs        # Standalone MCP server (stdio transport)
  lib/
    fileOps.ts        # File save/open operations
src-tauri/
  src/
    lib.rs            # Tauri setup, menu, plugins, HTTP bridge
    main.rs           # Entry point
  capabilities/
    default.json      # Permissions
```
