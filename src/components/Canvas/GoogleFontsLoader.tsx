/**
 * [Experimental] Google Fonts Loader
 *
 * Dynamically injects <link> and <style> tags into document.head
 * for any Google Fonts referenced in the frame tree.
 * Cleans up tags when fonts are no longer in use.
 *
 * This is a test feature — MCP-only, no UI.
 */

import { useEffect, useRef } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { collectGoogleFonts, toGoogleFontClass, toGoogleFontUrl } from '../../utils/googleFonts'

export function GoogleFontsLoader() {
  const root = useFrameStore((s) => s.root)
  const prevFontsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const activeFonts = new Set(collectGoogleFonts(root.children))
    const prev = prevFontsRef.current

    // Add new fonts
    for (const font of activeFonts) {
      if (!prev.has(font)) {
        // Inject <link> for font loading
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = toGoogleFontUrl(font)
        link.dataset.cajaGoogleFont = font
        document.head.appendChild(link)

        // Inject <style> with utility class
        const style = document.createElement('style')
        style.dataset.cajaGoogleFontStyle = font
        style.textContent = `.${toGoogleFontClass(font)} { font-family: '${font}', sans-serif; }`
        document.head.appendChild(style)
      }
    }

    // Remove unused fonts
    for (const font of prev) {
      if (!activeFonts.has(font)) {
        document.head.querySelector(`link[data-caja-google-font="${font}"]`)?.remove()
        document.head.querySelector(`style[data-caja-google-font-style="${font}"]`)?.remove()
      }
    }

    prevFontsRef.current = activeFonts
  }, [root])

  return null
}
