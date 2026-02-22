import { create } from 'zustand'
import type { Frame, BoxElement, BoxTag, BoxDisplay, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, TextStyles, Spacing, SizeValue, BorderRadius, Border, DesignValue } from '../types/frame'

// The internal root ID — never exposed to the user
const INTERNAL_ROOT_ID = '__root__'

let nextId = 1
export function generateId(): string {
  return `frame-${nextId++}`
}

// Collect all names in the tree
function collectNames(frame: Frame): Set<string> {
  const names = new Set<string>()
  names.add(frame.name)
  if (frame.type === 'box') {
    for (const child of frame.children) {
      for (const n of collectNames(child)) names.add(n)
    }
  }
  return names
}

// Find the lowest available number for a given prefix
function nextName(prefix: string, root: Frame): string {
  const names = collectNames(root)
  let i = 1
  while (names.has(`${prefix}-${i}`)) i++
  return `${prefix}-${i}`
}

// --- DesignValue helpers ---
function dvNum(v: number): DesignValue<number> {
  return { mode: 'custom', value: v }
}
function dvStr(v: string): DesignValue<string> {
  return { mode: 'custom', value: v }
}

function zeroSpacing(): Spacing {
  return { top: dvNum(0), right: dvNum(0), bottom: dvNum(0), left: dvNum(0) }
}

function zeroBorderRadius(): BorderRadius {
  return { topLeft: dvNum(0), topRight: dvNum(0), bottomRight: dvNum(0), bottomLeft: dvNum(0) }
}

function uniformBorderRadius(v: number): BorderRadius {
  return { topLeft: dvNum(v), topRight: dvNum(v), bottomRight: dvNum(v), bottomLeft: dvNum(v) }
}

const defaultBorder: Border = { width: dvNum(0), color: dvStr(''), style: 'none' }

function defaultTextStyles(): TextStyles {
  return {
    fontSize: { mode: 'token', token: 'sm', value: 14 },
    fontWeight: { mode: 'token', token: 'normal', value: 400 },
    lineHeight: { mode: 'token', token: 'normal', value: 1.5 },
    color: dvStr('#000000'),
    textAlign: 'left',
    fontStyle: 'normal',
    textDecoration: 'none',
    letterSpacing: dvNum(0),
    textTransform: 'none',
    whiteSpace: 'normal',
    fontFamily: '', // [Experimental] Google Fonts — empty = inherit/system
  }
}

function cloneDV<T>(dv: DesignValue<T>): DesignValue<T> {
  return { ...dv }
}

function cloneSpacing(s: Spacing): Spacing {
  return { top: cloneDV(s.top), right: cloneDV(s.right), bottom: cloneDV(s.bottom), left: cloneDV(s.left) }
}

function cloneBorderRadius(br: BorderRadius): BorderRadius {
  return { topLeft: cloneDV(br.topLeft), topRight: cloneDV(br.topRight), bottomRight: cloneDV(br.bottomRight), bottomLeft: cloneDV(br.bottomLeft) }
}

function cloneBorder(b: Border): Border {
  return { width: cloneDV(b.width), color: cloneDV(b.color), style: b.style }
}

function cloneSizeValue(sv: SizeValue): SizeValue {
  return { mode: sv.mode, value: cloneDV(sv.value) }
}

function createInternalRoot(children: Frame[] = []): BoxElement {
  return {
    id: INTERNAL_ROOT_ID,
    type: 'box',
    name: '__root__',
    hidden: false,
    className: '',
    htmlId: '',
    tag: 'body',
    display: 'flex',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: dvNum(0),
    wrap: false,
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'fill', value: dvNum(0) },
    height: { mode: 'fill', value: dvNum(0) },
    grow: dvNum(1),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr('#ffffff'),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    display: 'flex',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: dvNum(0),
    wrap: false,
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'default', value: dvNum(0) },
    height: { mode: 'default', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    width: { mode: 'fixed', value: dvNum(200) },
    height: { mode: 'fixed', value: dvNum(150) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    placeholder: 'Placeholder...',
    inputType: 'text',
    disabled: false,
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'fill', value: dvNum(0) },
    height: { mode: 'hug', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    placeholder: 'Placeholder...',
    rows: 3,
    disabled: false,
    ...defaultTextStyles(),
    padding: zeroSpacing(),
    margin: zeroSpacing(),
    width: { mode: 'fill', value: dvNum(0) },
    height: { mode: 'hug', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
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
    width: { mode: 'fill', value: dvNum(0) },
    height: { mode: 'hug', value: dvNum(0) },
    grow: dvNum(0),
    shrink: dvNum(1),
    overflow: 'visible',
    opacity: dvNum(100),
    bg: dvStr(''),
    border: { ...defaultBorder, width: dvNum(0), color: dvStr('') },
    borderRadius: zeroBorderRadius(),
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: dvNum(0),
    maxWidth: dvNum(0),
    minHeight: dvNum(0),
    maxHeight: dvNum(0),
    alignSelf: 'auto',
    ...overrides,
  }
}

// Deep clone helper
function cloneTree(frame: Frame): Frame {
  const base = {
    ...frame,
    padding: cloneSpacing(frame.padding),
    margin: cloneSpacing(frame.margin),
    width: cloneSizeValue(frame.width),
    height: cloneSizeValue(frame.height),
    grow: cloneDV(frame.grow),
    shrink: cloneDV(frame.shrink),
    border: cloneBorder(frame.border),
    borderRadius: cloneBorderRadius(frame.borderRadius),
    bg: cloneDV(frame.bg),
    opacity: cloneDV(frame.opacity),
    minWidth: cloneDV(frame.minWidth),
    maxWidth: cloneDV(frame.maxWidth),
    minHeight: cloneDV(frame.minHeight),
    maxHeight: cloneDV(frame.maxHeight),
  }
  if (frame.type === 'box') {
    return { ...base, type: 'box', gap: cloneDV(frame.gap), children: frame.children.map(cloneTree) } as BoxElement
  }
  // Clone TextStyles DV fields for all text-capable types
  if (frame.type !== 'box' && frame.type !== 'image') {
    const textClones = { fontSize: cloneDV(frame.fontSize), fontWeight: cloneDV(frame.fontWeight), lineHeight: cloneDV(frame.lineHeight), color: cloneDV(frame.color), letterSpacing: cloneDV(frame.letterSpacing) }
    return { ...base, ...textClones } as Frame
  }
  return base as Frame
}

// Get children (text and image elements have none)
function getChildren(frame: Frame): Frame[] {
  return frame.type === 'box' ? frame.children : []
}

// Set children on a frame (only works for box)
function withChildren(frame: Frame, children: Frame[]): Frame {
  if (frame.type === 'box') return { ...frame, children }
  return frame
}

// Find and update a frame in the tree by id
function updateInTree(root: Frame, id: string, updater: (f: Frame) => Frame): Frame {
  if (root.id === id) {
    return updater(cloneTree(root))
  }
  return withChildren(
    root,
    getChildren(root).map((child) => updateInTree(child, id, updater))
  )
}

// Add a child frame to a parent by id
function addChildInTree(root: Frame, parentId: string, child: Frame): Frame {
  if (root.id === parentId && root.type === 'box') {
    return { ...root, children: [...root.children, child] }
  }
  return withChildren(
    root,
    getChildren(root).map((c) => addChildInTree(c, parentId, child))
  )
}

// Remove a frame from the tree by id (never removes internal root)
function removeFromTree(root: Frame, id: string): Frame {
  if (root.id === id) return root // safety: never remove the tree root itself
  return withChildren(
    root,
    getChildren(root)
      .map((child) => {
        if (child.id === id) return null
        return removeFromTree(child, id)
      })
      .filter((c): c is Frame => c !== null)
  )
}

// Move a frame: remove from old position, insert into new parent at index
function moveInTree(root: Frame, frameId: string, newParentId: string, index: number): Frame {
  let extracted: Frame | null = null
  function extract(node: Frame): Frame {
    return withChildren(
      node,
      getChildren(node)
        .filter((c) => {
          if (c.id === frameId) {
            extracted = c
            return false
          }
          return true
        })
        .map(extract)
    )
  }
  const result = extract(root)
  if (!extracted) return root

  function insert(node: Frame): Frame {
    if (node.id === newParentId && node.type === 'box') {
      const children = [...node.children]
      children.splice(index, 0, extracted!)
      return { ...node, children }
    }
    return withChildren(node, getChildren(node).map(insert))
  }
  return insert(result)
}

// Find a frame by id — exported for reuse across mcp, components, etc.
export function findInTree(root: Frame, id: string): Frame | null {
  if (root.id === id) return root
  for (const child of getChildren(root)) {
    const found = findInTree(child, id)
    if (found) return found
  }
  return null
}

// Deep clone with new IDs (for duplication)
function cloneWithNewIds(frame: Frame): Frame {
  const newId = generateId()
  const cloned = cloneTree(frame)
  const base = {
    ...cloned,
    id: newId,
    name: frame.name,
  }
  if (frame.type === 'box') {
    return { ...base, type: 'box', children: frame.children.map(cloneWithNewIds) } as BoxElement
  }
  return base as Frame
}

// Find parent of a frame
function findParent(root: Frame, id: string): BoxElement | null {
  if (root.type !== 'box') return null
  for (const child of root.children) {
    if (child.id === id) return root
    const found = findParent(child, id)
    if (found) return found
  }
  return null
}

// Duplicate a frame next to itself
function duplicateInTree(root: Frame, id: string): { tree: Frame; newId: string } | null {
  const target = findInTree(root, id)
  if (!target) return null
  if (target.id === INTERNAL_ROOT_ID) return null // can't duplicate internal root
  const clone = cloneWithNewIds(target)
  const parent = findParent(root, id)
  if (!parent) return null

  const idx = parent.children.findIndex((c) => c.id === id)

  function insert(node: Frame): Frame {
    if (node.id === parent!.id && node.type === 'box') {
      const children = [...node.children]
      children.splice(idx + 1, 0, clone)
      return { ...node, children }
    }
    return withChildren(node, getChildren(node).map(insert))
  }

  return { tree: insert(root), newId: clone.id }
}

// Wrap a frame in a new parent frame
function wrapInFrameInTree(root: Frame, id: string): { tree: Frame; wrapperId: string } | null {
  const target = findInTree(root, id)
  if (!target) return null
  if (target.id === INTERNAL_ROOT_ID) return null // can't wrap internal root
  const parent = findParent(root, id)
  if (!parent) return null

  const wrapper = createBox({ children: [target] })

  function replace(node: Frame): Frame {
    if (node.id === parent!.id && node.type === 'box') {
      return {
        ...node,
        children: node.children.map((c) => (c.id === id ? wrapper : c)),
      }
    }
    return withChildren(node, getChildren(node).map(replace))
  }

  return { tree: replace(root), wrapperId: wrapper.id }
}

// Max id for restoring nextId from localStorage
function maxIdInTree(frame: Frame): number {
  const num = parseInt(frame.id.split('-')[1] || '0')
  const childMax = getChildren(frame).map(maxIdInTree)
  return Math.max(isNaN(num) ? 0 : num, ...childMax, 0)
}

// --- Migration helpers ---
function migrateDVNum(raw: unknown, fallback: number): DesignValue<number> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<number>
  if (typeof raw === 'number') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}

function migrateDVStr(raw: unknown, fallback: string): DesignValue<string> {
  if (raw !== null && raw !== undefined && typeof raw === 'object' && 'mode' in raw) return raw as DesignValue<string>
  if (typeof raw === 'string') return { mode: 'custom', value: raw }
  return { mode: 'custom', value: fallback }
}

function migrateSpacing(raw: unknown): Spacing {
  if (!raw || typeof raw !== 'object') return zeroSpacing()
  const r = raw as Record<string, unknown>
  return {
    top: migrateDVNum(r.top, 0),
    right: migrateDVNum(r.right, 0),
    bottom: migrateDVNum(r.bottom, 0),
    left: migrateDVNum(r.left, 0),
  }
}

function migrateBorderRadius(raw: unknown): BorderRadius {
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

function migrateBorder(raw: unknown): Border {
  if (!raw || typeof raw !== 'object') return { width: dvNum(0), color: dvStr(''), style: 'none' }
  const r = raw as Record<string, unknown>
  return {
    width: migrateDVNum(r.width, 0),
    color: migrateDVStr(r.color, ''),
    style: (r.style as Border['style']) || 'none',
  }
}

function migrateSizeValue(raw: unknown): SizeValue {
  if (!raw || typeof raw !== 'object') return { mode: 'default', value: dvNum(0) }
  const r = raw as Record<string, unknown>
  const mode = (r.mode as string) === 'auto' ? 'default' : (r.mode as SizeValue['mode']) || 'default'
  return { mode, value: migrateDVNum(r.value, 0) }
}

function migrateTextStyles(raw: Record<string, unknown>): TextStyles {
  return {
    fontSize: migrateDVNum(raw.fontSize, 14),
    fontWeight: migrateDVNum(raw.fontWeight, 400),
    lineHeight: migrateDVNum(raw.lineHeight, 1.5),
    color: migrateDVStr(raw.color, '#000000'),
    textAlign: (raw.textAlign as TextStyles['textAlign']) || 'left',
    fontStyle: (raw.fontStyle as TextStyles['fontStyle']) || 'normal',
    textDecoration: (raw.textDecoration as TextStyles['textDecoration']) || 'none',
    letterSpacing: migrateDVNum(raw.letterSpacing, 0),
    textTransform: (raw.textTransform as TextStyles['textTransform']) || 'none',
    whiteSpace: (raw.whiteSpace as TextStyles['whiteSpace']) || 'normal',
    fontFamily: (raw.fontFamily as string) || '', // [Experimental] Google Fonts
  }
}

// Migrate old format data to current schema
function migrateFrame(raw: Record<string, unknown>): Frame {
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
    bg: migrateDVStr(raw.bg, ''),
    border: migrateBorder(raw.border),
    borderRadius: migrateBorderRadius(raw.borderRadius),
    tailwindClasses: (raw.tailwindClasses as string) || '',
    boxShadow: (raw.boxShadow as Frame['boxShadow']) || 'none',
    cursor: (raw.cursor as Frame['cursor']) || 'auto',
    minWidth: migrateDVNum(raw.minWidth, 0),
    maxWidth: migrateDVNum(raw.maxWidth, 0),
    minHeight: migrateDVNum(raw.minHeight, 0),
    maxHeight: migrateDVNum(raw.maxHeight, 0),
    alignSelf: (raw.alignSelf as Frame['alignSelf']) || 'auto',
  }

  if (raw.type === 'text') {
    return {
      ...base,
      type: 'text',
      content: (raw.content as string) || 'Text',
      ...migrateTextStyles(raw),
      tag: (raw.tag as TextElement['tag']) || 'p',
      href: (raw.href as string) || '',
    } as TextElement
  }

  if (raw.type === 'image') {
    return {
      ...base,
      type: 'image',
      src: (raw.src as string) || '',
      alt: (raw.alt as string) || '',
      objectFit: (raw.objectFit as ImageElement['objectFit']) || 'cover',
    } as ImageElement
  }

  if (raw.type === 'button') {
    return {
      ...base,
      type: 'button',
      content: (raw.content as string) || (raw.label as string) || 'Button',
      ...migrateTextStyles(raw),
    } as ButtonElement
  }

  if (raw.type === 'input') {
    return {
      ...base,
      type: 'input',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      inputType: (raw.inputType as InputElement['inputType']) || 'text',
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as InputElement
  }

  if (raw.type === 'textarea') {
    return {
      ...base,
      type: 'textarea',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      rows: (raw.rows as number) ?? 3,
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as TextareaElement
  }

  if (raw.type === 'select') {
    return {
      ...base,
      type: 'select',
      options: (raw.options as SelectElement['options']) || [{ value: 'option-1', label: 'Option 1' }],
      disabled: (raw.disabled as boolean) ?? false,
      ...migrateTextStyles(raw),
    } as SelectElement
  }

  return {
    ...base,
    type: 'box',
    tag: (raw.tag as BoxTag) || 'div',
    display: (raw.display as BoxDisplay) || 'flex',
    direction: (raw.direction as BoxElement['direction']) || 'column',
    justify: (raw.justify as BoxElement['justify']) || 'start',
    align: (raw.align as BoxElement['align']) || 'stretch',
    gap: migrateDVNum(raw.gap, 0),
    wrap: (raw.wrap as boolean) ?? false,
    children: children.map(migrateFrame),
  } as BoxElement
}

// Migrate old data: if the saved root was a user frame (not internal root),
// wrap it inside the internal root so it becomes a child.
export function migrateToInternalRoot(saved: Record<string, unknown>): BoxElement {
  const migrated = migrateFrame(saved)
  if (migrated.id === INTERNAL_ROOT_ID && migrated.type === 'box') {
    // Already has internal root — ensure tag is 'body'
    if ((migrated as BoxElement).tag !== 'body') {
      (migrated as BoxElement).tag = 'body'
    }
    return migrated as BoxElement
  }
  // Old format: user's root becomes a child of the internal root
  return createInternalRoot([migrated])
}

const MAX_HISTORY = 50

interface FrameStore {
  root: BoxElement
  selectedId: string | null
  selectedIds: Set<string>
  hoveredId: string | null
  collapsedIds: Set<string>
  filePath: string | null
  dirty: boolean
  showSpacingOverlays: boolean
  showOverlayValues: boolean
  previewMode: boolean
  canvasWidth: number | null
  iframeWindow: Window | null
  canvasZoom: number
  mcpConnected: boolean
  canvasDragId: string | null
  canvasDragOver: { parentId: string; index: number } | null

  past: BoxElement[]
  future: BoxElement[]

  select: (id: string | null) => void
  selectMulti: (id: string) => void
  removeSelected: () => void
  hover: (id: string | null) => void
  toggleCollapse: (id: string) => void
  toggleHidden: (id: string) => void

  addChild: (parentId: string, type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link', overrides?: Partial<Frame>) => void
  removeFrame: (id: string) => void
  duplicateFrame: (id: string) => void
  wrapInFrame: (id: string) => void
  moveFrame: (frameId: string, newParentId: string, index: number) => void
  reorderFrame: (frameId: string, direction: 'up' | 'down') => void
  updateFrame: (id: string, updates: Partial<Frame>) => void
  updateSpacing: (id: string, field: 'padding' | 'margin', values: Partial<Spacing>) => void
  updateSize: (id: string, dimension: 'width' | 'height', size: Partial<SizeValue>) => void
  updateBorderRadius: (id: string, values: Partial<BorderRadius>) => void
  renameFrame: (id: string, name: string) => void

  undo: () => void
  redo: () => void

  getSelected: () => Frame | null
  getParentDirection: (id: string) => 'row' | 'column'
  getRootId: () => string
  loadFromStorage: () => void
  loadFromFile: (root: BoxElement, filePath: string) => void
  setFilePath: (path: string | null) => void
  markClean: () => void
  toggleSpacingOverlays: () => void
  toggleOverlayValues: () => void
  setSpacingOverlays: (value: boolean) => void
  setOverlayValues: (value: boolean) => void
  togglePreviewMode: () => void
  setPreviewMode: (value: boolean) => void
  setCanvasWidth: (width: number | null) => void
  setIframeWindow: (win: Window | null) => void
  setCanvasZoom: (zoom: number) => void
  setCanvasDrag: (id: string | null) => void
  setCanvasDragOver: (over: { parentId: string; index: number } | null) => void
  expandToFrame: (id: string) => void
}

const VIEW_PREFS_KEY = 'caja-view-prefs'

interface ViewPrefs {
  showSpacingOverlays: boolean
  showOverlayValues: boolean
  previewMode: boolean
  canvasWidth: number | null
}

function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(VIEW_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        showSpacingOverlays: parsed.showSpacingOverlays ?? true,
        showOverlayValues: parsed.showOverlayValues ?? false,
        previewMode: parsed.previewMode ?? false,
        canvasWidth: parsed.canvasWidth ?? null,
      }
    }
  } catch { /* ignore */ }
  return { showSpacingOverlays: true, showOverlayValues: false, previewMode: false, canvasWidth: null }
}

function saveViewPrefs(prefs: ViewPrefs) {
  localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs))
}

const initialViewPrefs = loadViewPrefs()

function pushHistory(state: { root: BoxElement; past: BoxElement[]; future: BoxElement[] }) {
  return {
    past: [...state.past.slice(-(MAX_HISTORY - 1)), cloneTree(state.root) as BoxElement],
    future: [] as BoxElement[],
    dirty: true,
  }
}

export const useFrameStore = create<FrameStore>((set, get) => ({
  root: createInternalRoot(),
  selectedId: null,
  selectedIds: new Set<string>(),
  hoveredId: null,
  collapsedIds: new Set(),
  filePath: null,
  dirty: false,
  showSpacingOverlays: initialViewPrefs.showSpacingOverlays,
  showOverlayValues: initialViewPrefs.showOverlayValues,
  previewMode: initialViewPrefs.previewMode,
  canvasWidth: initialViewPrefs.canvasWidth,
  iframeWindow: null,
  canvasZoom: 1,
  mcpConnected: false,
  canvasDragId: null,
  canvasDragOver: null,
  past: [],
  future: [],

  select: (id) => set({ selectedId: id, selectedIds: new Set(id ? [id] : []) }),

  selectMulti: (id) => set((state) => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) {
      next.delete(id)
      const newPrimary = next.size > 0 ? [...next][next.size - 1] : null
      return { selectedIds: next, selectedId: state.selectedId === id ? newPrimary : state.selectedId }
    } else {
      next.add(id)
      return { selectedIds: next, selectedId: id }
    }
  }),

  removeSelected: () => set((state) => {
    const ids = new Set(state.selectedIds)
    if (state.selectedId) ids.add(state.selectedId)
    if (ids.size === 0) return {}
    const history = pushHistory(state)
    let root = state.root
    for (const id of ids) {
      if (id === INTERNAL_ROOT_ID) continue
      root = removeFromTree(root, id) as BoxElement
    }
    return { root, selectedId: null, selectedIds: new Set(), ...history }
  }),

  hover: (id) => set({ hoveredId: id }),

  toggleCollapse: (id) =>
    set((state) => {
      const next = new Set(state.collapsedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { collapsedIds: next }
    }),

  toggleHidden: (id) =>
    set((state) => {
      const frame = findInTree(state.root, id)
      if (!frame) return {}
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({ ...f, hidden: !f.hidden })) as BoxElement,
        ...history,
      }
    }),

  addChild: (parentId, type, overrides) =>
    set((state) => {
      const prefixMap = { text: 'text', image: 'image', button: 'button', input: 'input', textarea: 'textarea', select: 'select', link: 'link', box: 'frame' } as const
      const prefix = prefixMap[type]
      const name = overrides?.name || nextName(prefix, state.root)
      const child =
        type === 'text' ? createText({ name, ...overrides } as Partial<TextElement>)
        : type === 'image' ? createImage({ name, ...overrides } as Partial<ImageElement>)
        : type === 'button' ? createButton({ name, ...overrides } as Partial<ButtonElement>)
        : type === 'input' ? createInput({ name, ...overrides } as Partial<InputElement>)
        : type === 'textarea' ? createTextarea({ name, ...overrides } as Partial<TextareaElement>)
        : type === 'select' ? createSelect({ name, ...overrides } as Partial<SelectElement>)
        : type === 'link' ? createLink({ name, ...overrides } as Partial<TextElement>)
        : createBox({ name, ...overrides } as Partial<BoxElement>)
      const history = pushHistory(state)
      return {
        root: addChildInTree(state.root, parentId, child) as BoxElement,
        selectedId: child.id,
        selectedIds: new Set([child.id]),
        ...history,
      }
    }),

  removeFrame: (id) =>
    set((state) => {
      if (id === INTERNAL_ROOT_ID) return {} // never remove internal root
      const history = pushHistory(state)
      const nextIds = new Set(state.selectedIds)
      nextIds.delete(id)
      return {
        root: removeFromTree(state.root, id) as BoxElement,
        selectedId: state.selectedId === id ? null : state.selectedId,
        selectedIds: nextIds,
        ...history,
      }
    }),

  duplicateFrame: (id) =>
    set((state) => {
      const result = duplicateInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { root: result.tree as BoxElement, selectedId: result.newId, ...history }
    }),

  wrapInFrame: (id) =>
    set((state) => {
      const result = wrapInFrameInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { root: result.tree as BoxElement, selectedId: result.wrapperId, ...history }
    }),

  moveFrame: (frameId, newParentId, index) =>
    set((state) => {
      if (frameId === INTERNAL_ROOT_ID) return {}
      const history = pushHistory(state)
      return {
        root: moveInTree(state.root, frameId, newParentId, index) as BoxElement,
        ...history,
      }
    }),

  reorderFrame: (frameId, direction) =>
    set((state) => {
      if (frameId === INTERNAL_ROOT_ID) return {}
      const parent = findParent(state.root, frameId)
      if (!parent) return {}
      const idx = parent.children.findIndex((c) => c.id === frameId)
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= parent.children.length) return {}
      const history = pushHistory(state)
      return {
        root: moveInTree(state.root, frameId, parent.id, newIdx) as BoxElement,
        ...history,
      }
    }),

  updateFrame: (id, updates) =>
    set((state) => {
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({ ...f, ...updates } as Frame)) as BoxElement,
        ...history,
      }
    }),

  updateSpacing: (id, field, values) =>
    set((state) => {
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({
          ...f,
          [field]: { ...f[field], ...values },
        })) as BoxElement,
        ...history,
      }
    }),

  updateSize: (id, dimension, size) =>
    set((state) => {
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({
          ...f,
          [dimension]: { ...f[dimension], ...size },
        })) as BoxElement,
        ...history,
      }
    }),

  updateBorderRadius: (id, values) =>
    set((state) => {
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({
          ...f,
          borderRadius: { ...f.borderRadius, ...values },
        })) as BoxElement,
        ...history,
      }
    }),

  renameFrame: (id, name) =>
    set((state) => {
      const history = pushHistory(state)
      return {
        root: updateInTree(state.root, id, (f) => ({ ...f, name })) as BoxElement,
        ...history,
      }
    }),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {}
      const prev = state.past[state.past.length - 1]
      return {
        root: prev,
        past: state.past.slice(0, -1),
        future: [cloneTree(state.root) as BoxElement, ...state.future],
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {}
      const next = state.future[0]
      return {
        root: next,
        past: [...state.past, cloneTree(state.root) as BoxElement],
        future: state.future.slice(1),
      }
    }),

  getSelected: () => {
    const { root, selectedId } = get()
    if (!selectedId) return null
    return findInTree(root, selectedId)
  },

  getParentDirection: (id) => {
    const parent = findParent(get().root, id)
    return parent?.direction ?? 'column'
  },

  getRootId: () => INTERNAL_ROOT_ID,

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem('caja-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.root) {
          const root = migrateToInternalRoot(parsed.root)
          nextId = maxIdInTree(root) + 1
          set({ root, past: [], future: [] })
        }
      }
    } catch {
      localStorage.removeItem('caja-state')
    }
  },

  loadFromFile: (root, filePath) => {
    nextId = maxIdInTree(root) + 1
    set({ root, filePath, dirty: false, selectedId: null, selectedIds: new Set(), past: [], future: [] })
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ dirty: false }),
  toggleSpacingOverlays: () => set((s) => {
    const next = !s.showSpacingOverlays
    saveViewPrefs({ showSpacingOverlays: next, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: s.canvasWidth })
    return { showSpacingOverlays: next }
  }),
  toggleOverlayValues: () => set((s) => {
    const next = !s.showOverlayValues
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: next, previewMode: s.previewMode, canvasWidth: s.canvasWidth })
    return { showOverlayValues: next }
  }),
  setSpacingOverlays: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: value, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: s.canvasWidth })
    return { showSpacingOverlays: value }
  }),
  setOverlayValues: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: value, previewMode: s.previewMode, canvasWidth: s.canvasWidth })
    return { showOverlayValues: value }
  }),
  togglePreviewMode: () => set((s) => {
    const next = !s.previewMode
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: next, canvasWidth: s.canvasWidth })
    return { previewMode: next, ...(next ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setPreviewMode: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: value, canvasWidth: s.canvasWidth })
    return { previewMode: value, ...(value ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setCanvasWidth: (width) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: width })
    return { canvasWidth: width }
  }),
  setIframeWindow: (win) => set({ iframeWindow: win }),
  setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
  setCanvasDrag: (id) => set({ canvasDragId: id }),
  setCanvasDragOver: (over) => set({ canvasDragOver: over }),

  expandToFrame: (id) => set((state) => {
    const ancestors: string[] = []
    let current = findParent(state.root, id)
    while (current) {
      ancestors.push(current.id)
      current = findParent(state.root, current.id)
    }
    if (ancestors.length === 0) return {}
    const next = new Set(state.collapsedIds)
    let changed = false
    for (const aid of ancestors) {
      if (next.has(aid)) {
        next.delete(aid)
        changed = true
      }
    }
    return changed ? { collapsedIds: next } : {}
  }),
}))

// Auto-save
let saveTimeout: ReturnType<typeof setTimeout>
useFrameStore.subscribe((state) => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    localStorage.setItem('caja-state', JSON.stringify({ root: state.root }))
  }, 500)
})
