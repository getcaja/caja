import { create } from 'zustand'
import type { Frame, BoxElement, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, Spacing, SizeValue, BorderRadius, Page } from '../types/frame'
import { useCatalogStore } from './catalogStore'
import {
  createBox, createText, createImage, createButton, createInput,
  createTextarea, createSelect, createLink, createInternalRoot,
  normalizeFrame, cloneTree,
} from './frameFactories'
import { migrateToInternalRoot } from './frameMigration'

// Re-export from frameFactories for external consumers
export {
  createBox, createText, createImage, createButton, createInput,
  createTextarea, createSelect, createLink, normalizeFrame,
} from './frameFactories'
export { migrateToInternalRoot } from './frameMigration'

// Each page gets a unique root ID: __root__<pageId>
function rootIdForPage(pageId: string): string {
  return `__root__${pageId}`
}

/** Check whether an ID belongs to an internal root frame */
export function isRootId(id: string): boolean {
  return id.startsWith('__root__')
}

let nextId = 1
export function generateId(): string {
  return `frame-${nextId++}`
}

let nextPageId = 2
function generatePageId(): string {
  return `page-${nextPageId++}`
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

// Insert a child frame at a specific index
function insertChildInTree(root: Frame, parentId: string, child: Frame, index: number): Frame {
  if (root.id === parentId && root.type === 'box') {
    const children = [...root.children]
    children.splice(index, 0, child)
    return { ...root, children }
  }
  return withChildren(
    root,
    getChildren(root).map((c) => insertChildInTree(c, parentId, child, index))
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

// Deep clone with new IDs (for duplication) — exported for snippet insertion
// Optional idMap accumulator: records oldId → newId for every cloned frame.
export function cloneWithNewIds(frame: Frame, idMap?: Record<string, string>): Frame {
  const newId = generateId()
  if (idMap) idMap[frame.id] = newId
  const cloned = cloneTree(frame)
  const base = {
    ...cloned,
    id: newId,
    name: frame.name,
  }
  if (frame.type === 'box') {
    return { ...base, type: 'box', children: frame.children.map((c) => cloneWithNewIds(c, idMap)) } as BoxElement
  }
  return base as Frame
}

// Find parent of a frame
export function findParent(root: Frame, id: string): BoxElement | null {
  if (root.type !== 'box') return null
  for (const child of root.children) {
    if (child.id === id) return root
    const found = findParent(child, id)
    if (found) return found
  }
  return null
}

// Duplicate a frame next to itself
function duplicateInTree(root: Frame, id: string): { tree: Frame; newId: string; idMap: Record<string, string> } | null {
  const target = findInTree(root, id)
  if (!target) return null
  if (isRootId(target.id)) return null // can't duplicate internal root
  const idMap: Record<string, string> = {}
  const clone = cloneWithNewIds(target, idMap)
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

  return { tree: insert(root), newId: clone.id, idMap }
}

// Wrap a frame in a new parent frame
function wrapInFrameInTree(root: Frame, id: string): { tree: Frame; wrapperId: string } | null {
  const target = findInTree(root, id)
  if (!target) return null
  if (isRootId(target.id)) return null // can't wrap internal root
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

const MAX_HISTORY = 50

interface FrameStore {
  root: BoxElement
  pages: Page[]
  activePageId: string
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
  canvasZoom: number
  mcpConnected: boolean
  mcpBusy: boolean
  canvasDragId: string | null
  canvasDragOver: { parentId: string; index: number } | null
  patternDragFrame: Frame | null
  patternDragOrigin: { libraryId?: string; patternId?: string } | null
  clipboard: Frame[]
  treePanelTab: 'layers' | 'patterns' | 'libraries'
  _lastDuplicateMap: Record<string, string> | null
  _previewSnapshot: BoxElement | null
  mcpHighlightIds: Set<string>

  past: Record<string, BoxElement[]>
  future: Record<string, BoxElement[]>

  select: (id: string | null) => void
  selectMulti: (id: string) => void
  removeSelected: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: () => void
  hover: (id: string | null) => void
  toggleCollapse: (id: string) => void
  toggleHidden: (id: string) => void

  insertFrame: (parentId: string, frame: Frame, origin?: { libraryId?: string; patternId?: string }) => void
  insertFrameAt: (parentId: string, frame: Frame, index: number, origin?: { libraryId?: string; patternId?: string }) => void
  addChild: (parentId: string, type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link', overrides?: Partial<Frame>) => void
  removeFrame: (id: string) => void
  duplicateFrame: (id: string) => void
  wrapInFrame: (id: string) => void
  moveFrame: (frameId: string, newParentId: string, index: number) => void
  reorderFrame: (frameId: string, direction: 'up' | 'down') => void
  updateFrame: (id: string, updates: Partial<Frame>) => void
  updateSpacing: (id: string, field: 'padding' | 'margin' | 'inset', values: Partial<Spacing>) => void
  updateSize: (id: string, dimension: 'width' | 'height', size: Partial<SizeValue>) => void
  updateBorderRadius: (id: string, values: Partial<BorderRadius>) => void
  renameFrame: (id: string, name: string) => void

  startPreview: () => void
  endPreview: (commit: boolean) => void
  undo: () => void
  redo: () => void

  getSelected: () => Frame | null
  getParentDirection: (id: string) => 'row' | 'column'
  getParentDisplay: (id: string) => BoxElement['display'] | null
  getRootId: () => string
  newFile: () => void
  loadFromStorage: () => void
  loadFromFile: (root: BoxElement, filePath: string) => void
  loadFromFileMulti: (pages: Page[], activePageId: string, filePath: string) => void
  setFilePath: (path: string | null) => void
  markClean: () => void
  toggleSpacingOverlays: () => void
  toggleOverlayValues: () => void
  setSpacingOverlays: (value: boolean) => void
  setOverlayValues: (value: boolean) => void
  togglePreviewMode: () => void
  setPreviewMode: (value: boolean) => void
  setCanvasWidth: (width: number | null) => void
  setCanvasZoom: (zoom: number) => void
  setCanvasDrag: (id: string | null) => void
  setCanvasDragOver: (over: { parentId: string; index: number } | null) => void
  setPatternDragFrame: (frame: Frame | null, origin?: { libraryId?: string; patternId?: string } | null) => void
  setTreePanelTab: (tab: 'layers' | 'patterns' | 'libraries') => void
  expandToFrame: (id: string) => void
  addMcpHighlight: (id: string) => void
  advancedMode: boolean
  setAdvancedMode: (value: boolean) => void

  // Page management
  addPage: (name?: string, route?: string) => void
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
  setPageRoute: (id: string, route: string) => void
  setActivePage: (id: string) => void
  duplicatePage: (id: string) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
}

const VIEW_PREFS_KEY = 'caja-view-prefs'

interface ViewPrefs {
  showSpacingOverlays: boolean
  showOverlayValues: boolean
  previewMode: boolean
  canvasWidth: number | null
  advancedMode: boolean
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
        advancedMode: parsed.advancedMode ?? false,
      }
    }
  } catch (err) { console.warn('Failed to load view preferences:', err) }
  return { showSpacingOverlays: true, showOverlayValues: false, previewMode: false, canvasWidth: null, advancedMode: false }
}

function saveViewPrefs(prefs: ViewPrefs) {
  try {
    localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs))
  } catch (err) {
    console.warn('Failed to save view preferences:', err)
  }
}

const initialViewPrefs = loadViewPrefs()

function pushHistory(state: { root: BoxElement; past: Record<string, BoxElement[]>; future: Record<string, BoxElement[]>; activePageId: string; _previewSnapshot: BoxElement | null }) {
  if (state._previewSnapshot) return {}
  const pageId = state.activePageId
  const pagePast = state.past[pageId] || []
  return {
    past: { ...state.past, [pageId]: [...pagePast.slice(-(MAX_HISTORY - 1)), cloneTree(state.root) as BoxElement] },
    future: { ...state.future, [pageId]: [] as BoxElement[] },
    dirty: true,
  }
}

// Update both root and the active page's root in the pages array
function updateActiveRoot(state: { pages: Page[]; activePageId: string }, newRoot: BoxElement): { pages: Page[]; root: BoxElement } {
  return {
    root: newRoot,
    pages: state.pages.map((p) => p.id === state.activePageId ? { ...p, root: newRoot } : p),
  }
}

const initialPageId = 'page-1'
const initialRoot = createInternalRoot(initialPageId)
const initialPages: Page[] = [{ id: initialPageId, name: 'Page 1', route: '/page-1', root: initialRoot }]

export const useFrameStore = create<FrameStore>((set, get) => ({
  root: initialRoot,
  pages: initialPages,
  activePageId: initialPageId,
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
  canvasZoom: 1,
  mcpConnected: false,
  mcpBusy: false,
  canvasDragId: null,
  canvasDragOver: null,
  patternDragFrame: null,
  patternDragOrigin: null,
  clipboard: [] as Frame[],
  treePanelTab: 'layers' as const,
  advancedMode: initialViewPrefs.advancedMode,
  _lastDuplicateMap: null,
  _previewSnapshot: null,
  mcpHighlightIds: new Set<string>(),
  past: {},
  future: {},

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
    let newRoot = state.root
    for (const id of ids) {
      if (isRootId(id)) continue
      newRoot = removeFromTree(newRoot, id) as BoxElement
    }
    return { ...updateActiveRoot(state, newRoot), selectedId: null, selectedIds: new Set(), ...history }
  }),

  copySelected: () => {
    const state = get()
    const ids = new Set(state.selectedIds)
    if (state.selectedId) ids.add(state.selectedId)
    const frames: Frame[] = []
    for (const id of ids) {
      if (isRootId(id)) continue
      const frame = findInTree(state.root, id)
      if (frame) frames.push(cloneTree(frame))
    }
    if (frames.length > 0) set({ clipboard: frames })
  },

  cutSelected: () => set((state) => {
    const ids = new Set(state.selectedIds)
    if (state.selectedId) ids.add(state.selectedId)
    const frames: Frame[] = []
    for (const id of ids) {
      if (isRootId(id)) continue
      const frame = findInTree(state.root, id)
      if (frame) frames.push(cloneTree(frame))
    }
    if (frames.length === 0) return {}
    const history = pushHistory(state)
    let newRoot = state.root
    for (const id of ids) {
      if (isRootId(id)) continue
      newRoot = removeFromTree(newRoot, id) as BoxElement
    }
    return { clipboard: frames, ...updateActiveRoot(state, newRoot), selectedId: null, selectedIds: new Set(), ...history }
  }),

  pasteClipboard: () => set((state) => {
    if (state.clipboard.length === 0) return {}
    const history = pushHistory(state)
    let newRoot = state.root

    // Determine insert target — always paste as sibling after selected frame
    let targetParentId: string
    let insertIndex: number
    if (state.selectedId && !isRootId(state.selectedId)) {
      const parent = findParent(state.root, state.selectedId)
      if (parent) {
        targetParentId = parent.id
        const idx = parent.children.findIndex((c) => c.id === state.selectedId)
        insertIndex = idx + 1
      } else {
        targetParentId = state.root.id
        insertIndex = state.root.children.length
      }
    } else {
      // No selection or root selected: paste at root level
      targetParentId = state.root.id
      insertIndex = state.root.children.length
    }

    const pastedIds: string[] = []
    for (let i = 0; i < state.clipboard.length; i++) {
      const cloned = cloneWithNewIds(normalizeFrame(state.clipboard[i]))
      pastedIds.push(cloned.id)
      newRoot = insertChildInTree(newRoot, targetParentId, cloned, insertIndex + i) as BoxElement
    }

    return {
      ...updateActiveRoot(state, newRoot),
      selectedId: pastedIds[0],
      selectedIds: new Set(pastedIds),
      ...history,
    }
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
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, hidden: !f.hidden })) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  insertFrame: (parentId, frame, origin) =>
    set((state) => {
      const parent = findInTree(state.root, parentId)
      if (!parent || parent.type !== 'box') return {}
      const cloned = cloneWithNewIds(normalizeFrame(frame))
      if (origin) cloned._origin = origin
      const history = pushHistory(state)
      const newRoot = insertChildInTree(state.root, parentId, cloned, 0) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: cloned.id, selectedIds: new Set([cloned.id]), ...history }
    }),

  insertFrameAt: (parentId, frame, index, origin) =>
    set((state) => {
      const parent = findInTree(state.root, parentId)
      if (!parent || parent.type !== 'box') return {}
      const cloned = cloneWithNewIds(normalizeFrame(frame))
      if (origin) cloned._origin = origin
      const history = pushHistory(state)
      const newRoot = insertChildInTree(state.root, parentId, cloned, index) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: cloned.id, selectedIds: new Set([cloned.id]), ...history }
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
      const newRoot = addChildInTree(state.root, parentId, child) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: child.id, selectedIds: new Set([child.id]), ...history }
    }),

  removeFrame: (id) =>
    set((state) => {
      if (isRootId(id)) return {} // never remove internal root
      const history = pushHistory(state)
      const nextIds = new Set(state.selectedIds)
      nextIds.delete(id)
      const newRoot = removeFromTree(state.root, id) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: state.selectedId === id ? null : state.selectedId, selectedIds: nextIds, ...history }
    }),

  duplicateFrame: (id) =>
    set((state) => {
      const result = duplicateInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { ...updateActiveRoot(state, result.tree as BoxElement), selectedId: result.newId, _lastDuplicateMap: result.idMap, ...history }
    }),

  wrapInFrame: (id) =>
    set((state) => {
      const result = wrapInFrameInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { ...updateActiveRoot(state, result.tree as BoxElement), selectedId: result.wrapperId, ...history }
    }),

  moveFrame: (frameId, newParentId, index) =>
    set((state) => {
      if (isRootId(frameId)) return {}
      const history = pushHistory(state)
      const newRoot = moveInTree(state.root, frameId, newParentId, index) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  reorderFrame: (frameId, direction) =>
    set((state) => {
      if (isRootId(frameId)) return {}
      const parent = findParent(state.root, frameId)
      if (!parent) return {}
      const idx = parent.children.findIndex((c) => c.id === frameId)
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= parent.children.length) return {}
      const history = pushHistory(state)
      const newRoot = moveInTree(state.root, frameId, parent.id, newIdx) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateFrame: (id, updates) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, ...updates } as Frame)) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateSpacing: (id, field, values) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, [field]: { ...f[field], ...values } })) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateSize: (id, dimension, size) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, [dimension]: { ...f[dimension], ...size } })) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateBorderRadius: (id, values) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, borderRadius: { ...f.borderRadius, ...values } })) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  renameFrame: (id, name) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, name })) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  startPreview: () => set((state) => {
    if (state._previewSnapshot) return {}
    return { _previewSnapshot: cloneTree(state.root) as BoxElement }
  }),

  endPreview: (commit) => set((state) => {
    if (!state._previewSnapshot) return {}
    if (commit) {
      const pageId = state.activePageId
      const pagePast = state.past[pageId] || []
      return {
        past: { ...state.past, [pageId]: [...pagePast.slice(-(MAX_HISTORY - 1)), state._previewSnapshot] },
        future: { ...state.future, [pageId]: [] },
        _previewSnapshot: null,
        dirty: true,
      }
    }
    return { ...updateActiveRoot(state, state._previewSnapshot), _previewSnapshot: null }
  }),

  undo: () =>
    set((state) => {
      const pageId = state.activePageId
      const pagePast = state.past[pageId] || []
      if (pagePast.length === 0) return {}
      const prev = pagePast[pagePast.length - 1]
      const pageFuture = state.future[pageId] || []
      return {
        ...updateActiveRoot(state, prev),
        past: { ...state.past, [pageId]: pagePast.slice(0, -1) },
        future: { ...state.future, [pageId]: [cloneTree(state.root) as BoxElement, ...pageFuture] },
      }
    }),

  redo: () =>
    set((state) => {
      const pageId = state.activePageId
      const pageFuture = state.future[pageId] || []
      if (pageFuture.length === 0) return {}
      const next = pageFuture[0]
      const pagePast = state.past[pageId] || []
      return {
        ...updateActiveRoot(state, next),
        past: { ...state.past, [pageId]: [...pagePast, cloneTree(state.root) as BoxElement] },
        future: { ...state.future, [pageId]: pageFuture.slice(1) },
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

  getParentDisplay: (id) => {
    const parent = findParent(get().root, id)
    return parent?.display ?? null
  },

  getRootId: () => get().root.id,

  newFile: () => {
    const pageId = 'page-1'
    const root = createInternalRoot(pageId)
    const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
    nextId = 1
    nextPageId = 2
    localStorage.removeItem('caja-state')
    localStorage.removeItem('caja-snippets-state')
    set({
      pages, activePageId: pageId, root, filePath: null, dirty: false,
      selectedId: null, selectedIds: new Set(), past: {}, future: {},
      collapsedIds: new Set(), hoveredId: null,
    })
    useCatalogStore.getState().resetPatterns()
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem('caja-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.pages && Array.isArray(parsed.pages)) {
          // New multi-page format
          const pages: Page[] = parsed.pages.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            route: p.route as string,
            root: migrateToInternalRoot(p.root as Record<string, unknown>, p.id as string),
          }))
          const activePageId = (parsed.activePageId as string) || pages[0].id
          const activePage = pages.find((p) => p.id === activePageId) || pages[0]
          let maxId = 0
          for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
          nextId = maxId + 1
          const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
          nextPageId = maxPid + 1
          set({ pages, activePageId: activePage.id, root: activePage.root, past: {}, future: {} })
        } else if (parsed.root) {
          // Legacy single-root format → wrap in one page
          const pageId = 'page-1'
          const root = migrateToInternalRoot(parsed.root, pageId)
          nextId = maxIdInTree(root) + 1
          nextPageId = 2
          const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
          set({ pages, activePageId: pageId, root, past: {}, future: {} })
        }
      }
    } catch (err) {
      console.warn('Failed to load saved state, resetting:', err)
      localStorage.removeItem('caja-state')
    }
  },

  loadFromFile: (root, filePath) => {
    // This is now called for legacy single-root files. Multi-page files use loadFromFileMulti.
    const pageId = 'page-1'
    root.id = rootIdForPage(pageId)
    nextId = maxIdInTree(root) + 1
    nextPageId = 2
    const pages: Page[] = [{ id: pageId, name: 'Page 1', route: '/page-1', root }]
    set({ pages, activePageId: pageId, root, filePath, dirty: false, selectedId: null, selectedIds: new Set(), past: {}, future: {} })
  },

  loadFromFileMulti: (pages, activePageId, filePath) => {
    // Ensure each page root has a unique ID
    for (const p of pages) p.root.id = rootIdForPage(p.id)
    let maxId = 0
    for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
    nextId = maxId + 1
    const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
    nextPageId = maxPid + 1
    const activePage = pages.find((p) => p.id === activePageId) || pages[0]
    set({ pages, activePageId: activePage.id, root: activePage.root, filePath, dirty: false, selectedId: null, selectedIds: new Set(), past: {}, future: {} })
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ dirty: false }),
  toggleSpacingOverlays: () => set((s) => {
    const next = !s.showSpacingOverlays
    saveViewPrefs({ showSpacingOverlays: next, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { showSpacingOverlays: next }
  }),
  toggleOverlayValues: () => set((s) => {
    const next = !s.showOverlayValues
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: next, previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { showOverlayValues: next }
  }),
  setSpacingOverlays: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: value, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { showSpacingOverlays: value }
  }),
  setOverlayValues: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: value, previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { showOverlayValues: value }
  }),
  togglePreviewMode: () => set((s) => {
    const next = !s.previewMode
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: next, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { previewMode: next, ...(next ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setPreviewMode: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: value, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { previewMode: value, ...(value ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setCanvasWidth: (width) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: width, advancedMode: s.advancedMode })
    return { canvasWidth: width }
  }),
  setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
  setCanvasDrag: (id) => set({ canvasDragId: id }),
  setCanvasDragOver: (over) => set((state) => {
    const prev = state.canvasDragOver
    if (prev === over) return {}
    if (prev && over && prev.parentId === over.parentId && prev.index === over.index) return {}
    return { canvasDragOver: over }
  }),
  setPatternDragFrame: (frame, origin) => set({ patternDragFrame: frame, patternDragOrigin: origin ?? null }),
  setTreePanelTab: (tab) => set({ treePanelTab: tab }),
  setAdvancedMode: (value) => set((s) => {
    saveViewPrefs({ showSpacingOverlays: s.showSpacingOverlays, showOverlayValues: s.showOverlayValues, previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: value })
    return { advancedMode: value }
  }),

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

  addMcpHighlight: (() => {
    let pending: string[] = []
    let flushTimer: ReturnType<typeof setTimeout> | null = null

    return (id: string) => {
      pending.push(id)
      if (flushTimer) return
      // Microtask batch: accumulate all IDs from a single batch_update, flush once
      flushTimer = setTimeout(() => {
        const ids = pending
        pending = []
        flushTimer = null
        // Dedupe to top-level ancestors: skip any ID whose parent is also in the batch
        // Also skip the root — animating the full-page element is wasteful
        const idSet = new Set(ids)
        const root = get().root
        idSet.delete(root.id)
        const roots: string[] = []
        for (const hid of idSet) {
          let ancestor = findParent(root, hid)
          let hasAncestorInBatch = false
          while (ancestor) {
            if (idSet.has(ancestor.id)) { hasAncestorInBatch = true; break }
            ancestor = findParent(root, ancestor.id)
          }
          if (!hasAncestorInBatch) roots.push(hid)
        }
        const next = new Set(get().mcpHighlightIds)
        for (const hid of roots) next.add(hid)
        set({ mcpHighlightIds: next })
        setTimeout(() => {
          const curr = get().mcpHighlightIds
          const after = new Set(curr)
          for (const hid of roots) after.delete(hid)
          if (after.size !== curr.size) set({ mcpHighlightIds: after })
        }, 800)
      }, 0)
    }
  })(),

  // --- Page management ---

  addPage: (name, route) => set((state) => {
    const id = generatePageId()
    const pageName = name || `Page ${state.pages.length + 1}`
    const pageRoute = route || `/${pageName.toLowerCase().replace(/\s+/g, '-')}`
    const newRoot = createInternalRoot(id)
    const page: Page = { id, name: pageName, route: pageRoute, root: newRoot }
    return {
      pages: [...state.pages, page],
      activePageId: id,
      root: newRoot,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
      past: state.past,
      future: state.future,
      dirty: true,
    }
  }),

  removePage: (id) => set((state) => {
    if (state.pages.length <= 1) return {} // min 1 page
    const pages = state.pages.filter((p) => p.id !== id)
    const wasActive = state.activePageId === id
    if (wasActive) {
      const newActive = pages[0]
      // Clean up undo stacks for removed page
      const { [id]: _pastRemoved, ...pastRest } = state.past
      const { [id]: _futureRemoved, ...futureRest } = state.future
      return {
        pages,
        activePageId: newActive.id,
        root: newActive.root,
        selectedId: null,
        selectedIds: new Set(),
        hoveredId: null,
        past: pastRest,
        future: futureRest,
        dirty: true,
      }
    }
    const { [id]: _pastRemoved, ...pastRest } = state.past
    const { [id]: _futureRemoved, ...futureRest } = state.future
    return { pages, past: pastRest, future: futureRest, dirty: true }
  }),

  renamePage: (id, name) => set((state) => ({
    pages: state.pages.map((p) => p.id === id ? { ...p, name } : p),
    dirty: true,
  })),

  setPageRoute: (id, route) => set((state) => ({
    pages: state.pages.map((p) => p.id === id ? { ...p, route } : p),
    dirty: true,
  })),

  setActivePage: (id) => set((state) => {
    if (state.activePageId === id) return {}
    const page = state.pages.find((p) => p.id === id)
    if (!page) return {}
    return {
      activePageId: id,
      root: page.root,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
    }
  }),

  duplicatePage: (id) => set((state) => {
    const source = state.pages.find((p) => p.id === id)
    if (!source) return {}
    const newId = generatePageId()
    const newRoot = cloneTree(source.root) as BoxElement
    // Assign new IDs to all frames in the cloned tree
    const clonedRoot = cloneWithNewIds(newRoot) as BoxElement
    // Keep the internal root ID
    ;(clonedRoot as BoxElement).id = rootIdForPage(newId)
    const page: Page = { id: newId, name: `${source.name} (Copy)`, route: `${source.route}-copy`, root: clonedRoot }
    const idx = state.pages.findIndex((p) => p.id === id)
    const pages = [...state.pages]
    pages.splice(idx + 1, 0, page)
    return {
      pages,
      activePageId: newId,
      root: clonedRoot,
      selectedId: null,
      selectedIds: new Set(),
      hoveredId: null,
      dirty: true,
    }
  }),

  reorderPages: (fromIndex, toIndex) => set((state) => {
    const pages = [...state.pages]
    const [moved] = pages.splice(fromIndex, 1)
    pages.splice(toIndex, 0, moved)
    return { pages, dirty: true }
  }),
}))

// Auto-save
let saveTimeout: ReturnType<typeof setTimeout>
useFrameStore.subscribe((state) => {
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('caja-state', JSON.stringify({ pages: state.pages, activePageId: state.activePageId }))
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err)
    }
  }, 500)
})
