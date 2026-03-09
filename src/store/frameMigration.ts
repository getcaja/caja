import type { Frame, BoxElement, BoxTag, BoxDisplay, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, TextStyles, Spacing, SizeValue, BorderRadius, Border, DesignValue } from '../types/frame'
import { generateId, isRootId } from './treeHelpers'
import {
  dvNum, dvStr, zeroSpacing, zeroBorderRadius, uniformBorderRadius,
  createInternalRoot, normalizeFrame,
} from './frameFactories'
import { parseTailwindClasses } from '../utils/parseTailwindClasses'

// --- Migration helpers ---
export function migrateDVNum(raw: unknown, fallback: number): DesignValue<number> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<number>
  if (typeof raw === 'number') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}

export function migrateDVStr(raw: unknown, fallback: string): DesignValue<string> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<string>
  if (typeof raw === 'string') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}

export function migrateSpacing(raw: unknown): Spacing {
  if (!raw || typeof raw !== 'object') return zeroSpacing()
  const r = raw as Record<string, unknown>
  return {
    top: migrateDVNum(r.top, 0),
    right: migrateDVNum(r.right, 0),
    bottom: migrateDVNum(r.bottom, 0),
    left: migrateDVNum(r.left, 0),
  }
}

export function migrateBorderRadius(raw: unknown): BorderRadius {
  if (typeof raw === 'number') {
    return uniformBorderRadius(raw)
  }
  if (!raw || typeof raw !== 'object') return zeroBorderRadius()
  const r = raw as Record<string, unknown>
  return {
    topLeft: migrateDVNum(r.topLeft, 0),
    topRight: migrateDVNum(r.topRight, 0),
    bottomRight: migrateDVNum(r.bottomRight, 0),
    bottomLeft: migrateDVNum(r.bottomLeft, 0),
  }
}

export function migrateBorder(raw: unknown): Border {
  if (!raw || typeof raw !== 'object') return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0), color: dvStr(''), style: 'none' }
  const r = raw as Record<string, unknown>
  // Backward compat: old format had `width` as a single DesignValue — expand to all 4 sides
  if ('width' in r && !('top' in r)) {
    const w = migrateDVNum(r.width, 0)
    return { top: w, right: { ...w }, bottom: { ...w }, left: { ...w }, color: migrateDVStr(r.color, ''), style: (r.style as Border['style']) || 'none' }
  }
  return {
    top: migrateDVNum(r.top, 0),
    right: migrateDVNum(r.right, 0),
    bottom: migrateDVNum(r.bottom, 0),
    left: migrateDVNum(r.left, 0),
    color: migrateDVStr(r.color, ''),
    style: (r.style as Border['style']) || 'none',
  }
}

export function migrateSizeValue(raw: unknown): SizeValue {
  if (!raw || typeof raw !== 'object') return { mode: 'default', value: dvNum(0) }
  const r = raw as Record<string, unknown>
  const mode = (r.mode as string) === 'auto' ? 'default' : (r.mode as SizeValue['mode']) || 'default'
  return { mode, value: migrateDVNum(r.value, 0) }
}

export function migrateTextStyles(raw: Record<string, unknown>): TextStyles {
  return {
    color: migrateDVStr(raw.color, ''),
    colorAlpha: migrateDVNum(raw.colorAlpha, 100),
    fontSize: migrateDVNum(raw.fontSize, 0),
    fontWeight: migrateDVNum(raw.fontWeight, 0),
    lineHeight: migrateDVNum(raw.lineHeight, 0),
    textAlign: (raw.textAlign as TextStyles['textAlign']) || 'left',
    textAlignVertical: (raw.textAlignVertical as TextStyles['textAlignVertical']) || 'start',
    fontStyle: (raw.fontStyle as TextStyles['fontStyle']) || 'normal',
    textDecoration: (raw.textDecoration as TextStyles['textDecoration']) || 'none',
    letterSpacing: migrateDVNum(raw.letterSpacing, 0),
    textTransform: (raw.textTransform as TextStyles['textTransform']) || 'none',
    whiteSpace: (raw.whiteSpace as TextStyles['whiteSpace']) || 'normal',
    fontFamily: (raw.fontFamily as string) === 'sans' ? '' : ((raw.fontFamily as string) || ''),
  }
}

/** Convert deprecated display values to flex/grid (block/inline-block/inline removed) */
function migrateDisplay(d: string | undefined): BoxDisplay {
  if (d === 'grid') return 'grid'
  if (d === 'inline-flex') return 'inline-flex'
  return 'flex' // block, inline-block, inline, undefined → flex
}

// Migrate old format data to current schema
export function migrateFrame(raw: Record<string, unknown>): Frame {
  const children = (raw.children as Record<string, unknown>[] | undefined) ?? []

  // Sanitize corrupted IDs (e.g. "frame-NaN" from previous bug)
  const rawId = raw.id as string
  const id = (rawId && !rawId.includes('NaN')) ? rawId : generateId()

  const base = {
    id,
    name: (raw.name as string && !(raw.name as string).includes('NaN')) ? (raw.name as string) : `frame-${id.split('-')[1]}`,
    hidden: (raw.hidden as boolean) ?? false,
    className: (raw.className as string) || '',
    htmlId: (raw.htmlId as string) || '',
    padding: migrateSpacing(raw.padding),
    margin: migrateSpacing(raw.margin),
    width: migrateSizeValue(raw.width),
    height: migrateSizeValue(raw.height),
    grow: migrateDVNum(raw.grow, 0),
    shrink: migrateDVNum(raw.shrink, 1),
    overflow: (raw.overflow as Frame['overflow']) || 'visible',
    opacity: migrateDVNum(raw.opacity, 100),
    bgAlpha: migrateDVNum(raw.bgAlpha, 100),
    bg: migrateDVStr(raw.bg, ''),
    border: migrateBorder(raw.border),
    borderRadius: migrateBorderRadius(raw.borderRadius),
    tailwindClasses: '',
    boxShadow: (raw.boxShadow as Frame['boxShadow']) || 'none',
    cursor: (raw.cursor as Frame['cursor']) || 'auto',
    minWidth: migrateDVNum(raw.minWidth, 0),
    maxWidth: migrateDVNum(raw.maxWidth, 0),
    minHeight: migrateDVNum(raw.minHeight, 0),
    maxHeight: migrateDVNum(raw.maxHeight, 0),
    alignSelf: (raw.alignSelf as Frame['alignSelf']) || 'auto',
    // New CSS features (with safe defaults for old data)
    position: (raw.position as Frame['position']) || 'static',
    zIndex: migrateDVNum(raw.zIndex, 0),
    inset: migrateSpacing(raw.inset),
    bgImage: ((raw.bgImage as string) || '').startsWith('blob:') ? '' : (raw.bgImage as string) || '',
    bgSize: (raw.bgSize as Frame['bgSize']) || 'auto',
    bgPosition: (raw.bgPosition as Frame['bgPosition']) || 'center',
    bgRepeat: (raw.bgRepeat as Frame['bgRepeat']) || 'repeat',
    blur: migrateDVNum(raw.blur, 0),
    backdropBlur: migrateDVNum(raw.backdropBlur, 0),
    rotate: migrateDVNum(raw.rotate, 0),
    scaleVal: migrateDVNum(raw.scaleVal, 100),
    translateX: migrateDVNum(raw.translateX, 0),
    translateY: migrateDVNum(raw.translateY, 0),
    skewX: migrateDVNum(raw.skewX, 0),
    skewY: migrateDVNum(raw.skewY, 0),
    transformOrigin: (raw.transformOrigin as string) || 'center',
    transition: (raw.transition as Frame['transition']) || 'none',
    duration: migrateDVNum(raw.duration, 0),
    ease: (raw.ease as Frame['ease']) || 'linear',
    colSpan: migrateDVNum(raw.colSpan, 0),
    rowSpan: migrateDVNum(raw.rowSpan, 0),
  }

  // Re-parse tailwindClasses to extract recognized classes that got stuck as foreign
  // (e.g., files created before the sanitizer fix for border-t, mx-auto, mt-10, etc.)
  const rawTw = (raw.tailwindClasses as string) || ''
  if (rawTw) {
    const parsed = parseTailwindClasses(rawTw)
    base.tailwindClasses = parsed.tailwindClasses
    Object.assign(base, parsed.properties)
  }

  let result: Frame

  if (raw.type === 'text') {
    result = {
      ...base,
      type: 'text',
      content: (raw.content as string) || 'Text',
      ...migrateTextStyles(raw),
      tag: (raw.tag as TextElement['tag']) || 'p',
      href: (raw.href as string) || '',
    } as TextElement
  } else if (raw.type === 'image') {
    // Clear stale blob: URLs — they don't survive app restarts
    const rawSrc = (raw.src as string) || ''
    const src = rawSrc.startsWith('blob:') ? '' : rawSrc
    result = {
      ...base,
      type: 'image',
      src,
      alt: (raw.alt as string) || '',
      objectFit: (raw.objectFit as ImageElement['objectFit']) || 'cover',
    } as ImageElement
  } else if (raw.type === 'button') {
    result = {
      ...base,
      type: 'button',
      content: (raw.content as string) || (raw.label as string) || 'Button',
      ...migrateTextStyles(raw),
    } as ButtonElement
  } else if (raw.type === 'input') {
    result = {
      ...base,
      type: 'input',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      inputType: (raw.inputType as InputElement['inputType']) || 'text',
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as InputElement
  } else if (raw.type === 'textarea') {
    result = {
      ...base,
      type: 'textarea',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      rows: (raw.rows as number) ?? 3,
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as TextareaElement
  } else if (raw.type === 'select') {
    result = {
      ...base,
      type: 'select',
      options: (raw.options as SelectElement['options']) || [{ value: 'option-1', label: 'Option 1' }],
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as SelectElement
  } else {
    result = {
      ...base,
      type: 'box',
      tag: (raw.tag as BoxTag) || 'div',
      display: migrateDisplay(raw.display as string),
      direction: (raw.direction as BoxElement['direction']) || 'column',
      justify: (raw.justify as BoxElement['justify']) || 'start',
      align: (raw.align as BoxElement['align']) || 'stretch',
      gap: migrateDVNum(raw.gap, 0),
      wrap: (raw.wrap as boolean) ?? false,
      gridCols: migrateDVNum(raw.gridCols, 0),
      gridRows: migrateDVNum(raw.gridRows, 0),
      children: children.map(migrateFrame),
    } as BoxElement
  }

  // Preserve component instance data
  if (raw._componentId) result._componentId = raw._componentId as string
  if (raw._overrides) result._overrides = raw._overrides as Record<string, Record<string, unknown>>

  // Preserve responsive overrides
  if (raw.responsive && typeof raw.responsive === 'object') {
    result.responsive = raw.responsive as Frame['responsive']
  }

  // Final pass: normalizeFrame fills in any fields the manual migration missed
  // (e.g. new fields added to types that haven't been added to migrateFrame yet)
  return normalizeFrame(result)
}

// Migrate old data: if the saved root was a user frame (not internal root),
// wrap it inside the internal root so it becomes a child.
export function migrateToInternalRoot(saved: Record<string, unknown>, pageId: string): BoxElement {
  const migrated = migrateFrame(saved)
  if (isRootId(migrated.id) && migrated.type === 'box') {
    // Already has internal root — ensure tag is 'body' and ID matches page
    if ((migrated as BoxElement).tag !== 'body') {
      (migrated as BoxElement).tag = 'body'
    }
    ;(migrated as BoxElement).id = `__root__${pageId}`
    return migrated as BoxElement
  }
  // Old format: user's root becomes a child of the internal root
  return createInternalRoot(pageId, [migrated])
}
