/**
 * [Experimental] Google Fonts Loader
 *
 * Dynamically injects <link> and <style> tags into the document head
 * for any Google Fonts referenced in the frame tree.
 * Cleans up tags when fonts are no longer in use.
 *
 * Uses ownerDocument so it injects into the correct document
 * (works in both parent and iframe contexts).
 *
 * This is a test feature — MCP-only, no UI.
 */

import { useEffect, useRef } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { collectGoogleFonts, toGoogleFontClass, toGoogleFontUrl } from '../../utils/googleFonts'

export function GoogleFontsLoader() {
  const root = useFrameStore((s) => s.root)
  const prevFontsRef = useRef<Set<string>>(new Set())
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Use ownerDocument to inject into the correct document (parent or iframe)
    const doc = anchorRef.current?.ownerDocument ?? document
    const activeFonts = new Set(collectGoogleFonts(root.children))
    const prev = prevFontsRef.current

    // Add new fonts
    for (const font of activeFonts) {
      if (!prev.has(font)) {
        // Inject <link> for font loading
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = toGoogleFontUrl(font)
        link.dataset.cajaGoogleFont = font
        doc.head.appendChild(link)

        // Inject <style> with utility class
        const style = doc.createElement('style')
        style.dataset.cajaGoogleFontStyle = font
        style.textContent = `.${toGoogleFontClass(font)} { font-family: '${font}', sans-serif; }`
        doc.head.appendChild(style)
      }
    }

    // Remove unused fonts
    for (const font of prev) {
      if (!activeFonts.has(font)) {
        doc.head.querySelector(`link[data-caja-google-font="${font}"]`)?.remove()
        doc.head.querySelector(`style[data-caja-google-font-style="${font}"]`)?.remove()
      }
    }

    prevFontsRef.current = activeFonts
  }, [root])

  return <div ref={anchorRef} style={{ display: 'none' }} />
}
