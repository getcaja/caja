# Caja Architecture

Caja is a visual editor where design equals code — every layout property maps directly to Tailwind CSS classes. It's a Tauri v2 desktop app built with React 19, Zustand, Tailwind CSS v4, and MCP (Model Context Protocol) for AI agent integration.

## Core Data Model

**Source:** `src/types/frame.ts`

### Frame

The fundamental unit is a `Frame` — a discriminated union of element types:

```
Frame = BoxElement | TextElement | ImageElement | ButtonElement
      | InputElement | TextareaElement | SelectElement
```

Each element type extends `BaseElement` (shared properties like size, spacing, position, colors, borders, transforms) and adds type-specific fields:

- **BoxElement** — container with `children: Frame[]` (recursive tree), flex/grid layout props (`display`, `direction`, `justify`, `align`, `gap`, `wrap`, `gridCols`, `gridRows`)
- **TextElement** — `content`, text styling (font size, weight, alignment, etc.), optional `href`
- **ImageElement** — `src`, `alt`, `objectFit`
- **ButtonElement** — `content`, text styling, optional `href`
- **InputElement** — `placeholder`, `inputType`, validation attrs (`min`, `max`, `step`)
- **TextareaElement** — `placeholder`, `rows`
- **SelectElement** — `options: SelectOption[]`

### DesignValue\<T\>

Every numeric and color property uses the `DesignValue<T>` token system:

```ts
type DesignValue<T> =
  | { mode: 'custom'; value: T }           // arbitrary: gap-[32px]
  | { mode: 'token'; token: string; value: T }  // token: gap-4
```

This lets the rendering pipeline emit clean Tailwind classes (`gap-4`, `bg-red-500`) when a token matches, falling back to arbitrary values (`gap-[32px]`, `bg-[#fe0000]`) in custom mode.

Token scales are defined in `src/data/scales.ts` (SPACING, FONT_SIZE, LINE_HEIGHT, LETTER_SPACING, BORDER_WIDTH, BORDER_RADIUS, SIZE_CONSTRAINT, OPACITY) and `src/data/colors.ts` (22 color families x 11 shades + white/black).

### Page

```ts
interface Page {
  id: string
  name: string
  route: string
  root: BoxElement       // each page has a root container
  isComponentPage?: boolean
}
```

### Responsive Overrides

Frames support per-breakpoint overrides via the `responsive` field. Desktop-first: `base` (default), `md` (<=768px), `sm` (<=640px). Overrides are sparse — only changed properties are stored.

## Store Architecture

**Source:** `src/store/`

### Slice Pattern

A single Zustand store (`useFrameStore`) composed from 7 slices:

```
FrameStore = CoreTreeSlice & SelectionSlice & UiSlice
           & PageSlice & FileSlice & ComponentSlice & CanvasDragSlice
```

The barrel file `frameStore.ts` merges slices and sets up two subscribers:

1. **Auto-save** — debounced 500ms, writes `{ pages, activePageId }` to `localStorage['caja-state']`
2. **Auto-propagate** — when the hidden Components page changes, syncs master edits to all instances

#### Slices

| Slice | File | Responsibility |
|---|---|---|
| **coreTreeSlice** | `slices/coreTreeSlice.ts` | Tree mutations (insert, update, remove, move, duplicate, wrap), clipboard (copy/cut/paste), undo/redo (50-entry history per page) |
| **selectionSlice** | `slices/selectionSlice.ts` | `selectedId`, multi-select (`selectedIds`), hover, parent introspection |
| **uiSlice** | `slices/uiSlice.ts` | View prefs (preview mode, canvas width, breakpoint, advanced mode), `updateFrameProperty`/`updateSpacing`/`updateSize` — the properties panel's write path. Persists to `localStorage['caja-view-prefs']` |
| **pageSlice** | `slices/pageSlice.ts` | Multi-page CRUD: add, remove, rename, reorder, duplicate, set route |
| **fileSlice** | `slices/fileSlice.ts` | File I/O coordination: new, load from storage/file, save path tracking |
| **componentSlice** | `slices/componentSlice.ts` | Component system: masters on hidden `__components__` page, instance linking via `_componentId`, propagation with override preservation |
| **canvasDragSlice** | `slices/canvasDragSlice.ts` | Canvas drag state, component drag, MCP connection/busy indicators |

### Supporting Modules

- **`treeHelpers.ts`** — Pure, immutable tree functions with no Zustand dependency. ID generation (`generateId`, `generatePageId`), tree reads (`findInTree`, `findParent`, `collectNames`), tree writes (`insertChildInTree`, `removeFromTree`, `moveInTree`, `duplicateInTree`, `wrapInFrameInTree`), deep clone with ID remapping (`cloneWithNewIds`).
- **`frameFactories.ts`** — Factory functions for every element type (`createBox`, `createText`, `createImage`, etc.). DesignValue constructors (`dvNum`, `dvTok`, `dvStr`). Spacing/border-radius zero-initializers. `normalizeFrame` for migration safety.
- **`catalogStore.ts`** — Separate Zustand store for the component catalog. Internal components (per-file, read-write) with ordered IDs, categories, and its own undo/redo stack. Persists to `localStorage['caja-components-state']`.

## Rendering Pipeline

**Single source of truth:** Tailwind classes generated from Frame properties.

### frameToClasses()

**Source:** `src/utils/frameToClasses.ts`

Converts a `Frame` into a Tailwind class string. Core logic:

- `dvClass(prefix, dv)` — token mode emits `gap-4`, custom mode emits `gap-[32px]`
- `dvColorClass(prefix, dv)` — token mode emits `bg-red-500`, custom mode emits `bg-[#fe0000]`
- `spacingClasses(prefix, spacing)` — smart compression: uniform (`p-4`), symmetric (`px-4 py-2`), or per-side (`pt-2 pr-4 pb-2 pl-4`)

### Tailwind Browser Runtime

The canvas iframe loads `@tailwindcss/browser` v4.2.0, which compiles CSS at runtime. This means arbitrary values (`bg-[#fe0000]`, `w-[500px]`) work without a build step. The runtime scans the DOM and generates only the CSS rules that are actually used.

### Asset Resolution

For images, `resolveRenderSrc()` (in `src/lib/assetOps.ts`) maps local filesystem paths → blob URLs at render time. A blob cache avoids re-reading files from disk. `useSyncExternalStore` triggers React re-renders when the cache is populated.

## MCP Integration

**Source:** `src/mcp/`

Caja exposes an MCP server so AI agents can create and manipulate layouts through natural language.

### Bridge (`bridge.ts`)

The Rust backend runs an HTTP server that receives MCP requests. The frontend bridge:

1. Listens for Tauri events from the Rust server
2. Routes to `executeTool` or `readResource`
3. Serializes execution through a promise queue (prevents Zustand state races on parallel calls)
4. Sends results back via Tauri events

HMR-compatible: mutable refs to `executeTool`/`readResource` are updated on hot reload so code changes take effect without a full page reload.

### Tools (`tools.ts`)

30+ tools covering the full editing API:

| Category | Tools |
|---|---|
| **Frame CRUD** | `add_frame`, `update_frame`, `update_spacing`, `update_size`, `remove_frame` |
| **Tree ops** | `move_frame`, `wrap_frame`, `duplicate_frame`, `rename_frame` |
| **Selection** | `select_frame`, `get_selected` |
| **Inspection** | `get_tree` (full or summary), `screenshot` (base64 PNG) |
| **Batch** | `batch_update` — multiple ops in one undo step with `$prev`/`$N` variable substitution |
| **Components** | `list_components`, `insert_component`, `save_component`, `delete_component` |
| **Pages** | `list_pages`, `switch_page`, `add_page`, `remove_page` |
| **Responsive** | `set_breakpoint`, `get_breakpoint`, `get_responsive_overrides`, `clear_responsive_overrides` |
| **Assets** | `upload_asset` (downloads URL to local storage) |
| **Project** | `new_file`, `export_library` |

#### Token Auto-Matching

`sanitizeFrameProperties()` in tools.ts converts raw MCP input to DesignValue objects with automatic token matching. Lookup maps (value → token) are built from scales/colors at module level for O(1) matching:

- `sanitizeDVNum(32, SPACING_LOOKUP)` → `{ mode: 'token', token: '8', value: 32 }` → `gap-8`
- `sanitizeDVStr("#ef4444", COLOR_LOOKUP)` → `{ mode: 'token', token: 'red-500' }` → `bg-red-500`

### Resources (`resources.ts`)

Read-only MCP resources:

| URI | Description |
|---|---|
| `caja://tree` | Full layout tree (JSON) |
| `caja://tree/<id>` | Single frame by ID |
| `caja://selected` | Currently selected frame |
| `caja://export` | Tailwind JSX export |
| `caja://export/html` | Tailwind HTML export |
| `caja://components` | Component catalog metadata |

### Schema (`schema.ts`)

JSON schemas for all tool parameters. Tool names are typed as a `ToolName` union for compile-time safety.

## Component System

### Masters and Instances

- **Masters** are stored as children of a hidden page (`__components__`, ID: `'__components__'`)
- **Instances** in regular pages reference their master via `_componentId`
- `propagateComponent()` syncs master edits → all instances across all pages
- `collectUserOverrides()` / `applyUserOverrides()` handle override diffing so user customizations survive propagation

### Catalog Store

`catalogStore.ts` is a separate Zustand store that mirrors component metadata for the UI panel. It has its own undo/redo stack and localStorage persistence (`caja-components-state`).

## File Format

Caja projects are saved as `.caja` JSON files:

```json
{
  "pages": [{ "id": "...", "name": "...", "route": "/", "root": { ... } }],
  "activePageId": "page-1",
  "components": { ... }
}
```

- **Save/Open**: Tauri native dialogs via `src/lib/fileOps.ts` (`plugin-dialog` + `plugin-fs`)
- **Validation**: `validateCajaData()` checks structural integrity on open
- **Window title**: Shows filename + dirty indicator (native macOS pattern)

## Asset System

**Source:** `src/lib/assetOps.ts`

External images are downloaded to a local `assets/` directory next to the `.caja` file:

1. **Download** — SHA-256 hash of content, truncated to 16 hex chars, used as filename for dedup
2. **Storage** — `frame.src` stores the absolute local path (survives app restarts)
3. **Rendering** — `resolveRenderSrc()` maps local path → blob URL via in-memory cache
4. **Export** — `resolveAssetSrc()` maps local path → `./assets/filename.ext` for portable HTML/JSX
5. **Restore** — `restoreAllAssets(pages)` walks all frames on app load, reads files from disk → populates blob cache

## Canvas and Responsive Preview

- **Breakpoints**: Desktop-first — `base` (default), `md` (<=768px), `sm` (<=640px)
- **Responsive bar**: Auto (viewport), 1440px, 768px, 375px preset widths
- **Zoom**: 25%, 50%, 75%, 100% via ZoomBar + keyboard shortcuts (Cmd+/Cmd-/Cmd0)
- Both bars live in a unified footer at the bottom of the canvas (hidden in preview mode)

## Theme

**Source:** `src/index.css` `@theme` block

Design tokens: surfaces (translucent for vibrancy), accent (blue), text (primary/secondary/muted), borders (white with low opacity), semantic colors (destructive red), canvas background. Component-layer CSS classes (`.c-input`, `.c-label`, etc.) ensure consistency across the properties panel.
