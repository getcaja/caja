# Caja — Architecture

## Overview

Caja is a visual layout builder for creating responsive Flexbox designs, exported as Tailwind JSX components. It follows a Figma-like mental model (frames, text, properties panel) but outputs pure Tailwind CSS.

## Core Principle

**Tailwind classes are the single source of truth.**

Every visual property is stored and rendered as Tailwind classes. The properties panel is a visual editor for those classes. There are no inline styles — what you see in the "Classes" section IS the rendered output.

## Data Model (`src/types/frame.ts`)

```
Frame = BoxElement | TextElement

BaseElement (shared):
  id, name, tailwindClasses (computed from properties)
  width, height (SizeValue: default | hug | fill | fixed)
  grow, shrink
  padding, margin (Spacing: top/right/bottom/left)
  bg, border, borderRadius, overflow

BoxElement (type: 'box'):
  direction, justify, align, gap, wrap
  children: Frame[]

TextElement (type: 'text'):
  content, fontSize, fontWeight, lineHeight, color, textAlign
```

## Rendering Pipeline

```
Frame properties
    ↓
frameToClasses(frame) → Tailwind class string
    ↓
<div className={classes}> rendered in Canvas
    ↓
Export: same classes output as JSX
```

No inline styles. The Canvas preview and the Export output use the exact same class strings.

## Layout: 3-Panel + Toolbar

```
┌─────────────────────────────────────────────┐
│ Toolbar: [Caja]              [Chat] [Export] │
├──────────┬──────────────────┬───────────────┤
│ Tree     │ Canvas           │ Right Panel   │
│ Panel    │ (preview)        │ ┌───────────┐ │
│          │                  │ │Props│Chat  │ │
│ Elements │                  │ ├───────────┤ │
│ + Add    │                  │ │ Properties│ │
│          │                  │ │ or Chat   │ │
│ Drag to  │  FrameRenderer   │ │ content   │ │
│ reorder  │  (recursive)     │ │           │ │
├──────────┤                  ├───────────────┤
│ resize ↔ │                  │ resize ↔      │
└──────────┴──────────────────┴───────────────┘
```

- Panel widths persisted to localStorage (`caja-panel-state`)
- Right panel has tabs: Properties (visual editor) and Chat (future MCP agent)

## State Management (`src/store/frameStore.ts`)

Zustand store with:
- **root**: BoxElement tree (internal root `__root__`)
- **selectedId / hoveredId**: UI selection state
- **collapsedIds**: tree panel collapse state
- **past / future**: undo/redo history (max 50)

Auto-saves to localStorage (`caja-state`) every 500ms debounced.

All tree operations are immutable — return new tree on every change.

## Properties Panel

Visual editor for Tailwind classes. Each control maps to specific classes:

| Section | Properties | Classes generated |
|---------|-----------|-------------------|
| Layout | direction, justify, align, gap, wrap | `flex flex-col justify-center items-start gap-[8px] flex-wrap` |
| Content | fontSize, fontWeight, lineHeight, color, textAlign | `text-[14px] font-semibold leading-[1.5] text-[#fff] text-center` |
| Size | width, height modes | `w-full h-[200px] w-fit` |
| Spacing | padding, margin | `p-[16px] mt-[8px] mx-[12px]` |
| Style | bg, border, radius, overflow | `bg-[#1f1f23] border border-[#ccc] rounded-[8px] overflow-hidden` |
| Flex | grow, shrink | `grow shrink-0` |

The "Classes" section shows all computed classes as pills + allows manual class additions.

## Export (`src/utils/exportTailwind.ts`)

Generates copy-paste JSX with Tailwind classes:
```jsx
<div className="frame-1 flex flex-row items-center gap-[8px]">
  <p className="text-1 text-[14px] font-bold text-[#fafafa]">Hello</p>
</div>
```

## File Structure

```
src/
├── App.tsx                    # Main layout shell, panel resize, keyboard shortcuts
├── main.tsx                   # Entry point
├── index.css                  # CSS variables (Paseo theme), scrollbars, focus ring
│
├── types/
│   └── frame.ts               # Frame data model types
│
├── store/
│   └── frameStore.ts          # Zustand store, tree operations, undo/redo, localStorage
│
├── components/
│   ├── Canvas/
│   │   ├── Canvas.tsx          # Canvas container, empty state
│   │   └── FrameRenderer.tsx   # Recursive frame renderer (className-based)
│   │
│   ├── TreePanel/
│   │   ├── TreePanel.tsx       # Left sidebar tree view
│   │   ├── TreeNode.tsx        # Tree node with DnD, rename, context menu
│   │   ├── TreeDndContext.tsx   # DnD state context
│   │   └── AddMenu.tsx         # Add element popup
│   │
│   ├── Properties/
│   │   └── Properties.tsx      # Right panel property editor
│   │
│   ├── RightPanel/
│   │   └── RightPanel.tsx      # Tab container (Properties | Chat)
│   │
│   ├── Chat/
│   │   └── ChatPanel.tsx       # Chat UI (future MCP agent integration)
│   │
│   └── Export/
│       └── ExportModal.tsx     # Export modal with JSX output
│
└── utils/
    ├── frameToClasses.ts       # Frame → Tailwind class string (single source of truth)
    └── exportTailwind.ts       # Frame tree → JSX string for export
```

## Theme (Paseo Dark)

Defined as CSS custom properties in `index.css`:
- Surfaces: `surface-0` (#18181c) → `surface-3` (#3f3f46)
- Accent: `accent` (#20744A green)
- Text: `text-primary` (#fafafa), `text-secondary` (#a1a1aa), `text-muted` (#71717a)
- Borders: `border` (#27272a), `border-accent` (#34343a)

## Keyboard Shortcuts

- `Cmd+Z` / `Cmd+Shift+Z`: undo/redo
- `Delete` / `Backspace`: remove selected frame
- `Arrow keys`: reorder siblings
- `Cmd+E`: open export modal
- `Double-click text`: inline edit

## Future: Chat + MCP Agent

The Chat tab in the right panel will connect to an MCP agent that can:
- Read the current frame tree
- Add/modify/remove frames via store actions
- Suggest layouts based on natural language descriptions

The agent operates on the same Zustand store — no separate state.
