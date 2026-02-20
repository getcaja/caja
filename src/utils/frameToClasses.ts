import type { Frame, Spacing } from '../types/frame'

const weightMap: Record<number, string> = {
  100: 'font-thin',
  200: 'font-extralight',
  300: 'font-light',
  400: 'font-normal',
  500: 'font-medium',
  600: 'font-semibold',
  700: 'font-bold',
  800: 'font-extrabold',
  900: 'font-black',
}

function spacingClasses(prefix: string, s: Spacing): string[] {
  if (s.top === 0 && s.right === 0 && s.bottom === 0 && s.left === 0) return []
  // Uniform
  if (s.top === s.right && s.right === s.bottom && s.bottom === s.left) {
    return [`${prefix}-[${s.top}px]`]
  }
  // Symmetric
  const cls: string[] = []
  if (s.top === s.bottom && s.left === s.right) {
    if (s.top > 0) cls.push(`${prefix}y-[${s.top}px]`)
    if (s.left > 0) cls.push(`${prefix}x-[${s.left}px]`)
    return cls
  }
  // Per-side
  if (s.top > 0) cls.push(`${prefix}t-[${s.top}px]`)
  if (s.right > 0) cls.push(`${prefix}r-[${s.right}px]`)
  if (s.bottom > 0) cls.push(`${prefix}b-[${s.bottom}px]`)
  if (s.left > 0) cls.push(`${prefix}l-[${s.left}px]`)
  return cls
}

/**
 * Single source of truth: converts a Frame's properties into a Tailwind class string.
 * Used by: FrameRenderer (canvas preview), Export (JSX output), Properties panel (class pills).
 */
export function frameToClasses(frame: Frame): string {
  const cls: string[] = []

  // Box layout
  if (frame.type === 'box') {
    cls.push('flex')
    cls.push(frame.direction === 'row' ? 'flex-row' : 'flex-col')

    const justifyMap = { start: '', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' }
    if (justifyMap[frame.justify]) cls.push(justifyMap[frame.justify])

    const alignMap = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }
    cls.push(alignMap[frame.align])

    if (frame.gap > 0) cls.push(`gap-[${frame.gap}px]`)
    if (frame.wrap) cls.push('flex-wrap')
  }

  // Text
  if (frame.type === 'text') {
    cls.push(`text-[${frame.fontSize}px]`)
    if (frame.fontWeight !== 400) cls.push(weightMap[frame.fontWeight] || `font-[${frame.fontWeight}]`)
    cls.push(`leading-[${frame.lineHeight}]`)
    if (frame.color) cls.push(`text-[${frame.color}]`)
    if (frame.textAlign !== 'left') cls.push(`text-${frame.textAlign}`)
  }

  // Image
  if (frame.type === 'image') {
    const fitMap = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', none: 'object-none' }
    cls.push(fitMap[frame.objectFit])
  }

  // Button
  if (frame.type === 'button') {
    cls.push('inline-flex', 'items-center', 'justify-center')
  }

  // Input
  if (frame.type === 'input') {
    cls.push('inline-flex', 'items-center')
  }

  // Size
  if (frame.width.mode === 'hug') cls.push('w-fit')
  else if (frame.width.mode === 'fill') cls.push('w-full')
  else if (frame.width.mode === 'fixed') cls.push(`w-[${frame.width.value}px]`)

  if (frame.height.mode === 'hug') cls.push('h-fit')
  else if (frame.height.mode === 'fill') cls.push('h-full')
  else if (frame.height.mode === 'fixed') cls.push(`h-[${frame.height.value}px]`)

  // Flex grow/shrink
  if (frame.grow === 1) cls.push('grow')
  else if (frame.grow > 1) cls.push(`grow-[${frame.grow}]`)
  if (frame.shrink === 0) cls.push('shrink-0')

  // Spacing
  cls.push(...spacingClasses('p', frame.padding))
  cls.push(...spacingClasses('m', frame.margin))

  // Background
  if (frame.bg) cls.push(`bg-[${frame.bg}]`)

  // Border
  if (frame.border.width > 0 && frame.border.style !== 'none') {
    cls.push(frame.border.width === 1 ? 'border' : `border-[${frame.border.width}px]`)
    if (frame.border.style !== 'solid') cls.push(`border-${frame.border.style}`)
    if (frame.border.color) cls.push(`border-[${frame.border.color}]`)
  }

  // Border radius
  if (frame.borderRadius > 0) cls.push(`rounded-[${frame.borderRadius}px]`)

  // Overflow
  if (frame.overflow !== 'visible') cls.push(`overflow-${frame.overflow}`)

  // Opacity
  if (frame.opacity < 100) cls.push(`opacity-[${frame.opacity / 100}]`)

  // Manual classes (user-added)
  if (frame.tailwindClasses) cls.push(frame.tailwindClasses)

  return cls.join(' ')
}
