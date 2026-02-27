/**
 * Convert viewport responsive prefixes (sm:, md:, max-md:, etc.)
 * to container query prefixes (@sm:, @md:, @max-md:, etc.).
 *
 * Used by FrameRenderer at render time so the inline canvas
 * responds to its container width instead of the viewport.
 * Export still calls frameToClasses() directly — standard `md:` prefixes.
 */
const RE = /\b(max-)?(sm|md|lg|xl|2xl):/g

export function toContainerQueries(classes: string): string {
  return classes.replace(RE, (_, max, bp) => max ? `@max-${bp}:` : `@${bp}:`)
}
