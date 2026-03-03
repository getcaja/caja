/**
 * [Experimental] Google Fonts helpers
 *
 * Shared utilities for Google Fonts integration via MCP.
 * This is a test feature — no UI, agent-only.
 */

import type { Frame } from '../types/frame'

/** "Playfair Display" → "playfair-display" */
export function toGoogleFontSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-')
}

/** "Playfair Display" → "font-google-playfair-display" */
export function toGoogleFontClass(name: string): string {
  return `font-google-${toGoogleFontSlug(name)}`
}

/** "Playfair Display" → Google Fonts CSS URL */
export function toGoogleFontUrl(name: string): string {
  const family = name.trim().replace(/\s+/g, '+')
  return `https://fonts.googleapis.com/css2?family=${family}:wght@100;200;300;400;500;600;700;800;900&display=swap`
}

/** "Playfair Display" → CSS rule for the utility class */
export function toGoogleFontStyleRule(name: string): string {
  return `.${toGoogleFontClass(name)} { font-family: '${name.trim()}', sans-serif; }`
}

/** Built-in Tailwind font families — not Google Fonts */
const BUILTIN_FONTS = new Set(['sans', 'serif', 'mono'])

/** Walk a frame tree and collect all unique Google Font family names */
export function collectGoogleFonts(frames: Frame[]): string[] {
  const fonts = new Set<string>()
  function walk(frame: Frame) {
    if ('fontFamily' in frame && frame.fontFamily) {
      const family = frame.fontFamily.trim()
      if (family && !BUILTIN_FONTS.has(family)) {
        fonts.add(family)
      }
    }
    if ('children' in frame) {
      for (const child of frame.children) walk(child)
    }
  }
  for (const f of frames) walk(f)
  return Array.from(fonts)
}
