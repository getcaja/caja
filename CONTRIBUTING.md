# Contributing to Caja

Thanks for your interest in contributing! This guide will get you up and running.

## Prerequisites

- **Node.js** 18+
- **Rust** 1.70+ with Cargo in PATH:
  ```sh
  export PATH="$HOME/.cargo/bin:$PATH"
  ```
- **npm** (ships with Node.js)

## Setup

```sh
git clone https://github.com/getcaja/caja.git
cd caja
npm install
npm run tauri:dev
```

`tauri:dev` starts both the Vite dev server and the Tauri window. For frontend-only work you can run `npm run dev` and open `http://localhost:5173` in a browser — MCP and file I/O won't work outside Tauri, but the canvas and properties panel will.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run tauri:dev` | Full Tauri dev mode (frontend + native window) |
| `npm run tauri:build` | Production Tauri build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run lint` | ESLint |

## Project Structure

```
src/
  components/    UI components (panels, canvas, tree, properties)
  store/         Zustand store — slices, tree helpers, factories
  mcp/           MCP bridge, tools, resources, schemas
  lib/           File I/O, asset management, updater, theme utilities
  utils/         Pure utility functions (frameToClasses, etc.)
  types/         TypeScript types (Frame, DesignValue, Page)
  data/          Static data (design token scales, color palette)
  assets/        Static assets (icons, images)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into each layer.

## Code Conventions

- **TypeScript strict mode** — no `any` unless absolutely necessary.
- **Tailwind CSS v4** (not v3). Theme tokens live in `src/index.css` under `@theme`. The browser runtime (`@tailwindcss/browser` 4.2.0) compiles CSS at runtime inside the canvas iframe, so arbitrary values work.
- **Radix UI** primitives for accessible components — not shadcn/ui. Custom wrappers live in `src/components/ui/`.
- **`DesignValue<T>`** for all numeric/color fields. Every property that maps to a Tailwind class uses this token system so the output is `gap-4` instead of `gap-[16px]`. See `src/types/frame.ts`.
- **Properties panel rules**: all text is `text-[12px]`, controls are `h-6` (24px), consistent `gap-2` spacing, `rounded` border radius, `bg-surface-2 border-transparent` inputs. Every row reserves a `w-5` action slot on the right.

## Store Architecture

The Zustand store lives in `src/store/` and is composed from 7 slices merged in `frameStore.ts`:

| Slice | Responsibility |
|---|---|
| `coreTreeSlice` | Tree mutations, clipboard, undo/redo |
| `selectionSlice` | Selection and hover state |
| `uiSlice` | View prefs, breakpoints, property writes |
| `pageSlice` | Multi-page CRUD |
| `fileSlice` | File I/O, localStorage persistence |
| `componentSlice` | Component master/instance system |
| `canvasDragSlice` | Drag state, MCP connection indicators |

Pure helper functions live in `treeHelpers.ts` (find, move, clone, etc.) and `frameFactories.ts` (element creation). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Testing

- **Unit tests**: Vitest. Run `npm test` before opening a PR.
- **E2E tests**: Playwright. Run `npm run test:e2e` (or `test:e2e:headed` for a visible browser).
- Store tests are the most comprehensive — see `src/store/__tests__/frameStore.test.ts`.

## Tauri Gotchas

- **`dragDropEnabled: false`** in `tauri.conf.json` — Tauri's native drag-drop handler intercepts HTML5 DnD events. We disable it.
- **Cargo PATH** — Cargo may not be in your PATH by default. Add it to your shell profile.
- **Native menu** — The macOS menu bar (File, Edit, Window) is defined in Rust at `src-tauri/src/lib.rs`. Menu events are forwarded to the frontend via Tauri events.
- **Transparent window with overlay title bar** — traffic light buttons are custom-positioned. The window uses `macOSPrivateApi: true` for vibrancy.

## MCP Integration

Caja exposes an MCP (Model Context Protocol) server so AI agents can manipulate the canvas. The bridge (`src/mcp/bridge.ts`) connects the Rust HTTP server to frontend tool execution. Tools are serialized through a promise queue to avoid Zustand state races.

If you're adding a new MCP tool:
1. Add the schema in `src/mcp/schema.ts`
2. Add the handler in `src/mcp/tools.ts`
3. The bridge picks it up automatically via HMR

## PR Guidelines

- Keep PRs focused — one feature or fix per PR.
- Run `npx tsc --noEmit` and `npm test` before pushing.
- Link related GitHub issues in the PR description.
- All ideas and features are tracked as [GitHub issues](https://github.com/getcaja/caja/issues).
