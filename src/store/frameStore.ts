import { create } from 'zustand'
import type { Frame, BoxElement, BoxTag, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, Spacing, SizeValue, BorderRadius } from '../types/frame'

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

const defaultSpacing: Spacing = { top: 0, right: 0, bottom: 0, left: 0 }
const defaultBorder = { width: 0, color: '', style: 'none' as const }
const defaultBorderRadius: BorderRadius = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }

function createInternalRoot(children: Frame[] = []): BoxElement {
  return {
    id: INTERNAL_ROOT_ID,
    type: 'box',
    name: '__root__',
    tag: 'div',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: 0,
    wrap: false,
    padding: { ...defaultSpacing },
    margin: { ...defaultSpacing },
    width: { mode: 'fill', value: 0 },
    height: { mode: 'fill', value: 0 },
    grow: 1,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '#ffffff',
    border: { ...defaultBorder },
    borderRadius: { ...defaultBorderRadius },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
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
    tag: overrides?.tag || 'div',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: 0,
    wrap: false,
    padding: { ...defaultSpacing },
    margin: { ...defaultSpacing },
    width: { mode: 'default', value: 0 },
    height: { mode: 'default', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '',
    border: { ...defaultBorder },
    borderRadius: { ...defaultBorderRadius },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
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
    content: 'Text',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    color: '#000000',
    textAlign: 'left',
    fontStyle: 'normal',
    textDecoration: 'none',
    letterSpacing: 0,
    textTransform: 'none',
    whiteSpace: 'normal',
    tag: 'p',
    href: '',
    padding: { ...defaultSpacing },
    margin: { ...defaultSpacing },
    width: { mode: 'default', value: 0 },
    height: { mode: 'default', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '',
    border: { ...defaultBorder },
    borderRadius: { ...defaultBorderRadius },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
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
    src: '',
    alt: '',
    objectFit: 'cover',
    padding: { ...defaultSpacing },
    margin: { ...defaultSpacing },
    width: { mode: 'fixed', value: 200 },
    height: { mode: 'fixed', value: 150 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '',
    border: { ...defaultBorder },
    borderRadius: { ...defaultBorderRadius },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
    alignSelf: 'auto',
    ...overrides,
  }
}

const buttonPadding: Spacing = { top: 8, right: 16, bottom: 8, left: 16 }

export function createButton(overrides?: Partial<ButtonElement>): ButtonElement {
  const id = generateId()
  return {
    id,
    type: 'button',
    name: overrides?.name || `button-${id.split('-')[1]}`,
    label: 'Button',
    variant: 'filled',
    padding: { ...buttonPadding },
    margin: { ...defaultSpacing },
    width: { mode: 'hug', value: 0 },
    height: { mode: 'hug', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '#18181b',
    border: { ...defaultBorder },
    borderRadius: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
    alignSelf: 'auto',
    ...overrides,
  }
}

const formBorder = { width: 1, color: '#d1d5db', style: 'solid' as const }
const formPadding: Spacing = { top: 8, right: 12, bottom: 8, left: 12 }

export function createInput(overrides?: Partial<InputElement>): InputElement {
  const id = generateId()
  return {
    id,
    type: 'input',
    name: overrides?.name || `input-${id.split('-')[1]}`,
    placeholder: 'Placeholder...',
    inputType: 'text',
    disabled: false,
    padding: { ...formPadding },
    margin: { ...defaultSpacing },
    width: { mode: 'fill', value: 0 },
    height: { mode: 'hug', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '#ffffff',
    border: { ...formBorder },
    borderRadius: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
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
    placeholder: 'Placeholder...',
    rows: 3,
    disabled: false,
    padding: { ...formPadding },
    margin: { ...defaultSpacing },
    width: { mode: 'fill', value: 0 },
    height: { mode: 'hug', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '#ffffff',
    border: { ...formBorder },
    borderRadius: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
    alignSelf: 'auto',
    ...overrides,
  }
}

export function createSelect(overrides?: Partial<SelectElement>): SelectElement {
  const id = generateId()
  return {
    id,
    type: 'select',
    name: overrides?.name || `select-${id.split('-')[1]}`,
    options: [{ value: 'option-1', label: 'Option 1' }],
    disabled: false,
    padding: { ...formPadding },
    margin: { ...defaultSpacing },
    width: { mode: 'fill', value: 0 },
    height: { mode: 'hug', value: 0 },
    grow: 0,
    shrink: 1,
    overflow: 'visible',
    opacity: 100,
    bg: '#ffffff',
    border: { ...formBorder },
    borderRadius: { topLeft: 6, topRight: 6, bottomRight: 6, bottomLeft: 6 },
    tailwindClasses: '',
    boxShadow: 'none',
    cursor: 'auto',
    minWidth: 0,
    maxWidth: 0,
    minHeight: 0,
    maxHeight: 0,
    alignSelf: 'auto',
    ...overrides,
  }
}

// Deep clone helper
function cloneTree(frame: Frame): Frame {
  const base = {
    ...frame,
    padding: { ...frame.padding },
    margin: { ...frame.margin },
    width: { ...frame.width },
    height: { ...frame.height },
    border: { ...frame.border },
    borderRadius: { ...frame.borderRadius },
  }
  if (frame.type === 'box') {
    return { ...base, type: 'box', children: frame.children.map(cloneTree) } as BoxElement
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
    return updater({
      ...root,
      padding: { ...root.padding },
      margin: { ...root.margin },
      width: { ...root.width },
      height: { ...root.height },
      border: { ...root.border },
      borderRadius: { ...root.borderRadius },
    })
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

// Find a frame by id
function findInTree(root: Frame, id: string): Frame | null {
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
  const base = {
    ...frame,
    id: newId,
    name: frame.name,
    padding: { ...frame.padding },
    margin: { ...frame.margin },
    width: { ...frame.width },
    height: { ...frame.height },
    border: { ...frame.border },
    borderRadius: { ...frame.borderRadius },
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

// Migrate 'auto' → 'default' for old saved data
function migrateSizeValue(raw: SizeValue | undefined): SizeValue {
  if (!raw) return { mode: 'default', value: 0 }
  if ((raw.mode as string) === 'auto') return { ...raw, mode: 'default' }
  return raw
}

// Migrate old format data to current schema
function migrateFrame(raw: Record<string, unknown>): Frame {
  const zero: Spacing = { top: 0, right: 0, bottom: 0, left: 0 }
  const children = (raw.children as Record<string, unknown>[] | undefined) ?? []

  // Sanitize corrupted IDs (e.g. "frame-NaN" from previous bug)
  const rawId = raw.id as string
  const id = (rawId && !rawId.includes('NaN')) ? rawId : generateId()

  const base = {
    id,
    name: (raw.name as string && !(raw.name as string).includes('NaN')) ? (raw.name as string) : `frame-${id.split('-')[1]}`,
    padding: (raw.padding as Spacing) || { ...zero },
    margin: (raw.margin as Spacing) || { ...zero },
    width: migrateSizeValue(raw.width as SizeValue | undefined),
    height: migrateSizeValue(raw.height as SizeValue | undefined),
    grow: (raw.grow as number) ?? 0,
    shrink: (raw.shrink as number) ?? 1,
    overflow: (raw.overflow as Frame['overflow']) || 'visible',
    opacity: (raw.opacity as number) ?? 100,
    bg: (raw.bg as string) || '',
    border: (raw.border as Frame['border']) || { width: 0, color: '', style: 'none' as const },
    borderRadius: typeof raw.borderRadius === 'number'
      ? { topLeft: raw.borderRadius, topRight: raw.borderRadius, bottomRight: raw.borderRadius, bottomLeft: raw.borderRadius }
      : (raw.borderRadius as BorderRadius) ?? { ...defaultBorderRadius },
    tailwindClasses: (raw.tailwindClasses as string) || '',
    boxShadow: (raw.boxShadow as Frame['boxShadow']) || 'none',
    cursor: (raw.cursor as Frame['cursor']) || 'auto',
    minWidth: (raw.minWidth as number) ?? 0,
    maxWidth: (raw.maxWidth as number) ?? 0,
    minHeight: (raw.minHeight as number) ?? 0,
    maxHeight: (raw.maxHeight as number) ?? 0,
    alignSelf: (raw.alignSelf as Frame['alignSelf']) || 'auto',
  }

  if (raw.type === 'text') {
    return {
      ...base,
      type: 'text',
      content: (raw.content as string) || 'Text',
      fontSize: (raw.fontSize as number) ?? 14,
      fontWeight: (raw.fontWeight as TextElement['fontWeight']) ?? 400,
      lineHeight: (raw.lineHeight as number) ?? 1.5,
      color: (raw.color as string) || '#000000',
      textAlign: (raw.textAlign as TextElement['textAlign']) || 'left',
      fontStyle: (raw.fontStyle as TextElement['fontStyle']) || 'normal',
      textDecoration: (raw.textDecoration as TextElement['textDecoration']) || 'none',
      letterSpacing: (raw.letterSpacing as number) ?? 0,
      textTransform: (raw.textTransform as TextElement['textTransform']) || 'none',
      whiteSpace: (raw.whiteSpace as TextElement['whiteSpace']) || 'normal',
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
      label: (raw.label as string) || 'Button',
      variant: (raw.variant as ButtonElement['variant']) || 'filled',
    } as ButtonElement
  }

  if (raw.type === 'input') {
    return {
      ...base,
      type: 'input',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      inputType: (raw.inputType as InputElement['inputType']) || 'text',
      disabled: (raw.disabled as boolean) ?? false,
    } as InputElement
  }

  if (raw.type === 'textarea') {
    return {
      ...base,
      type: 'textarea',
      placeholder: (raw.placeholder as string) || 'Placeholder...',
      rows: (raw.rows as number) ?? 3,
      disabled: (raw.disabled as boolean) ?? false,
    } as TextareaElement
  }

  if (raw.type === 'select') {
    return {
      ...base,
      type: 'select',
      options: (raw.options as SelectElement['options']) || [{ value: 'option-1', label: 'Option 1' }],
      disabled: (raw.disabled as boolean) ?? false,
    } as SelectElement
  }

  return {
    ...base,
    type: 'box',
    tag: (raw.tag as BoxTag) || 'div',
    direction: (raw.direction as BoxElement['direction']) || 'column',
    justify: (raw.justify as BoxElement['justify']) || 'start',
    align: (raw.align as BoxElement['align']) || 'stretch',
    gap: (raw.gap as number) ?? 0,
    wrap: (raw.wrap as boolean) ?? false,
    children: children.map(migrateFrame),
  } as BoxElement
}

// Migrate old data: if the saved root was a user frame (not internal root),
// wrap it inside the internal root so it becomes a child.
export function migrateToInternalRoot(saved: Record<string, unknown>): BoxElement {
  const migrated = migrateFrame(saved)
  if (migrated.id === INTERNAL_ROOT_ID && migrated.type === 'box') {
    // Already has internal root
    return migrated as BoxElement
  }
  // Old format: user's root becomes a child of the internal root
  return createInternalRoot([migrated])
}

const MAX_HISTORY = 50

interface FrameStore {
  root: BoxElement
  selectedId: string | null
  hoveredId: string | null
  collapsedIds: Set<string>
  filePath: string | null
  dirty: boolean
  showSpacingOverlays: boolean
  showOverlayValues: boolean
  mcpConnected: boolean

  past: BoxElement[]
  future: BoxElement[]

  select: (id: string | null) => void
  hover: (id: string | null) => void
  toggleCollapse: (id: string) => void

  addChild: (parentId: string, type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select', overrides?: Partial<Frame>) => void
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
}

const VIEW_PREFS_KEY = 'caja-view-prefs'

interface ViewPrefs {
  showSpacingOverlays: boolean
  showOverlayValues: boolean
}

function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(VIEW_PREFS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { showSpacingOverlays: true, showOverlayValues: false }
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
  hoveredId: null,
  collapsedIds: new Set(),
  filePath: null,
  dirty: false,
  showSpacingOverlays: initialViewPrefs.showSpacingOverlays,
  showOverlayValues: initialViewPrefs.showOverlayValues,
  mcpConnected: false,
  past: [],
  future: [],

  select: (id) => set({ selectedId: id }),
  hover: (id) => set({ hoveredId: id }),

  toggleCollapse: (id) =>
    set((state) => {
      const next = new Set(state.collapsedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { collapsedIds: next }
    }),

  addChild: (parentId, type, overrides) =>
    set((state) => {
      const prefixMap = { text: 'text', image: 'image', button: 'button', input: 'input', textarea: 'textarea', select: 'select', box: 'frame' } as const
      const prefix = prefixMap[type]
      const name = overrides?.name || nextName(prefix, state.root)
      const child =
        type === 'text' ? createText({ name, ...overrides } as Partial<TextElement>)
        : type === 'image' ? createImage({ name, ...overrides } as Partial<ImageElement>)
        : type === 'button' ? createButton({ name, ...overrides } as Partial<ButtonElement>)
        : type === 'input' ? createInput({ name, ...overrides } as Partial<InputElement>)
        : type === 'textarea' ? createTextarea({ name, ...overrides } as Partial<TextareaElement>)
        : type === 'select' ? createSelect({ name, ...overrides } as Partial<SelectElement>)
        : createBox({ name, ...overrides } as Partial<BoxElement>)
      const history = pushHistory(state)
      return {
        root: addChildInTree(state.root, parentId, child) as BoxElement,
        selectedId: child.id,
        ...history,
      }
    }),

  removeFrame: (id) =>
    set((state) => {
      if (id === INTERNAL_ROOT_ID) return {} // never remove internal root
      const history = pushHistory(state)
      return {
        root: removeFromTree(state.root, id) as BoxElement,
        selectedId: state.selectedId === id ? null : state.selectedId,
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
    set({ root, filePath, dirty: false, selectedId: null, past: [], future: [] })
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ dirty: false }),
  toggleSpacingOverlays: () => set((s) => {
    const next = !s.showSpacingOverlays
    saveViewPrefs({ showSpacingOverlays: next, showOverlayValues: s.showOverlayValues })
    return { showSpacingOverlays: next }
  }),
  toggleOverlayValues: () => set((s) => {
    const next = !s.showOverlayValues
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: next })
    return { showOverlayValues: next }
  }),
  setSpacingOverlays: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: value, showOverlayValues: s.showOverlayValues })
    return { showSpacingOverlays: value }
  }),
  setOverlayValues: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: value })
    return { showOverlayValues: value }
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
