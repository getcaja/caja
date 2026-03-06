// Shared Tailwind theme + canvas reset CSS — used by ComponentPreview iframe.

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
select {
  -webkit-appearance: none;
  appearance: none;
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
  --color-surface-0: #1e1e1e;
  --color-surface-1: #272727;
  --color-surface-2: #323232;
  --color-surface-3: #444444;
  --color-accent: #0c8ce9;
  --color-accent-hover: #47b5f5;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #6b6b6b;
  --color-border: #2d2d2d;
  --color-border-accent: #393939;
  --color-destructive: #ef4444;
  --color-canvas-bg: #161616;
}`
