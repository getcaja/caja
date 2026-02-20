# Caja Backlog — Semantic HTML & Composability

> Target: Caja outputs clean, semantic, accessible HTML with Tailwind classes.
> All features are exposed via MCP so an AI agent can compose pages with proper semantics.

---

## Phase 1: Complete Semantic Primitives

### 1.1 Add `tag` to BoxElement
- **What:** BoxElement gets a `tag` field: `div | section | nav | header | footer | main | article | ul | ol | li | form`
- **Default:** `div` (backwards compatible)
- **UI:** Select dropdown in Properties panel (like text tag selector)
- **Export:** `frameToHTML` uses the tag instead of hardcoded `<div>`
- **MCP:** `add_frame` and `update_frame` accept `tag` for box elements
- **Status:** Pending

### 1.2 Add `label` to InputElement
- **What:** InputElement gets a `label` string field
- **Export:** Renders `<label for="...">Label</label>` before the `<input>`
- **Canvas preview:** Shows label text above the input
- **MCP:** `add_frame` accepts `label` for input elements
- **Status:** Pending

### 1.3 New element type: `textarea`
- **What:** Dedicated textarea element (not just a tall input)
- **Properties:** `placeholder`, `rows`, `disabled`, `label`
- **Export:** `<textarea>` with proper attributes
- **MCP:** `add_frame` with `element_type: "textarea"`
- **Status:** Pending

### 1.4 New element type: `select`
- **What:** Select dropdown with editable options
- **Properties:** `options: { value: string, label: string }[]`, `placeholder`, `disabled`, `label`
- **Export:** `<select><option>` structure
- **MCP:** `add_frame` with `element_type: "select"`, update options via `update_frame`
- **Status:** Pending

---

## Phase 2: HTML Export Quality

### 2.1 Semantic export audit
- **What:** Review `frameToHTML` / export pipeline to ensure it uses correct tags from Phase 1
- **Checklist:**
  - [ ] Box tags (nav, section, header, etc.) used in output
  - [ ] Text tags (h1-h6, p, span, a) used correctly
  - [ ] Label+input association (`for` / `id` pairing)
  - [ ] Image `alt` always present (empty string if not set)
  - [ ] Button `type="button"` default
- **Status:** Pending

### 2.2 Clean HTML output
- **What:** Exported HTML is indented, readable, not a soup of divs
- **Checklist:**
  - [ ] Proper indentation (2-space)
  - [ ] Semantic tags visible in output
  - [ ] No redundant wrappers
  - [ ] Tailwind classes are the only styling (no inline styles in export)
- **Status:** Pending

### 2.3 Accessibility basics
- **What:** Minimum a11y attributes in export
- **Checklist:**
  - [ ] `alt` on images
  - [ ] `for`/`id` on label+input pairs
  - [ ] `aria-label` on icon-only buttons (future)
  - [ ] Landmark roles implicit from semantic tags (nav, main, footer)
- **Status:** Pending

---

## Phase 3: Templates

### 3.1 Template system in AddMenu
- **What:** "Add element" menu includes template options that create pre-structured semantic elements
- **Templates:**
  - **Nav** → `<nav>` row, justify-between, logo text + links box
  - **Section** → `<section>` column, padding 64px, gap 32
  - **Form** → `<form>` column, gap 16, with label+input + submit button
  - **List** → `<ul>` column, gap 8, with 2-3 `<li>` children
  - **Footer** → `<footer>` row, justify-between, copyright + links
- **MCP:** Templates available as `add_frame` presets or a new `add_template` tool
- **Status:** Pending

### 3.2 Smart defaults per tag
- **What:** When changing a box's tag, apply sensible defaults
- **Examples:**
  - Tag → `nav`: direction row, justify between, align center
  - Tag → `ul`/`ol`: direction column, gap 8
  - Tag → `form`: direction column, gap 16
  - Tag → `section`: padding 64, gap 32
- **Status:** Pending

---

## Phase 4: Components / Symbols

### 4.1 Component definition
- **What:** User can convert any subtree into a reusable component
- **Model:** Component = frozen structure blueprint + overridable props
- **Store:** Separate `components` map in Zustand store
- **Status:** Pending

### 4.2 Component instances
- **What:** Place N instances of a component, changes to the definition propagate to all instances
- **Overrides:** Instances can override text content, colors, sizes (like Figma)
- **Status:** Pending

### 4.3 Detach instance
- **What:** Convert an instance back to regular frames (break the link)
- **Status:** Pending

### 4.4 Preset components
- **What:** Built-in component library (card, hero, pricing table, testimonial, etc.)
- **Distribution:** Shipped with Caja or loadable from .caja files
- **Status:** Pending

---

## Progress Log

| Date | Item | Notes |
|------|------|-------|
| — | — | Backlog created |
