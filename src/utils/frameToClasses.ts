import type { Frame, Spacing, BorderRadius } from '../types/frame'

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

function borderRadiusClasses(br: BorderRadius): string[] {
  const allEqual = br.topLeft === br.topRight && br.topRight === br.bottomRight && br.bottomRight === br.bottomLeft
  if (allEqual) {
    return br.topLeft > 0 ? [`rounded-[${br.topLeft}px]`] : []
  }
  const cls: string[] = []
  if (br.topLeft > 0) cls.push(`rounded-tl-[${br.topLeft}px]`)
  if (br.topRight > 0) cls.push(`rounded-tr-[${br.topRight}px]`)
  if (br.bottomRight > 0) cls.push(`rounded-br-[${br.bottomRight}px]`)
  if (br.bottomLeft > 0) cls.push(`rounded-bl-[${br.bottomLeft}px]`)
  return cls
}

const shadowMap: Record<string, string> = {
  sm: 'shadow-sm',
  base: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
}

const selfMap: Record<string, string> = {
  start: 'self-start',
  center: 'self-center',
  end: 'self-end',
  stretch: 'self-stretch',
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
    if (frame.fontStyle === 'italic') cls.push('italic')
    if (frame.textDecoration === 'underline') cls.push('underline')
    else if (frame.textDecoration === 'line-through') cls.push('line-through')
    if (frame.letterSpacing !== 0) cls.push(`tracking-[${frame.letterSpacing}px]`)
    if (frame.textTransform !== 'none') cls.push(frame.textTransform)
    if (frame.whiteSpace !== 'normal') cls.push(`whitespace-${frame.whiteSpace}`)
  }

  // Image
  if (frame.type === 'image') {
    const fitMap = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', none: 'object-none' }
    cls.push(fitMap[frame.objectFit])
  }

  // Button
  if (frame.type === 'button') {
    cls.push('inline-flex', 'items-center', 'justify-center', 'text-[14px]', 'font-medium', 'cursor-default')
    if (frame.variant === 'filled') {
      if (!frame.bg) cls.push('bg-[#18181b]')
      cls.push('text-white')
    } else if (frame.variant === 'outline') {
      if (frame.border.style === 'none') cls.push('border', 'border-[#d1d5db]')
      cls.push('text-[#18181b]')
    } else {
      cls.push('text-[#6b7280]')
    }
  }

  // Input
  if (frame.type === 'input') {
    cls.push('inline-flex', 'items-center', 'text-[14px]')
    if (frame.disabled) cls.push('opacity-50')
  }

  // Textarea
  if (frame.type === 'textarea') {
    cls.push('block', 'text-[14px]')
    if (frame.disabled) cls.push('opacity-50')
  }

  // Select
  if (frame.type === 'select') {
    cls.push('block', 'text-[14px]')
    if (frame.disabled) cls.push('opacity-50')
  }

  // Size
  if (frame.width.mode === 'hug') cls.push('w-fit')
  else if (frame.width.mode === 'fill') cls.push('w-full')
  else if (frame.width.mode === 'fixed') cls.push(`w-[${frame.width.value}px]`)

  if (frame.height.mode === 'hug') cls.push('h-fit')
  else if (frame.height.mode === 'fill') cls.push('h-full')
  else if (frame.height.mode === 'fixed') cls.push(`h-[${frame.height.value}px]`)

  // Size constraints
  if (frame.minWidth > 0) cls.push(`min-w-[${frame.minWidth}px]`)
  if (frame.maxWidth > 0) cls.push(`max-w-[${frame.maxWidth}px]`)
  if (frame.minHeight > 0) cls.push(`min-h-[${frame.minHeight}px]`)
  if (frame.maxHeight > 0) cls.push(`max-h-[${frame.maxHeight}px]`)

  // Flex grow/shrink
  if (frame.grow === 1) cls.push('grow')
  else if (frame.grow > 1) cls.push(`grow-[${frame.grow}]`)
  if (frame.shrink === 0) cls.push('shrink-0')

  // Align self
  if (frame.alignSelf !== 'auto' && selfMap[frame.alignSelf]) {
    cls.push(selfMap[frame.alignSelf])
  }

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
  cls.push(...borderRadiusClasses(frame.borderRadius))

  // Overflow
  if (frame.overflow !== 'visible') cls.push(`overflow-${frame.overflow}`)

  // Opacity
  if (frame.opacity < 100) cls.push(`opacity-[${frame.opacity / 100}]`)

  // Box shadow
  if (frame.boxShadow !== 'none' && shadowMap[frame.boxShadow]) {
    cls.push(shadowMap[frame.boxShadow])
  }

  // Cursor
  if (frame.cursor !== 'auto') cls.push(`cursor-${frame.cursor}`)

  // Manual classes (user-added)
  if (frame.tailwindClasses) cls.push(frame.tailwindClasses)

  return cls.join(' ')
}
