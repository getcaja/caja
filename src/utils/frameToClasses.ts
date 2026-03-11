import type { Frame, Spacing, Inset, BorderRadius, Border, DesignValue, ResponsiveOverrides } from '../types/frame'
import { toGoogleFontClass } from './googleFonts'

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

// --- DesignValue class helpers ---

// Container-size tokens only work with width in Tailwind v4 (w-md, w-lg, etc.)
// For height/min-height/max-height, fall back to arbitrary values.
const CONTAINER_TOKENS = new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'])
const HEIGHT_PREFIXES = new Set(['h', 'min-h', 'max-h'])

function dvClass(prefix: string, dv: DesignValue<number>, unit = 'px'): string {
  if (dv.mode === 'token') {
    if (HEIGHT_PREFIXES.has(prefix) && CONTAINER_TOKENS.has(dv.token)) {
      return `${prefix}-[${dv.value}${unit}]`
    }
    return `${prefix}-${dv.token}`
  }
  return `${prefix}-[${dv.value}${unit}]`
}

function dvColorClass(prefix: string, dv: DesignValue<string>, alpha?: DesignValue<number>): string {
  const suffix = alpha && (alpha.mode === 'token' || alpha.value < 100)
    ? `/${alpha.mode === 'token' ? alpha.token : alpha.value}`
    : ''
  if (dv.mode === 'token') return `${prefix}-${dv.token}${suffix}`
  return `${prefix}-[${dv.value}]${suffix}`
}

// Check if two DesignValues are equal (same mode, token, and value)
function dvEqual(a: DesignValue<number>, b: DesignValue<number>): boolean {
  if (a.mode !== b.mode) return false
  if (a.value !== b.value) return false
  if (a.mode === 'token' && b.mode === 'token' && a.token !== b.token) return false
  return true
}

function dvIsZero(dv: DesignValue<number>): boolean {
  return dv.mode === 'custom' && dv.value === 0
}

function spacingClasses(prefix: string, s: Spacing): string[] {
  if (!s?.top || !s?.right || !s?.bottom || !s?.left) return []
  if (dvIsZero(s.top) && dvIsZero(s.right) && dvIsZero(s.bottom) && dvIsZero(s.left)) return []
  // Uniform
  if (dvEqual(s.top, s.right) && dvEqual(s.right, s.bottom) && dvEqual(s.bottom, s.left)) {
    return [dvClass(prefix, s.top)]
  }
  // Symmetric
  const cls: string[] = []
  if (dvEqual(s.top, s.bottom) && dvEqual(s.left, s.right)) {
    if (!dvIsZero(s.top)) cls.push(dvClass(`${prefix}y`, s.top))
    if (!dvIsZero(s.left)) cls.push(dvClass(`${prefix}x`, s.left))
    return cls
  }
  // Per-side
  if (!dvIsZero(s.top)) cls.push(dvClass(`${prefix}t`, s.top))
  if (!dvIsZero(s.right)) cls.push(dvClass(`${prefix}r`, s.right))
  if (!dvIsZero(s.bottom)) cls.push(dvClass(`${prefix}b`, s.bottom))
  if (!dvIsZero(s.left)) cls.push(dvClass(`${prefix}l`, s.left))
  return cls
}

function dvIsAuto(dv: DesignValue<number>): boolean {
  return dv.mode === 'token' && dv.token === 'auto'
}

function insetClasses(inset: Inset): string[] {
  if (!inset?.top || !inset?.right || !inset?.bottom || !inset?.left) return []
  const { top, right, bottom, left } = inset
  const allZero = dvIsZero(top) && dvIsZero(right) && dvIsZero(bottom) && dvIsZero(left)
  if (allZero) return []

  // All 4 equal
  if (dvEqual(top, right) && dvEqual(right, bottom) && dvEqual(bottom, left)) {
    if (dvIsAuto(top)) return ['inset-auto']
    return [dvClass('inset', top)]
  }

  // Symmetric (x & y)
  if (dvEqual(top, bottom) && dvEqual(left, right)) {
    const cls: string[] = []
    if (!dvIsZero(top)) {
      if (dvIsAuto(top)) cls.push('inset-y-auto')
      else cls.push(dvClass('inset-y', top))
    }
    if (!dvIsZero(left)) {
      if (dvIsAuto(left)) cls.push('inset-x-auto')
      else cls.push(dvClass('inset-x', left))
    }
    return cls
  }

  // Per-side
  const cls: string[] = []
  const sides: [string, DesignValue<number>][] = [['top', top], ['right', right], ['bottom', bottom], ['left', left]]
  for (const [side, dv] of sides) {
    if (dvIsZero(dv)) continue
    if (dvIsAuto(dv)) cls.push(`${side}-auto`)
    else cls.push(dvClass(side, dv))
  }
  return cls
}

// Class helper for signed values (supports negative: -rotate-6, -translate-x-4)
function dvClassSigned(prefix: string, dv: DesignValue<number>, unit = 'px'): string {
  if (dv.value < 0) {
    const abs: DesignValue<number> = dv.mode === 'token'
      ? { mode: 'token', token: dv.token, value: -dv.value }
      : { mode: 'custom', value: -dv.value }
    return `-${dvClass(prefix, abs, unit)}`
  }
  return dvClass(prefix, dv, unit)
}

// Blur class helper — handles DEFAULT token → bare class name
function blurClass(prefix: string, dv: DesignValue<number>): string {
  if (dv.mode === 'token') {
    if (dv.token === 'DEFAULT') return prefix // 'blur' or 'backdrop-blur'
    return `${prefix}-${dv.token}`
  }
  return `${prefix}-[${dv.value}px]`
}

function borderRadiusClass(prefix: string, dv: DesignValue<number>): string {
  if (dv.mode === 'token') {
    if (dv.token === 'DEFAULT') return prefix // rounded, rounded-tl, etc.
    return `${prefix}-${dv.token}`
  }
  return `${prefix}-[${dv.value}px]`
}

function borderRadiusClasses(br: BorderRadius): string[] {
  if (!br?.topLeft || !br?.topRight || !br?.bottomRight || !br?.bottomLeft) return []
  const allEqual = dvEqual(br.topLeft, br.topRight) && dvEqual(br.topRight, br.bottomRight) && dvEqual(br.bottomRight, br.bottomLeft)
  if (allEqual) {
    return !dvIsZero(br.topLeft) ? [borderRadiusClass('rounded', br.topLeft)] : []
  }
  const cls: string[] = []
  if (!dvIsZero(br.topLeft)) cls.push(borderRadiusClass('rounded-tl', br.topLeft))
  if (!dvIsZero(br.topRight)) cls.push(borderRadiusClass('rounded-tr', br.topRight))
  if (!dvIsZero(br.bottomRight)) cls.push(borderRadiusClass('rounded-br', br.bottomRight))
  if (!dvIsZero(br.bottomLeft)) cls.push(borderRadiusClass('rounded-bl', br.bottomLeft))
  return cls
}

// Border width class for a single side — handles the bare `border` / `border-t` = 1px convention
function borderWidthClass(prefix: string, dv: DesignValue<number>): string {
  if (dv.mode === 'token') {
    // token "" = bare class (1px): `border`, `border-t`, etc.
    return dv.token === '' ? prefix : `${prefix}-${dv.token}`
  }
  // custom 1px → bare class
  return dv.value === 1 ? prefix : `${prefix}-[${dv.value}px]`
}

function borderClasses(border: Border): string[] {
  // Defensive: old data may lack per-side fields
  if (!border.top || !border.right || !border.bottom || !border.left) return []
  const allZero = dvIsZero(border.top) && dvIsZero(border.right) && dvIsZero(border.bottom) && dvIsZero(border.left)
  if (allZero || border.style === 'none') return []

  const cls: string[] = []

  // Border width — follow spacingClasses pattern: uniform → symmetric → per-side
  const allEqual = dvEqual(border.top, border.right) && dvEqual(border.right, border.bottom) && dvEqual(border.bottom, border.left)
  if (allEqual) {
    cls.push(borderWidthClass('border', border.top))
  } else if (dvEqual(border.top, border.bottom) && dvEqual(border.left, border.right)) {
    // Symmetric: border-x / border-y
    if (!dvIsZero(border.top)) cls.push(borderWidthClass('border-y', border.top))
    if (!dvIsZero(border.left)) cls.push(borderWidthClass('border-x', border.left))
  } else {
    // Per-side
    if (!dvIsZero(border.top)) cls.push(borderWidthClass('border-t', border.top))
    if (!dvIsZero(border.right)) cls.push(borderWidthClass('border-r', border.right))
    if (!dvIsZero(border.bottom)) cls.push(borderWidthClass('border-b', border.bottom))
    if (!dvIsZero(border.left)) cls.push(borderWidthClass('border-l', border.left))
  }

  if (border.style !== 'solid') cls.push(`border-${border.style}`)

  // Border color
  if (border.color.value) {
    cls.push(dvColorClass('border', border.color))
  }

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
  try {
  const cls: string[] = []

  // Position
  if (frame.position !== 'static') {
    cls.push(frame.position)
  }
  if (frame.position !== 'static') {
    if (!dvIsZero(frame.zIndex)) cls.push(dvClass('z', frame.zIndex, ''))
    cls.push(...insetClasses(frame.inset))
  }

  // Layout (only applies to box — the only container type with display/direction/gap)
  if (frame.type === 'box') {
    if (frame.display === 'flex' || frame.display === 'inline-flex') {
      cls.push(frame.display === 'inline-flex' ? 'inline-flex' : 'flex')
      const dirMap: Record<string, string> = { row: 'flex-row', column: 'flex-col', 'row-reverse': 'flex-row-reverse', 'column-reverse': 'flex-col-reverse' }
      cls.push(dirMap[frame.direction] ?? 'flex-col')

      const justifyMap = { start: '', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' }
      if (justifyMap[frame.justify]) cls.push(justifyMap[frame.justify])

      const alignMap = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }
      cls.push(alignMap[frame.align])

      if (!dvIsZero(frame.gap)) cls.push(dvClass('gap', frame.gap))
      if (frame.wrap) cls.push('flex-wrap')
    } else if (frame.display === 'grid') {
      cls.push('grid')
      if (!dvIsZero(frame.gridCols)) cls.push(dvClass('grid-cols', frame.gridCols, ''))
      if (!dvIsZero(frame.gridRows)) cls.push(dvClass('grid-rows', frame.gridRows, ''))
      if (!dvIsZero(frame.gap)) cls.push(dvClass('gap', frame.gap))
    }
  }

  // Text styles (text, button, input, textarea, select — anything with TextStyles)
  if ('fontSize' in frame) {
    // Text color
    if (frame.color?.value) cls.push(dvColorClass('text', frame.color, frame.colorAlpha))
    const hasFontSize = !dvIsZero(frame.fontSize)
    const hasLineHeight = !dvIsZero(frame.lineHeight)

    if (hasFontSize) {
      // fontSize + lineHeight combined syntax
      if (frame.fontSize.mode === 'token') {
        if (hasLineHeight) {
          if (frame.lineHeight.mode === 'token') {
            cls.push(`text-${frame.fontSize.token}/${frame.lineHeight.token}`)
          } else {
            cls.push(`text-${frame.fontSize.token}/[${frame.lineHeight.value}]`)
          }
        } else {
          cls.push(`text-${frame.fontSize.token}`)
        }
      } else {
        cls.push(`text-[${frame.fontSize.value}px]`)
        if (hasLineHeight) {
          if (frame.lineHeight.mode === 'token') {
            cls.push(`leading-${frame.lineHeight.token}`)
          } else {
            cls.push(`leading-[${frame.lineHeight.value}]`)
          }
        }
      }
    } else if (hasLineHeight) {
      if (frame.lineHeight.mode === 'token') {
        cls.push(`leading-${frame.lineHeight.token}`)
      } else {
        cls.push(`leading-[${frame.lineHeight.value}]`)
      }
    }
    if (!dvIsZero(frame.fontWeight) && frame.fontWeight.value !== 400) {
      if (frame.fontWeight.mode === 'token') {
        cls.push(`font-${frame.fontWeight.token}`)
      } else {
        cls.push(weightMap[frame.fontWeight.value] || `font-[${frame.fontWeight.value}]`)
      }
    }
    // Always emit text-align (including text-left) — boxes no longer have
    // typography, but external CSS or tailwindClasses on ancestors could still
    // set text-center, so explicit text-left prevents inheritance surprises.
    if (frame.textAlign) cls.push(`text-${frame.textAlign}`)
    if (frame.textAlignVertical && frame.textAlignVertical !== 'start') cls.push(`content-${frame.textAlignVertical}`)
    if (frame.fontStyle === 'italic') cls.push('italic')
    if (frame.textDecoration === 'underline') cls.push('underline')
    else if (frame.textDecoration === 'line-through') cls.push('line-through')
    if (!dvIsZero(frame.letterSpacing)) {
      if (frame.letterSpacing.mode === 'token') {
        cls.push(`tracking-${frame.letterSpacing.token}`)
      } else {
        cls.push(`tracking-[${frame.letterSpacing.value}px]`)
      }
    }
    if (frame.textTransform !== 'none') cls.push(frame.textTransform)
    if (frame.whiteSpace !== 'normal') cls.push(`whitespace-${frame.whiteSpace}`)
    if (frame.fontFamily) {
      if (frame.fontFamily === 'sans' || frame.fontFamily === 'serif' || frame.fontFamily === 'mono') {
        cls.push(`font-${frame.fontFamily}`)
      } else {
        cls.push(toGoogleFontClass(frame.fontFamily))
      }
    }
  }

  // Image
  if (frame.type === 'image') {
    const fitMap: Record<string, string> = { cover: 'object-cover', contain: 'object-contain', fill: 'object-fill', none: 'object-none' }
    const fitClass = fitMap[frame.objectFit]
    if (fitClass) cls.push(fitClass)
  }

  // Size
  if (frame.width.mode === 'hug') cls.push('w-fit')
  else if (frame.width.mode === 'fill') cls.push('w-full')
  else if (frame.width.mode === 'fixed') cls.push(dvClass('w', frame.width.value))

  if (frame.height.mode === 'hug') cls.push('h-fit')
  else if (frame.height.mode === 'fill') cls.push('h-full')
  else if (frame.height.mode === 'fixed') cls.push(dvClass('h', frame.height.value))

  // Size constraints
  if (!dvIsZero(frame.minWidth)) cls.push(dvClass('min-w', frame.minWidth))
  if (!dvIsZero(frame.maxWidth)) cls.push(dvClass('max-w', frame.maxWidth))
  if (!dvIsZero(frame.minHeight)) cls.push(dvClass('min-h', frame.minHeight))
  if (!dvIsZero(frame.maxHeight)) cls.push(dvClass('max-h', frame.maxHeight))

  // Flex grow/shrink
  const growVal = frame.grow.value
  if (growVal === 0 && frame.grow.mode === 'token') cls.push('grow-0')
  else if (growVal === 1) cls.push('grow')
  else if (growVal > 1) cls.push(`grow-[${growVal}]`)
  const shrinkVal = frame.shrink.value
  if (shrinkVal === 0) cls.push('shrink-0')
  else if (shrinkVal !== 1) cls.push(`shrink-[${shrinkVal}]`)

  // Align self
  if (frame.alignSelf !== 'auto' && selfMap[frame.alignSelf]) {
    cls.push(selfMap[frame.alignSelf])
  }

  // Grid child: colSpan / rowSpan
  if (!dvIsZero(frame.colSpan)) {
    if (frame.colSpan.mode === 'token' && frame.colSpan.token === 'full') cls.push('col-span-full')
    else cls.push(dvClass('col-span', frame.colSpan, ''))
  }
  if (!dvIsZero(frame.rowSpan)) {
    if (frame.rowSpan.mode === 'token' && frame.rowSpan.token === 'full') cls.push('row-span-full')
    else cls.push(dvClass('row-span', frame.rowSpan, ''))
  }

  // Spacing
  cls.push(...spacingClasses('p', frame.padding))
  cls.push(...spacingClasses('m', frame.margin))

  // Background
  if (frame.bg.value) cls.push(dvColorClass('bg', frame.bg, frame.bgAlpha))

  // Background image (size/position/repeat classes only — url set via inline style)
  if (frame.bgImage) {
    if (frame.bgSize !== 'auto') cls.push(`bg-${frame.bgSize}`)
    if (frame.bgPosition !== 'center') {
      // Tailwind v4 format: bg-left-top, not bg-top-left
      const posMap: Record<string, string> = {
        'top': 'bg-top', 'bottom': 'bg-bottom', 'left': 'bg-left', 'right': 'bg-right',
        'top-left': 'bg-left-top', 'top-right': 'bg-right-top',
        'bottom-left': 'bg-left-bottom', 'bottom-right': 'bg-right-bottom',
      }
      if (posMap[frame.bgPosition]) cls.push(posMap[frame.bgPosition])
    }
    if (frame.bgRepeat !== 'repeat') cls.push(`bg-${frame.bgRepeat}`)
  }

  // Border
  cls.push(...borderClasses(frame.border))

  // Border radius
  cls.push(...borderRadiusClasses(frame.borderRadius))

  // Overflow
  if (frame.overflow !== 'visible') cls.push(`overflow-${frame.overflow}`)

  // Opacity
  if (frame.opacity.mode === 'token' || frame.opacity.value < 100) {
    if (frame.opacity.mode === 'token') {
      cls.push(`opacity-${frame.opacity.token}`)
    } else {
      cls.push(`opacity-[${frame.opacity.value / 100}]`)
    }
  }

  // Box shadow
  if (frame.boxShadow !== 'none' && shadowMap[frame.boxShadow]) {
    cls.push(shadowMap[frame.boxShadow])
  }

  // Blur / Backdrop blur
  if (!dvIsZero(frame.blur)) cls.push(blurClass('blur', frame.blur))
  if (!dvIsZero(frame.backdropBlur)) cls.push(blurClass('backdrop-blur', frame.backdropBlur))

  // Transforms
  if (!dvIsZero(frame.rotate)) cls.push(dvClassSigned('rotate', frame.rotate, 'deg'))
  if (frame.scaleVal.value !== 100) cls.push(dvClass('scale', frame.scaleVal, ''))
  if (!dvIsZero(frame.translateX)) cls.push(dvClassSigned('translate-x', frame.translateX))
  if (!dvIsZero(frame.translateY)) cls.push(dvClassSigned('translate-y', frame.translateY))
  if (!dvIsZero(frame.skewX)) cls.push(dvClassSigned('skew-x', frame.skewX, 'deg'))
  if (!dvIsZero(frame.skewY)) cls.push(dvClassSigned('skew-y', frame.skewY, 'deg'))
  if (frame.transformOrigin && frame.transformOrigin !== 'center') cls.push(`origin-${frame.transformOrigin}`)

  // Transitions
  if (frame.transition !== 'none') {
    cls.push(`transition-${frame.transition}`)
    if (!dvIsZero(frame.duration)) cls.push(dvClass('duration', frame.duration, ''))
    if (frame.ease !== 'linear') cls.push(`ease-${frame.ease}`)
  }

  // Cursor
  if (frame.cursor !== 'auto') cls.push(`cursor-${frame.cursor}`)

  // Manual classes (user-added)
  if (frame.tailwindClasses) cls.push(frame.tailwindClasses)

  // Responsive override classes
  const responsiveClasses = generateResponsiveClasses(frame)
  if (responsiveClasses) cls.push(responsiveClasses)

  return cls.join(' ')
  } catch (err) {
    console.warn(`[frameToClasses] Error for frame ${frame?.id}:`, err)
    return frame?.tailwindClasses || ''
  }
}

/**
 * Generate prefixed classes for responsive overrides.
 * Desktop-first: base=LG (≥1280, no prefix), xl=MD (768–1280, max-xl:), md=SM (≤768, max-md:).
 */
function generateResponsiveClasses(frame: Frame): string {
  if (!frame.responsive) return ''
  const cls: string[] = []
  const bps: Array<{ key: 'md' | 'xl'; prefix: string }> = [
    { key: 'xl', prefix: 'max-xl:' },
    { key: 'md', prefix: 'max-md:' },
  ]
  for (const { key, prefix } of bps) {
    const overrides = frame.responsive[key]
    if (!overrides || Object.keys(overrides).length === 0) continue
    cls.push(...overrideClasses(overrides, frame, prefix))
  }
  return cls.join(' ')
}

/** Generate Tailwind classes for a sparse set of responsive overrides.
 *
 * Every override class uses `!important` (`!` prefix in Tailwind) because
 * container-query variants (`@max-[768px]:`) have the same CSS specificity as
 * base utilities.  Without `!important`, source order in the Tailwind CDN
 * stylesheet can let the base class win (e.g. `flex` beating `hidden`,
 * `text-3xl` beating `text-base`).  The `!` prefix is the standard Tailwind
 * way to add `!important`. */
function overrideClasses(ov: ResponsiveOverrides, _base: Frame, prefix: string): string[] {
  const cls: string[] = []
  const p = (c: string) => `${prefix}!${c}`

  // Hidden
  if (ov.hidden !== undefined) {
    if (ov.hidden) {
      cls.push(p('hidden'))
    } else if (_base.type === 'box') {
      const d = (_base as import('../types/frame').BoxElement).display
      cls.push(p(d === 'grid' ? 'grid' : d === 'inline-flex' ? 'inline-flex' : 'flex'))
    } else {
      cls.push(p('block'))
    }
  }

  // Display / direction / justify / align / gap / wrap (box-only)
  if (ov.display !== undefined) {
    if (ov.display === 'flex' || ov.display === 'inline-flex') {
      cls.push(p(ov.display === 'inline-flex' ? 'inline-flex' : 'flex'))
    } else if (ov.display === 'grid') {
      cls.push(p('grid'))
    }
  }
  if (ov.direction !== undefined) {
    const dirMap: Record<string, string> = { row: 'flex-row', column: 'flex-col', 'row-reverse': 'flex-row-reverse', 'column-reverse': 'flex-col-reverse' }
    cls.push(p(dirMap[ov.direction] ?? 'flex-col'))
  }
  if (ov.justify !== undefined) {
    const justifyMap: Record<string, string> = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' }
    if (justifyMap[ov.justify]) cls.push(p(justifyMap[ov.justify]))
  }
  if (ov.align !== undefined) {
    const alignMap: Record<string, string> = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }
    if (alignMap[ov.align]) cls.push(p(alignMap[ov.align]))
  }
  if (ov.gap !== undefined && !dvIsZero(ov.gap)) cls.push(p(dvClass('gap', ov.gap)))
  if (ov.wrap !== undefined) cls.push(p(ov.wrap ? 'flex-wrap' : 'flex-nowrap'))
  if (ov.gridCols !== undefined && !dvIsZero(ov.gridCols)) cls.push(p(dvClass('grid-cols', ov.gridCols, '')))
  if (ov.gridRows !== undefined && !dvIsZero(ov.gridRows)) cls.push(p(dvClass('grid-rows', ov.gridRows, '')))

  // Size
  if (ov.width !== undefined) {
    if (ov.width.mode === 'hug') cls.push(p('w-fit'))
    else if (ov.width.mode === 'fill') cls.push(p('w-full'))
    else if (ov.width.mode === 'fixed') cls.push(p(dvClass('w', ov.width.value)))
    else cls.push(p('w-auto'))
  }
  if (ov.height !== undefined) {
    if (ov.height.mode === 'hug') cls.push(p('h-fit'))
    else if (ov.height.mode === 'fill') cls.push(p('h-full'))
    else if (ov.height.mode === 'fixed') cls.push(p(dvClass('h', ov.height.value)))
    else cls.push(p('h-auto'))
  }

  // Spacing
  if (ov.padding !== undefined) {
    for (const c of spacingClasses('p', ov.padding)) cls.push(p(c))
  }
  if (ov.margin !== undefined) {
    for (const c of spacingClasses('m', ov.margin)) cls.push(p(c))
  }

  // Size constraints
  if (ov.minWidth !== undefined) { if (!dvIsZero(ov.minWidth)) cls.push(p(dvClass('min-w', ov.minWidth))); else cls.push(p('min-w-0')) }
  if (ov.maxWidth !== undefined) { if (!dvIsZero(ov.maxWidth)) cls.push(p(dvClass('max-w', ov.maxWidth))); else cls.push(p('max-w-none')) }
  if (ov.minHeight !== undefined) { if (!dvIsZero(ov.minHeight)) cls.push(p(dvClass('min-h', ov.minHeight))); else cls.push(p('min-h-0')) }
  if (ov.maxHeight !== undefined) { if (!dvIsZero(ov.maxHeight)) cls.push(p(dvClass('max-h', ov.maxHeight))); else cls.push(p('max-h-none')) }

  // Flex grow / shrink
  if (ov.grow !== undefined) {
    const growVal = ov.grow.value
    if (growVal === 0) cls.push(p('grow-0'))
    else if (growVal === 1) cls.push(p('grow'))
    else cls.push(p(`grow-[${growVal}]`))
  }
  if (ov.shrink !== undefined) {
    const shrinkVal = ov.shrink.value
    if (shrinkVal === 0) cls.push(p('shrink-0'))
    else if (shrinkVal === 1) cls.push(p('shrink'))
    else cls.push(p(`shrink-[${shrinkVal}]`))
  }

  // Align self
  if (ov.alignSelf !== undefined && ov.alignSelf !== 'auto') {
    const selfMapLocal: Record<string, string> = { start: 'self-start', center: 'self-center', end: 'self-end', stretch: 'self-stretch' }
    if (selfMapLocal[ov.alignSelf]) cls.push(p(selfMapLocal[ov.alignSelf]))
  }

  // Background
  if (ov.bg !== undefined && ov.bg.value) cls.push(p(dvColorClass('bg', ov.bg)))

  // Opacity
  if (ov.opacity !== undefined) {
    if (ov.opacity.mode === 'token') cls.push(p(`opacity-${ov.opacity.token}`))
    else if (ov.opacity.value < 100) cls.push(p(`opacity-[${ov.opacity.value / 100}]`))
  }

  // Text styles
  if (ov.fontSize !== undefined && !dvIsZero(ov.fontSize)) {
    if (ov.fontSize.mode === 'token') cls.push(p(`text-${ov.fontSize.token}`))
    else cls.push(p(`text-[${ov.fontSize.value}px]`))
  }
  if (ov.fontWeight !== undefined && !dvIsZero(ov.fontWeight) && ov.fontWeight.value !== 400) {
    if (ov.fontWeight.mode === 'token') cls.push(p(`font-${ov.fontWeight.token}`))
    else {
      const w = weightMap[ov.fontWeight.value]
      cls.push(p(w || `font-[${ov.fontWeight.value}]`))
    }
  }
  if (ov.lineHeight !== undefined && !dvIsZero(ov.lineHeight)) {
    if (ov.lineHeight.mode === 'token') cls.push(p(`leading-${ov.lineHeight.token}`))
    else cls.push(p(`leading-[${ov.lineHeight.value}]`))
  }
  if (ov.textAlign !== undefined) cls.push(p(`text-${ov.textAlign}`))

  return cls
}
