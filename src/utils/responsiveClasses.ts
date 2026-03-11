/**
 * Convert viewport responsive prefixes (max-md:, max-sm:, etc.)
 * to container query prefixes with explicit pixel breakpoints.
 *
 * Tailwind v4's named container breakpoints (@max-md = 28rem = 448px)
 * don't match viewport breakpoints (max-md = 768px). We use arbitrary
 * pixel values so the canvas container queries fire at the correct widths.
 *
 * Used by FrameRenderer at render time so the inline canvas
 * responds to its container width instead of the viewport.
 * Export still calls frameToClasses() directly — standard `max-md:` prefixes.
 */

// Viewport breakpoint → pixel value mapping
const BP_PX: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

const RE = /\b(max-)?(sm|md|lg|xl|2xl):/g

export function toContainerQueries(classes: string): string {
  return classes.replace(RE, (_, max, bp) => {
    const px = BP_PX[bp]
    return max ? `@max-[${px}px]:` : `@min-[${px}px]:`
  })
}

/** Strip all responsive-prefixed classes (e.g. `max-md:!text-2xl`).
 *  Used in the editor canvas where getEffectiveFrame already merges
 *  overrides for the active breakpoint — container queries not needed. */
const RESPONSIVE_CLASS_RE = /\S*\b(?:max-)?(sm|md|lg|xl|2xl):\S*/g

export function stripResponsivePrefixes(classes: string): string {
  return classes.replace(RESPONSIVE_CLASS_RE, '').replace(/\s{2,}/g, ' ').trim()
}
