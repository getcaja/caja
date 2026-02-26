// Shared Tailwind theme + canvas reset CSS — used by CanvasIframe and PatternPreview.

// Canvas reset — form controls, default text color, scrollbar
// Body defaults + scrollbar styling only.
// Form element resets (appearance, bg, border, font, padding, margin) are
// handled by Tailwind v4 Preflight (@layer base), which utilities can override.
// An unlayered reset here would beat Tailwind's layered utilities — breaking
// bg, border, and other styles on <button>, <input>, etc.
export const CANVAS_RESET_CSS = `
body {
  margin: 0;
  color: #1c1917;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--color-surface-3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--color-text-muted); }
`

// Tailwind theme registration — registers token names so utility classes work.
// Actual values are overridden by the generated <style id="caja-theme">.
export const TAILWIND_THEME = `@theme {
  --font-mono: SFMono-Regular, ui-monospace, Menlo, Monaco, Consolas, monospace;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --color-surface-0: #111111;
  --color-surface-1: #1b1b1b;
  --color-surface-2: #262626;
  --color-surface-3: #3f3f3f;
  --color-accent: #20744A;
  --color-accent-hover: #25875a;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a1a1a1;
  --color-text-muted: #717171;
  --color-border: #323232;
  --color-border-accent: #3e3e3e;
  --color-focus: #2dd4bf;
  --color-mcp: #818cf8;
  --color-destructive: #ef4444;
  --color-selection: rgba(45, 212, 191, 0.3);
  --color-canvas-bg: #0e0e11;
}`
