import type { Frame, BoxElement, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, TextStyles, Spacing, Inset, SizeValue, BorderRadius, Border, DesignValue } from '../types/frame'
import { generateId } from './frameStore'

// --- DesignValue helpers ---
export function dvNum(v: number): DesignValue<number> {
  return { mode: 'custom', value: v }
}
export function dvTok(token: string, v: number): DesignValue<number> {
  return { mode: 'token', token, value: v }
}
export function dvStr(v: string): DesignValue<string> {
  return { mode: 'custom', value: v }
}

export function zeroSpacing(): Spacing {
  return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0) }
}

export function zeroInset(): Inset {
  return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0) }
}

export function zeroBorderRadius(): BorderRadius {
  return { topLeft: dvNum(0), topRight: dvNum(0), bottomRight: dvNum(0), bottomLeft: dvNum(0) }
}

export function uniformBorderRadius(v: number): BorderRadius {
  return { topLeft: dvNum(v), topRight: dvNum(v), bottomRight: dvNum(v), bottomLeft: dvNum(v) }
}

export const defaultBorder: Border = { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0), color: dvStr(''), style: 'none' }

// New CSS feature defaults — shared across all create functions
export function newFeatureDefaults() {
  return {
    position: 'static' as const,
    zIndex: dvNum(0),
    inset: zeroInset(),
    bgImage: '',
    bgSize: 'auto' as const,
    bgPosition: 'center' as const,
    bgRepeat: 'repeat' as const,
    blur: dvNum(0),
    backdropBlur: dvNum(0),
    rotate: dvNum(0),
    scaleVal: dvNum(100),
    translateX: dvNum(0),
    translateY: dvNum(0),
    transition: 'none' as const,
    duration: dvNum(0),
    ease: 'linear' as const,
    colSpan: dvNum(0),
    rowSpan: dvNum(0),
  }
}

export function defaultTextStyles(): TextStyles {
  return {
    fontSize: dvNum(16),
    fontWeight: dvNum(400),
    lineHeight: dvNum(0),     // 0 = inherit
    textAlign: 'left',
    textAlignVertical: 'start',
    fontStyle: 'normal',
    textDecoration: 'none',
    letterSpacing: dvNum(0),
    textTransform: 'none',
    whiteSpace: 'normal',
    fontFamily: 'sans',
  }
}

// --- Clone helpers ---
export function cloneDV<T>(dv: DesignValue<T> | undefined): DesignValue<T> | undefined {
  return dv ? { ...dv } : undefined
}

export function cloneSpacing(s: Spacing | undefined): Spacing | undefined {
  if (!s) return undefined
  return {
    top: migrateDVNum(s.top, 0),
    right: migrateDVNum(s.right, 0),
    bottom: migrateDVNum(s.bottom, 0),
    left: migrateDVNum(s.left, 0),
  }
}

export function cloneBorderRadius(br: BorderRadius | undefined): BorderRadius | undefined {
  if (!br) return undefined
  return { topLeft: cloneDV(br.topLeft)!, topRight: cloneDV(br.topRight)!, bottomRight: cloneDV(br.bottomRight)!, bottomLeft: cloneDV(br.bottomLeft)! }
}

export function cloneBorder(b: Border | undefined): Border | undefined {
  if (!b) return undefined
  return { top: cloneDV(b.top)!, right: cloneDV(b.right)!, bottom: cloneDV(b.bottom)!, left: cloneDV(b.left)!, color: cloneDV(b.color)!, style: b.style }
}

export function cloneSizeValue(sv: SizeValue | undefined): SizeValue | undefined {
  if (!sv) return undefined
  return { mode: sv.mode, value: cloneDV(sv.value)! }
}

// Deep clone helper
export function cloneTree(frame: Frame): Frame {
  const base = {
    ...frame,
    padding: cloneSpacing(frame.padding),
    margin: cloneSpacing(frame.margin),
    inset: cloneSpacing(frame.inset),
    width: cloneSizeValue(frame.width),
    height: cloneSizeValue(frame.height),
    grow: cloneDV(frame.grow),
    shrink: cloneDV(frame.shrink),
    border: cloneBorder(frame.border),
    borderRadius: cloneBorderRadius(frame.borderRadius),
    color: cloneDV(frame.color),
    bg: cloneDV(frame.bg),
    opacity: cloneDV(frame.opacity),
    minWidth: cloneDV(frame.minWidth),
    maxWidth: cloneDV(frame.maxWidth),
    minHeight: cloneDV(frame.minHeight),
    maxHeight: cloneDV(frame.maxHeight),
    zIndex: cloneDV(frame.zIndex),
    blur: cloneDV(frame.blur),
    backdropBlur: cloneDV(frame.backdropBlur),
    rotate: cloneDV(frame.rotate),
    scaleVal: cloneDV(frame.scaleVal),
    translateX: cloneDV(frame.translateX),
    translateY: cloneDV(frame.translateY),
    duration: cloneDV(frame.duration),
    colSpan: cloneDV(frame.colSpan),
    rowSpan: cloneDV(frame.rowSpan),
  }
  // Clone TextStyles DV fields for types that have them (box, text, button, input, textarea, select)
  const textClones = 'fontSize' in frame
    ? { fontSize: cloneDV(frame.fontSize), fontWeight: cloneDV(frame.fontWeight), lineHeight: cloneDV(frame.lineHeight), letterSpacing: cloneDV(frame.letterSpacing) }
    : {}
  if (frame.type === 'box') {
    return { ...base, ...textClones, type: 'box', gap: cloneDV(frame.gap), gridCols: cloneDV(frame.gridCols), gridRows: cloneDV(frame.gridRows), children: frame.children.map(cloneTree) } as BoxElement
  }
  if ('fontSize' in frame) {
    return { ...base, ...textClones } as Frame
  }
  return base as Frame
}

// --- Create functions ---

export function createInternalRoot(pageId: string, children: Frame[] = []): BoxElement {
  return {
    id: `__root__${pageId}`,
    type: 'box',
    name: '__root__',
    hidden: false,
    className: '',
    htmlId: '',
    tag: 'body',
    display: 'block',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: dvNum(0),
    wrap: false,
    gridCols: dvNum(0),
    gridRows: dvNum(0),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: { mode: 'token', token: 'white', value: '#ffffff' },
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    children,
  }
}

export function createBox(overrides?: Partial<BoxElement>): BoxElement {
  const id = generateId()
  return {
    id,
    type: 'box',
    name: overrides?.name || `frame-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    tag: overrides?.tag || 'div',
    display: 'block',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: dvNum(0),
    wrap: false,
    gridCols: dvNum(0),
    gridRows: dvNum(0),
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    children: [],
    ...overrides,
  }
}

export function createText(overrides?: Partial<TextElement>): TextElement {
  const id = generateId()
  return {
    id,
    type: 'text',
    name: overrides?.name || `text-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    content: 'Text',
    ...defaultTextStyles(),
    tag: 'p',
    href: '',
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

export function createImage(overrides?: Partial<ImageElement>): ImageElement {
  const id = generateId()
  return {
    id,
    type: 'image',
    name: overrides?.name || `image-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    src: '',
    alt: '',
    objectFit: 'cover',
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

export function createButton(overrides?: Partial<ButtonElement>): ButtonElement {
  const id = generateId()
  return {
    id,
    type: 'button',
    name: overrides?.name || `button-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    content: 'Button',
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

export function createInput(overrides?: Partial<InputElement>): InputElement {
  const id = generateId()
  return {
    id,
    type: 'input',
    name: overrides?.name || `input-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    placeholder: 'Placeholder',
    inputType: 'text',
    disabled: false,
    checked: false,
    inputName: '',
    inputValue: '',
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

export function createTextarea(overrides?: Partial<TextareaElement>): TextareaElement {
  const id = generateId()
  return {
    id,
    type: 'textarea',
    name: overrides?.name || `textarea-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    placeholder: 'Placeholder',
    rows: 3,
    disabled: false,
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

export function createLink(overrides?: Partial<TextElement>): TextElement {
  const id = generateId()
  return {
    ...createText({ name: `link-${id.split('-')[1]}`, ...overrides }),
    id,
    tag: 'a',
    href: overrides?.href || '#',
    content: overrides?.content || 'Link',
    color: dvStr('#2563eb'),
    ...overrides,
  }
}

export function createSelect(overrides?: Partial<SelectElement>): SelectElement {
  const id = generateId()
  return {
    id,
    type: 'select',
    name: overrides?.name || `select-${id.split('-')[1]}`,
    hidden: false,
    className: '',
    htmlId: '',
    options: [{ value: 'option-1', label: 'Option 1' }],
    disabled: false,
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    color: dvStr(''),
    bg: dvStr(''),
    border: { ...defaultBorder },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...newFeatureDefaults(),
    ...overrides,
  }
}

/** Normalize a potentially incomplete frame (e.g. from external JSON) by filling in
 *  missing fields with defaults based on its type. Recurses into children. */
export function normalizeFrame(frame: Frame): Frame {
  const creators: Record<string, (o?: Partial<any>) => Frame> = {
    box: createBox, text: createText, image: createImage, button: createButton,
    input: createInput, textarea: createTextarea, select: createSelect, link: createLink,
  }
  const create = creators[frame.type] || creators.text
  // Migrate old border format (pattern data / .caja files may have { width } instead of { top/right/bottom/left })
  const migrated: Record<string, unknown> = { ...frame }
  if (migrated.border && typeof migrated.border === 'object') {
    migrated.border = migrateBorder(migrated.border)
  }
  if (frame.type === 'box') {
    const children = (frame as BoxElement).children?.map(normalizeFrame) || []
    return create({ ...migrated, children } as Partial<any>)
  }
  return create(migrated as Partial<any>)
}

// --- Inline migration helpers needed by normalizeFrame and cloneSpacing ---
// Full migration module is in ./frameMigration.ts; these are the minimal
// helpers needed here to avoid circular imports.

function migrateDVNum(raw: unknown, fallback: number): DesignValue<number> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<number>
  if (typeof raw === 'number') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}

function migrateBorder(raw: unknown): Border {
  if (!raw || typeof raw !== 'object') return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0), color: dvStr(''), style: 'none' }
  const r = raw as Record<string, unknown>
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

function migrateDVStr(raw: unknown, fallback: string): DesignValue<string> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<string>
  if (typeof raw === 'string') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}
