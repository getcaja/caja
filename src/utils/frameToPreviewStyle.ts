import type { Frame } from '../types/frame'

/**
 * Returns inline styles for dynamic/arbitrary values that Tailwind v4
 * cannot generate at build time (user-defined colors, pixel values, etc.).
 *
 * Static Tailwind classes (flex, flex-row, items-center, w-full, grow, etc.)
 * work fine from frameToClasses(). This function only covers the dynamic bits
 * needed for the canvas preview to render correctly.
 *
 * frameToClasses() remains the source of truth for export and display.
 */
export function frameToPreviewStyle(frame: Frame): React.CSSProperties {
  const style: React.CSSProperties = {}
  const { padding: p, margin: m } = frame

  // Box layout — gap is dynamic
  if (frame.type === 'box') {
    if (frame.gap > 0) style.gap = frame.gap
  }

  // Text — all values are dynamic
  if (frame.type === 'text') {
    style.fontSize = frame.fontSize
    style.fontWeight = frame.fontWeight
    style.lineHeight = frame.lineHeight
    if (frame.color) style.color = frame.color
    if (frame.textAlign !== 'left') style.textAlign = frame.textAlign
  }

  // Image — objectFit is dynamic
  if (frame.type === 'image') {
    style.objectFit = frame.objectFit
  }

  // Size — fixed values are dynamic
  if (frame.width.mode === 'fixed') style.width = frame.width.value
  if (frame.height.mode === 'fixed') style.height = frame.height.value

  // Spacing — all values are dynamic
  if (p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0) {
    style.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`
  }
  if (m.top > 0 || m.right > 0 || m.bottom > 0 || m.left > 0) {
    style.margin = `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`
  }

  // Background — dynamic color
  if (frame.bg) style.backgroundColor = frame.bg

  // Border — dynamic values
  if (frame.border.width > 0 && frame.border.style !== 'none') {
    style.borderWidth = frame.border.width
    style.borderStyle = frame.border.style
    style.borderColor = frame.border.color || 'currentColor'
  }

  // Border radius — dynamic value
  if (frame.borderRadius > 0) style.borderRadius = frame.borderRadius

  // Button — variant-based defaults (applied after user overrides so we only fill gaps)
  if (frame.type === 'button') {
    const hasBg = !!frame.bg
    const hasBorder = frame.border.width > 0 && frame.border.style !== 'none'
    const hasPad = p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0
    if (frame.variant === 'filled') {
      if (!hasBg) style.backgroundColor = '#18181b'
      style.color = '#ffffff'
    } else if (frame.variant === 'outline') {
      if (!hasBorder) {
        style.borderWidth = 1
        style.borderStyle = 'solid'
        style.borderColor = '#d1d5db'
      }
      style.color = '#18181b'
    } else {
      // ghost
      style.color = '#6b7280'
    }
    if (frame.borderRadius === 0) style.borderRadius = 6
    if (!hasPad) style.padding = '8px 16px'
    style.fontSize = 14
    style.fontWeight = 500
    style.cursor = 'default'
  }

  // Input — default appearance (applied after user overrides)
  if (frame.type === 'input') {
    const hasBorder = frame.border.width > 0 && frame.border.style !== 'none'
    const hasPad = p.top > 0 || p.right > 0 || p.bottom > 0 || p.left > 0
    if (!hasBorder) {
      style.borderWidth = 1
      style.borderStyle = 'solid'
      style.borderColor = '#d1d5db'
    }
    if (frame.borderRadius === 0) style.borderRadius = 6
    if (!hasPad) style.padding = '8px 12px'
    style.fontSize = 14
    if (frame.disabled) style.opacity = 0.5
  }

  return style
}
