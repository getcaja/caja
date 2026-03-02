import { create } from 'zustand'
import type { Frame, BoxElement, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, DesignValue, Spacing, SizeValue, BorderRadius, Page, Breakpoint, ResponsiveOverrides } from '../types/frame'
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

// Deep clone with new IDs (for duplication) — exported for component insertion
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
  pageSelected: boolean
  hoveredId: string | null
  collapsedIds: Set<string>
  filePath: string | null
  dirty: boolean
  previewMode: boolean
  canvasWidth: number | null
  activeBreakpoint: Breakpoint
  canvasZoom: number
  mcpConnected: boolean
  mcpBusy: boolean
  canvasDragId: string | null
  canvasDragOver: { parentId: string; index: number } | null
  componentDragFrame: Frame | null
  componentDragOrigin: { libraryId?: string; componentId?: string } | null
  clipboard: Frame[]
  treePanelTab: 'layers' | 'components'
  _layersPageId: string | null  // remembers last Layers page when switching to Components tab
  _lastDuplicateMap: Record<string, string> | null
  _previewSnapshot: BoxElement | null
  editingComponentId: string | null
  _beforeEditState: { pageId: string; tab: 'layers' | 'components' } | null
  canvasTool: 'pointer' | 'frame' | 'text'
  pendingTextEdit: string | null
  mcpHighlightIds: Set<string>

  past: Record<string, BoxElement[]>
  future: Record<string, BoxElement[]>

  select: (id: string | null) => void
  selectMulti: (id: string) => void
  selectRange: (targetId: string) => void
  selectAllSiblings: () => void
  removeSelected: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: () => void
  hover: (id: string | null) => void
  toggleCollapse: (id: string) => void
  collapseAll: () => void
  expandAll: () => void
  toggleHidden: (id: string) => void

  insertFrame: (parentId: string, frame: Frame, origin?: { libraryId?: string; componentId?: string }) => void
  insertFrameAt: (parentId: string, frame: Frame, index: number, origin?: { libraryId?: string; componentId?: string }) => void
  addChild: (parentId: string, type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link', overrides?: Partial<Frame>) => void
  removeFrame: (id: string) => void
  duplicateFrame: (id: string) => void
  wrapInFrame: (id: string) => void
  wrapSelectedInFrame: () => void
  ungroupFrame: (id: string) => void
  moveFrame: (frameId: string, newParentId: string, index: number) => void
  moveFrames: (ids: string[], newParentId: string, index: number) => void
  reorderFrame: (frameId: string, direction: 'up' | 'down') => void
  updateFrame: (id: string, updates: Partial<Frame>) => void
  updateSpacing: (id: string, field: 'padding' | 'margin' | 'inset', values: Partial<Spacing>) => void
  updateSize: (id: string, dimension: 'width' | 'height', size: Partial<SizeValue>) => void
  clearResponsiveOverrides: (id: string, bp: 'md' | 'sm') => void
  removeResponsiveKeys: (id: string, bp: 'md' | 'sm', keys: string[]) => void
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
  togglePreviewMode: () => void
  setPreviewMode: (value: boolean) => void
  setCanvasWidth: (width: number | null) => void
  setActiveBreakpoint: (bp: Breakpoint) => void
  getEffectiveFrame: (frame: Frame) => Frame
  setCanvasZoom: (zoom: number) => void
  setCanvasDrag: (id: string | null) => void
  setCanvasDragOver: (over: { parentId: string; index: number } | null) => void
  setComponentDragFrame: (frame: Frame | null, origin?: { libraryId?: string; componentId?: string } | null) => void
  setTreePanelTab: (tab: 'layers' | 'components') => void
  expandToFrame: (id: string) => void
  setCanvasTool: (tool: 'pointer' | 'frame' | 'text') => void
  clearPendingTextEdit: () => void
  addMcpHighlight: (id: string) => void
  advancedMode: boolean
  setAdvancedMode: (value: boolean) => void

  // Component edit mode
  enterComponentEditMode: (componentId: string) => void
  exitComponentEditMode: () => void

  // Component system
  getComponentPage: () => Page | undefined
  ensureComponentPage: () => Page
  addComponentMaster: (master: Frame) => void  // add a master frame to the components page
  createComponent: (frameId: string) => string | null  // returns componentId or null
  insertInstance: (componentId: string, parentId: string, index?: number) => string | null  // returns instance frame id
  detachInstance: (frameId: string) => void
  resetInstance: (frameId: string) => void
  propagateComponent: (componentId: string) => void

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
  previewMode: boolean
  canvasWidth: number | null
  activeBreakpoint: Breakpoint
  advancedMode: boolean
  collapsedIds: string[]
}

function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(VIEW_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        previewMode: parsed.previewMode ?? false,
        canvasWidth: parsed.canvasWidth ?? null,
        activeBreakpoint: (['base', 'md', 'sm'].includes(parsed.activeBreakpoint) ? parsed.activeBreakpoint : 'base') as Breakpoint,
        advancedMode: parsed.advancedMode ?? false,
        collapsedIds: parsed.collapsedIds ?? [],
      }
    }
  } catch (err) { console.warn('Failed to load view preferences:', err) }
  return { previewMode: false, canvasWidth: null, activeBreakpoint: 'base' as Breakpoint, advancedMode: false, collapsedIds: [] }
}

function saveViewPrefs(prefs: Partial<ViewPrefs>) {
  try {
    const current = loadViewPrefs()
    localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ ...current, ...prefs }))
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

/** Merge responsive overrides onto a base frame (desktop-first cascade).
 *  At 'md': apply md overrides.
 *  At 'sm': apply md overrides first, then sm on top. */
function mergeResponsiveOverrides(frame: Frame, bp: 'md' | 'sm'): Frame {
  const resp = frame.responsive
  if (!resp) return frame
  let result = frame as Frame
  // Desktop-first cascade: md always applies at sm too
  if (bp === 'sm' || bp === 'md') {
    const md = resp.md
    if (md && Object.keys(md).length > 0) {
      result = { ...result, ...md } as Frame
    }
  }
  if (bp === 'sm') {
    const sm = resp.sm
    if (sm && Object.keys(sm).length > 0) {
      result = { ...result, ...sm } as Frame
    }
  }
  return result
}

export const COMPONENT_PAGE_ID = '__components__'

// Sync catalogStore from the Components page (call after loading data)
function syncCatalogFromComponentsPage(pages: Page[]) {
  const compPage = pages.find((p) => p.isComponentPage)
  if (!compPage || compPage.root.type !== 'box') return
  const catalog = useCatalogStore.getState()
  for (const master of compPage.root.children) {
    catalog.registerComponent({
      id: master.id,
      name: master.name || 'Component',
      tags: [],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })
  }
}

// Update a specific page's root in the pages array
function updatePageRoot(pages: Page[], pageId: string, newRoot: BoxElement): Page[] {
  return pages.map((p) => p.id === pageId ? { ...p, root: newRoot } : p)
}

// Collect all instances of a component across all pages (except the component page)
function collectInstances(pages: Page[], componentId: string): { pageId: string; frameId: string }[] {
  const results: { pageId: string; frameId: string }[] = []
  function walk(frame: Frame, pageId: string) {
    if (frame._componentId === componentId) {
      results.push({ pageId, frameId: frame.id })
    }
    if (frame.type === 'box') {
      for (const child of frame.children) walk(child, pageId)
    }
  }
  for (const page of pages) {
    if (page.isComponentPage) continue
    walk(page.root, page.id)
  }
  return results
}

// Override-related props to diff when detecting user edits on instances.
// These are the props users typically change on instances (text, colors, images, etc.)
const OVERRIDE_KEYS = [
  'content', 'src', 'alt', 'href', 'placeholder', 'disabled', 'checked',
  'inputType', 'inputName', 'inputValue', 'rows', 'tag',
] as const

/**
 * Walk instance and original master in parallel (by structural position).
 * Detect which properties the user changed on the instance vs the original master.
 * Returns a map of path → changed properties.
 */
function collectUserOverrides(
  instance: Frame,
  original: Frame,
  path = '',
): Map<string, Record<string, unknown>> {
  const overrides = new Map<string, Record<string, unknown>>()
  const diff: Record<string, unknown> = {}

  // Compare override-worthy properties
  for (const key of OVERRIDE_KEYS) {
    if (key in instance && key in original) {
      const instVal = (instance as Record<string, unknown>)[key]
      const origVal = (original as Record<string, unknown>)[key]
      if (instVal !== origVal) diff[key] = instVal
    }
  }

  // Deep compare bg and color (DesignValue objects)
  if ('bg' in instance && 'bg' in original) {
    const iBg = (instance as Record<string, unknown>).bg
    const oBg = (original as Record<string, unknown>).bg
    if (JSON.stringify(iBg) !== JSON.stringify(oBg)) diff.bg = iBg
  }
  if ('color' in instance && 'color' in original) {
    const iColor = (instance as Record<string, unknown>).color
    const oColor = (original as Record<string, unknown>).color
    if (JSON.stringify(iColor) !== JSON.stringify(oColor)) diff.color = iColor
  }

  if (Object.keys(diff).length > 0) {
    overrides.set(path, diff)
  }

  // Recurse children by structural position
  if (instance.type === 'box' && original.type === 'box') {
    const len = Math.min(instance.children.length, original.children.length)
    for (let i = 0; i < len; i++) {
      const childOverrides = collectUserOverrides(instance.children[i], original.children[i], `${path}/${i}`)
      for (const [k, v] of childOverrides) {
        overrides.set(k, v)
      }
    }
  }

  return overrides
}

/**
 * Apply user overrides (by structural path) to a freshly cloned master tree.
 */
function applyUserOverrides(
  frame: Frame,
  overrides: Map<string, Record<string, unknown>>,
  path: string,
) {
  const myOverrides = overrides.get(path)
  if (myOverrides) {
    Object.assign(frame, myOverrides)
  }

  if (frame.type === 'box') {
    for (let i = 0; i < frame.children.length; i++) {
      applyUserOverrides(frame.children[i], overrides, `${path}/${i}`)
    }
  }
}

/** Check if a target is an instance or inside one. Used to prevent inserting children. */
function isInstanceOrInsideInstance(root: Frame, targetId: string): boolean {
  function walk(frame: Frame, insideInstance: boolean): boolean {
    if (frame.id === targetId) return insideInstance || !!frame._componentId
    if (frame.type === 'box') {
      const entering = insideInstance || !!frame._componentId
      for (const child of frame.children) {
        if (walk(child, entering)) return true
      }
    }
    return false
  }
  return walk(root, false)
}

/** Check if a frame is a child INSIDE an instance (but not the instance root itself). */
function isChildOfInstance(root: Frame, frameId: string): boolean {
  function walk(frame: Frame, insideInstance: boolean): boolean {
    if (frame.id === frameId) return insideInstance
    if (frame.type === 'box') {
      const entering = insideInstance || !!frame._componentId
      for (const child of frame.children) {
        if (walk(child, entering)) return true
      }
    }
    return false
  }
  return walk(root, false)
}

const initialPageId = 'page-1'
const initialRoot = createInternalRoot(initialPageId)
const initialPages: Page[] = [{ id: initialPageId, name: 'Page 1', route: '/page-1', root: initialRoot }]

export const useFrameStore = create<FrameStore>((set, get) => ({
  root: initialRoot,
  pages: initialPages,
  activePageId: initialPageId,
  selectedId: initialRoot.id,
  selectedIds: new Set<string>([initialRoot.id]),
  pageSelected: false,
  hoveredId: null,
  collapsedIds: new Set(initialViewPrefs.collapsedIds),
  filePath: null,
  dirty: false,
  previewMode: initialViewPrefs.previewMode,
  canvasWidth: initialViewPrefs.canvasWidth,
  activeBreakpoint: initialViewPrefs.activeBreakpoint,
  canvasZoom: 1,
  canvasTool: 'pointer',
  pendingTextEdit: null,
  mcpConnected: false,
  mcpBusy: false,
  canvasDragId: null,
  canvasDragOver: null,
  componentDragFrame: null,
  componentDragOrigin: null,
  clipboard: [] as Frame[],
  treePanelTab: 'layers' as const,
  _layersPageId: null as string | null,
  advancedMode: initialViewPrefs.advancedMode,
  editingComponentId: null,
  _beforeEditState: null,
  _lastDuplicateMap: null,
  _previewSnapshot: null,
  mcpHighlightIds: new Set<string>(),
  past: {},
  future: {},

  select: (id) => set({ selectedId: id, selectedIds: new Set(id ? [id] : []), pageSelected: false }),

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

  selectRange: (targetId) => set((state) => {
    const anchorId = state.selectedId
    if (!anchorId) return { selectedId: targetId, selectedIds: new Set([targetId]) }
    if (anchorId === targetId) return {}

    // Flatten visible tree order (DFS, skip hidden, respect collapsed)
    const order: string[] = []
    function walk(frame: Frame) {
      if (frame.hidden) return
      order.push(frame.id)
      if (frame.type === 'box' && !state.collapsedIds.has(frame.id)) {
        for (const child of frame.children) walk(child)
      }
    }
    walk(state.root)

    const anchorIdx = order.indexOf(anchorId)
    const targetIdx = order.indexOf(targetId)
    if (anchorIdx < 0 || targetIdx < 0) return {}

    const start = Math.min(anchorIdx, targetIdx)
    const end = Math.max(anchorIdx, targetIdx)
    const ids = new Set(order.slice(start, end + 1))

    // Keep selectedId as anchor so subsequent shift+clicks extend from the same point
    return { selectedIds: ids }
  }),

  selectAllSiblings: () => set((state) => {
    const id = state.selectedId
    if (!id) return {}
    const parent = findParent(state.root, id)
    if (!parent) return {}
    const ids = new Set(parent.children.map((c) => c.id))
    return { selectedIds: ids, selectedId: id }
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
      saveViewPrefs({ collapsedIds: [...next] })
      return { collapsedIds: next }
    }),

  collapseAll: () => set((state) => {
    const ids: string[] = []
    function walk(frame: Frame) {
      if (frame.type === 'box' && frame.children.length > 0) {
        ids.push(frame.id)
        for (const child of frame.children) walk(child)
      }
    }
    walk(state.root)
    saveViewPrefs({ collapsedIds: ids })
    return { collapsedIds: new Set(ids) }
  }),

  expandAll: () => {
    saveViewPrefs({ collapsedIds: [] })
    set({ collapsedIds: new Set() })
  },

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
      if (isInstanceOrInsideInstance(state.root, parentId)) return {} // instances are sealed
      const cloned = cloneWithNewIds(normalizeFrame(frame))
      if (origin) {
        cloned._origin = origin
        // Link as component instance when inserted from Components/Libraries
        if (origin.componentId) {
          cloned._componentId = origin.componentId
          cloned._overrides = {}
        }
      }
      const history = pushHistory(state)
      const newRoot = insertChildInTree(state.root, parentId, cloned, 0) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: cloned.id, selectedIds: new Set([cloned.id]), ...history }
    }),

  insertFrameAt: (parentId, frame, index, origin) =>
    set((state) => {
      const parent = findInTree(state.root, parentId)
      if (!parent || parent.type !== 'box') return {}
      if (isInstanceOrInsideInstance(state.root, parentId)) return {} // instances are sealed
      const cloned = cloneWithNewIds(normalizeFrame(frame))
      if (origin) {
        cloned._origin = origin
        // Link as component instance when inserted from Components/Libraries
        if (origin.componentId) {
          cloned._componentId = origin.componentId
          cloned._overrides = {}
        }
      }
      const history = pushHistory(state)
      const newRoot = insertChildInTree(state.root, parentId, cloned, index) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: cloned.id, selectedIds: new Set([cloned.id]), ...history }
    }),

  addChild: (parentId, type, overrides) =>
    set((state) => {
      if (isInstanceOrInsideInstance(state.root, parentId)) return {} // instances are sealed
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
      if (isChildOfInstance(state.root, id)) return {} // instance children are immutable
      const history = pushHistory(state)
      const nextIds = new Set(state.selectedIds)
      nextIds.delete(id)
      const newRoot = removeFromTree(state.root, id) as BoxElement

      // If removing a master from the Components page, auto-detach all its instances
      const isOnCompPage = state.pages.find((p) => p.isComponentPage && p.id === state.activePageId)
      let pages = updateActiveRoot(state, newRoot).pages
      if (isOnCompPage) {
        // Find and detach all instances of this component across regular pages
        const instances = collectInstances(state.pages, id)
        if (instances.length > 0) {
          for (const inst of instances) {
            const page = pages.find((p) => p.id === inst.pageId)
            if (!page) continue
            const detachedRoot = updateInTree(page.root, inst.frameId, (f) => {
              const d = { ...f }
              delete d._componentId
              delete d._overrides
              return d as Frame
            }) as BoxElement
            pages = updatePageRoot(pages, inst.pageId, detachedRoot)
          }
        }
        // Remove from catalogStore too
        useCatalogStore.getState().deleteComponent(id)
      }

      return { pages, root: newRoot, selectedId: state.selectedId === id ? null : state.selectedId, selectedIds: nextIds, ...history }
    }),

  duplicateFrame: (id) =>
    set((state) => {
      if (isChildOfInstance(state.root, id)) return {} // instance children are immutable
      const result = duplicateInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { ...updateActiveRoot(state, result.tree as BoxElement), selectedId: result.newId, _lastDuplicateMap: result.idMap, ...history }
    }),

  wrapInFrame: (id) =>
    set((state) => {
      if (isChildOfInstance(state.root, id)) return {} // instance children are immutable
      const result = wrapInFrameInTree(state.root, id)
      if (!result) return {}
      const history = pushHistory(state)
      return { ...updateActiveRoot(state, result.tree as BoxElement), selectedId: result.wrapperId, ...history }
    }),

  wrapSelectedInFrame: () =>
    set((state) => {
      const allIds = new Set(state.selectedIds)
      if (state.selectedId) allIds.add(state.selectedId)
      if (allIds.size === 0) return {}
      // Single selection: delegate to existing wrapInFrame logic
      if (allIds.size === 1) {
        const id = [...allIds][0]
        if (isChildOfInstance(state.root, id)) return {}
        const result = wrapInFrameInTree(state.root, id)
        if (!result) return {}
        const history = pushHistory(state)
        return { ...updateActiveRoot(state, result.tree as BoxElement), selectedId: result.wrapperId, selectedIds: new Set([result.wrapperId]), ...history }
      }
      // Filter to top-level: items whose parent is NOT also selected
      const ids = new Set<string>()
      for (const id of allIds) {
        const p = findParent(state.root, id)
        if (!p || !allIds.has(p.id)) ids.add(id)
      }
      if (ids.size === 0) return {}
      // All top-level must share the same parent
      const parents = new Set<string>()
      for (const id of ids) {
        if (isRootId(id)) return {}
        if (isChildOfInstance(state.root, id)) return {}
        const p = findParent(state.root, id)
        if (!p) return {}
        parents.add(p.id)
      }
      if (parents.size !== 1) return {} // not siblings
      const parentId = [...parents][0]
      const parent = findInTree(state.root, parentId) as BoxElement
      if (!parent) return {}
      // Collect children in their original order
      const selected = parent.children.filter((c) => ids.has(c.id))
      const firstIdx = parent.children.findIndex((c) => ids.has(c.id))
      const wrapper = createBox({ children: selected })
      // Replace the selected children with the wrapper at the first selected position
      const newChildren: Frame[] = []
      let inserted = false
      for (const c of parent.children) {
        if (ids.has(c.id)) {
          if (!inserted) {
            newChildren.push(wrapper)
            inserted = true
          }
          // skip — moved into wrapper
        } else {
          newChildren.push(c)
        }
      }
      function replaceParent(node: Frame): Frame {
        if (node.id === parentId && node.type === 'box') {
          return { ...node, children: newChildren }
        }
        return withChildren(node, getChildren(node).map(replaceParent))
      }
      const history = pushHistory(state)
      const newRoot = replaceParent(state.root) as BoxElement
      return { ...updateActiveRoot(state, newRoot), selectedId: wrapper.id, selectedIds: new Set([wrapper.id]), ...history }
    }),

  ungroupFrame: (id) =>
    set((state) => {
      if (isRootId(id)) return {}
      if (isChildOfInstance(state.root, id)) return {}
      const target = findInTree(state.root, id)
      if (!target || target.type !== 'box') return {}
      const parent = findParent(state.root, id) as BoxElement | null
      if (!parent) return {}
      const children = (target as BoxElement).children
      if (children.length === 0) return {}
      // Replace the wrapper with its children at the same position
      const newChildren: Frame[] = []
      for (const c of parent.children) {
        if (c.id === id) {
          newChildren.push(...children)
        } else {
          newChildren.push(c)
        }
      }
      function replaceParent(node: Frame): Frame {
        if (node.id === parent!.id && node.type === 'box') {
          return { ...node, children: newChildren }
        }
        return withChildren(node, getChildren(node).map(replaceParent))
      }
      const history = pushHistory(state)
      const newRoot = replaceParent(state.root) as BoxElement
      const childIds = new Set(children.map((c) => c.id))
      return { ...updateActiveRoot(state, newRoot), selectedId: children[0]?.id ?? null, selectedIds: childIds, ...history }
    }),

  moveFrame: (frameId, newParentId, index) =>
    set((state) => {
      if (isRootId(frameId)) return {}
      if (isInstanceOrInsideInstance(state.root, newParentId)) return {} // can't move into instances
      const history = pushHistory(state)
      const newRoot = moveInTree(state.root, frameId, newParentId, index) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  moveFrames: (ids, newParentId, index) =>
    set((state) => {
      if (ids.length === 0) return {}
      for (const id of ids) {
        if (isRootId(id)) return {}
        if (isChildOfInstance(state.root, id)) return {}
      }
      if (isInstanceOrInsideInstance(state.root, newParentId)) return {}

      const idSet = new Set(ids)
      const extracted: Frame[] = []
      let removedBefore = 0

      // Extract all frames from wherever they are, preserving tree-walk order
      function extract(node: Frame): Frame {
        if (node.type !== 'box') return node
        const newChildren: Frame[] = []
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]
          if (idSet.has(child.id)) {
            extracted.push(child)
            if (node.id === newParentId && i < index) removedBefore++
          } else {
            newChildren.push(extract(child))
          }
        }
        return { ...node, children: newChildren }
      }

      const treeAfterExtract = extract(state.root)
      if (extracted.length === 0) return {}

      const adjustedIndex = Math.max(0, index - removedBefore)

      function insert(node: Frame): Frame {
        if (node.id === newParentId && node.type === 'box') {
          const children = [...node.children]
          children.splice(adjustedIndex, 0, ...extracted)
          return { ...node, children }
        }
        if (node.type !== 'box') return node
        return { ...node, children: node.children.map(insert) }
      }

      const history = pushHistory(state)
      const newRoot = insert(treeAfterExtract) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  reorderFrame: (frameId, direction) =>
    set((state) => {
      if (isRootId(frameId)) return {}
      if (isChildOfInstance(state.root, frameId)) return {} // instance children are immutable
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
      const bp = state.activeBreakpoint
      const history = pushHistory(state)
      if (bp === 'base') {
        const newRoot = updateInTree(state.root, id, (f) => ({ ...f, ...updates } as Frame)) as BoxElement
        return { ...updateActiveRoot(state, newRoot), ...history }
      }
      // Write to responsive overrides
      const newRoot = updateInTree(state.root, id, (f) => {
        const existing = f.responsive?.[bp] ?? {}
        const merged = { ...existing, ...updates } as ResponsiveOverrides
        // Remove keys that match the base value (keep overrides sparse)
        for (const key of Object.keys(merged) as (keyof ResponsiveOverrides)[]) {
          if (JSON.stringify(merged[key]) === JSON.stringify((f as Record<string, unknown>)[key])) {
            delete merged[key]
          }
        }
        const responsive = { ...f.responsive, [bp]: Object.keys(merged).length > 0 ? merged : undefined }
        // Clean up empty responsive object
        if (!responsive.md && !responsive.sm) return { ...f, responsive: undefined } as Frame
        return { ...f, responsive } as Frame
      }) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateSpacing: (id, field, values) =>
    set((state) => {
      const bp = state.activeBreakpoint
      const history = pushHistory(state)
      const ZERO: DesignValue<number> = { mode: 'custom', value: 0 }
      const existingSpacing = (f: Frame) => {
        const s = f[field] as Spacing | undefined
        return { top: s?.top ?? ZERO, right: s?.right ?? ZERO, bottom: s?.bottom ?? ZERO, left: s?.left ?? ZERO }
      }
      if (bp === 'base') {
        const newRoot = updateInTree(state.root, id, (f) => ({ ...f, [field]: { ...existingSpacing(f), ...values } })) as BoxElement
        return { ...updateActiveRoot(state, newRoot), ...history }
      }
      // Write spacing to responsive overrides
      const newRoot = updateInTree(state.root, id, (f) => {
        const existingOverride = (f.responsive?.[bp]?.[field as keyof ResponsiveOverrides] ?? existingSpacing(f)) as Spacing
        const newSpacing = { ...existingOverride, ...values }
        const existing = f.responsive?.[bp] ?? {}
        const merged = { ...existing, [field]: newSpacing } as ResponsiveOverrides
        // Remove if matches base
        if (JSON.stringify(merged[field as keyof ResponsiveOverrides]) === JSON.stringify(f[field])) {
          delete merged[field as keyof ResponsiveOverrides]
        }
        const responsive = { ...f.responsive, [bp]: Object.keys(merged).length > 0 ? merged : undefined }
        if (!responsive.md && !responsive.sm) return { ...f, responsive: undefined } as Frame
        return { ...f, responsive } as Frame
      }) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  updateSize: (id, dimension, size) =>
    set((state) => {
      const bp = state.activeBreakpoint
      const history = pushHistory(state)
      if (bp === 'base') {
        const newRoot = updateInTree(state.root, id, (f) => ({ ...f, [dimension]: { ...f[dimension], ...size } })) as BoxElement
        return { ...updateActiveRoot(state, newRoot), ...history }
      }
      // Write size to responsive overrides
      const newRoot = updateInTree(state.root, id, (f) => {
        const existingOverride = (f.responsive?.[bp]?.[dimension as keyof ResponsiveOverrides] ?? f[dimension]) as SizeValue
        const newSize = { ...existingOverride, ...size }
        const existing = f.responsive?.[bp] ?? {}
        const merged = { ...existing, [dimension]: newSize } as ResponsiveOverrides
        // Remove if matches base
        if (JSON.stringify(merged[dimension as keyof ResponsiveOverrides]) === JSON.stringify(f[dimension])) {
          delete merged[dimension as keyof ResponsiveOverrides]
        }
        const responsive = { ...f.responsive, [bp]: Object.keys(merged).length > 0 ? merged : undefined }
        if (!responsive.md && !responsive.sm) return { ...f, responsive: undefined } as Frame
        return { ...f, responsive } as Frame
      }) as BoxElement
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

  clearResponsiveOverrides: (id, bp) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => {
        const responsive = { ...f.responsive, [bp]: undefined }
        if (!responsive.md && !responsive.sm) return { ...f, responsive: undefined } as Frame
        return { ...f, responsive } as Frame
      }) as BoxElement
      return { ...updateActiveRoot(state, newRoot), ...history }
    }),

  removeResponsiveKeys: (id, bp, keys) =>
    set((state) => {
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => {
        const existing = f.responsive?.[bp]
        if (!existing) return f
        const updated = { ...existing }
        for (const key of keys) {
          delete updated[key as keyof typeof updated]
        }
        const responsive = { ...f.responsive, [bp]: Object.keys(updated).length > 0 ? updated : undefined }
        if (!responsive.md && !responsive.sm) return { ...f, responsive: undefined } as Frame
        return { ...f, responsive } as Frame
      }) as BoxElement
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
    localStorage.removeItem('caja-components-state')
    saveViewPrefs({ collapsedIds: [] })
    set({
      pages, activePageId: pageId, root, filePath: null, dirty: false,
      selectedId: root.id, selectedIds: new Set([root.id]), past: {}, future: {},
      collapsedIds: new Set(), hoveredId: null,
      editingComponentId: null, _beforeEditState: null,
    })
    useCatalogStore.getState().resetComponents()
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
            // Detect component page by flag OR by well-known ID (handles old data)
            ...((p.isComponentPage || p.id === COMPONENT_PAGE_ID) ? { isComponentPage: true } : {}),
          }))
          // Never activate the Components page on startup — always start on a regular page
          const savedPageId = (parsed.activePageId as string) || pages[0].id
          const regularPages = pages.filter((p) => !p.isComponentPage)
          const activePage = regularPages.find((p) => p.id === savedPageId) || regularPages[0] || pages[0]
          let maxId = 0
          for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
          nextId = maxId + 1
          const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
          nextPageId = maxPid + 1
          set({ pages, activePageId: activePage.id, root: activePage.root, past: {}, future: {} })
          syncCatalogFromComponentsPage(pages)
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
    set({ pages, activePageId: pageId, root, filePath, dirty: false, selectedId: root.id, selectedIds: new Set([root.id]), past: {}, future: {} })
  },

  loadFromFileMulti: (pages, activePageId, filePath) => {
    // Ensure each page root has a unique ID
    for (const p of pages) p.root.id = rootIdForPage(p.id)
    let maxId = 0
    for (const p of pages) maxId = Math.max(maxId, maxIdInTree(p.root))
    nextId = maxId + 1
    const maxPid = Math.max(...pages.map((p) => parseInt(p.id.replace('page-', '')) || 0))
    nextPageId = maxPid + 1
    // Never activate the Components page on load — always start on a regular page
    const regularPages = pages.filter((p) => !p.isComponentPage)
    const activePage = regularPages.find((p) => p.id === activePageId) || regularPages[0] || pages[0]
    set({ pages, activePageId: activePage.id, root: activePage.root, filePath, dirty: false, selectedId: activePage.root.id, selectedIds: new Set([activePage.root.id]), past: {}, future: {} })
    syncCatalogFromComponentsPage(pages)
  },

  setFilePath: (path) => set({ filePath: path }),
  markClean: () => set({ dirty: false }),
  togglePreviewMode: () => set((s) => {
    const next = !s.previewMode
    saveViewPrefs({ previewMode: next, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { previewMode: next, canvasTool: 'pointer' as const, ...(next ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setPreviewMode: (value) => set((s) => {
    saveViewPrefs({ previewMode: value, canvasWidth: s.canvasWidth, advancedMode: s.advancedMode })
    return { previewMode: value, canvasTool: 'pointer' as const, ...(value ? { selectedId: null, hoveredId: null } : {}) }
  }),
  setCanvasWidth: (width) => set((s) => {
    saveViewPrefs({ previewMode: s.previewMode, canvasWidth: width, advancedMode: s.advancedMode })
    return { canvasWidth: width }
  }),
  setActiveBreakpoint: (bp) => {
    saveViewPrefs({ activeBreakpoint: bp })
    set({ activeBreakpoint: bp })
  },
  getEffectiveFrame: (frame) => {
    const bp = get().activeBreakpoint
    if (bp === 'base') return frame
    return mergeResponsiveOverrides(frame, bp)
  },
  setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
  setCanvasTool: (tool) => set({ canvasTool: tool }),
  clearPendingTextEdit: () => set({ pendingTextEdit: null }),
  setCanvasDrag: (id) => set({ canvasDragId: id }),
  setCanvasDragOver: (over) => set((state) => {
    const prev = state.canvasDragOver
    if (prev === over) return {}
    if (prev && over && prev.parentId === over.parentId && prev.index === over.index) return {}
    return { canvasDragOver: over }
  }),
  setComponentDragFrame: (frame, origin) => set({ componentDragFrame: frame, componentDragOrigin: origin ?? null }),
  setTreePanelTab: (tab) => {
    const state = get()
    const prevTab = state.treePanelTab

    // If in edit mode and switching away from Components, exit edit mode first
    if (state.editingComponentId && tab !== 'components') {
      const restore = state._beforeEditState
      const restorePage = restore ? state.pages.find((p) => p.id === restore.pageId) : null
      if (restorePage) {
        set({
          editingComponentId: null,
          _beforeEditState: null,
          treePanelTab: tab,
          _layersPageId: null,
          activePageId: restorePage.id,
          root: restorePage.root,
        })
        return
      }
    }

    if (tab === 'components' && prevTab !== 'components') {
      // Switching TO Components tab — keep canvas selection intact
      set({
        treePanelTab: tab,
        _layersPageId: state.activePageId,
      })
      return
    }

    if (prevTab === 'components' && tab !== 'components') {
      // Switching FROM Components — restore page, keep selection intact
      const restoreId = state._layersPageId
      const restorePage = restoreId ? state.pages.find((p) => p.id === restoreId) : null
      if (restorePage) {
        set({
          treePanelTab: tab,
          _layersPageId: null,
          activePageId: restorePage.id,
          root: restorePage.root,
        })
        return
      }
    }

    set({ treePanelTab: tab })
  },
  setAdvancedMode: (value) => set((s) => {
    saveViewPrefs({ previewMode: s.previewMode, canvasWidth: s.canvasWidth, advancedMode: value })
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

  // --- Component edit mode ---

  enterComponentEditMode: (componentId) => {
    const state = get()

    // Look for master on the component page
    let compPage = state.pages.find((p) => p.isComponentPage)
    let master = compPage?.root.type === 'box'
      ? compPage.root.children.find((c) => c.id === componentId)
      : null

    // If master not on component page, check catalog and create it there
    if (!master) {
      const catalogComp = useCatalogStore.getState().getComponent(componentId)
      if (!catalogComp) return // component doesn't exist anywhere
      // Use cloneTree to preserve child IDs (instances reference them for overrides)
      const masterFrame = normalizeFrame(cloneTree(catalogComp.frame))
      masterFrame.id = componentId
      get().addComponentMaster(masterFrame)
      // Re-read state after addComponentMaster
      compPage = get().pages.find((p) => p.isComponentPage)
      master = compPage?.root.type === 'box'
        ? compPage.root.children.find((c) => c.id === componentId)
        : null
      if (!master || !compPage) return
    }

    if (!compPage) return

    set({
      _beforeEditState: { pageId: state.activePageId, tab: state.treePanelTab },
      activePageId: compPage.id,
      root: compPage.root,
      editingComponentId: componentId,
      treePanelTab: 'components',
      selectedId: componentId,
      selectedIds: new Set([componentId]),
      hoveredId: null,
    })
  },

  exitComponentEditMode: () => {
    const state = get()
    if (!state.editingComponentId) return
    const restore = state._beforeEditState
    const restorePage = restore ? state.pages.find((p) => p.id === restore.pageId) : null

    if (restorePage) {
      set({
        editingComponentId: null,
        _beforeEditState: null,
        activePageId: restorePage.id,
        root: restorePage.root,
        treePanelTab: restore!.tab,
        selectedId: null,
        selectedIds: new Set(),
        hoveredId: null,
      })
    } else {
      // Fallback: just exit edit mode, stay on first regular page
      const regularPage = state.pages.find((p) => !p.isComponentPage) || state.pages[0]
      set({
        editingComponentId: null,
        _beforeEditState: null,
        activePageId: regularPage.id,
        root: regularPage.root,
        treePanelTab: 'layers',
        selectedId: null,
        selectedIds: new Set(),
        hoveredId: null,
      })
    }
  },

  // --- Component system ---

  getComponentPage: () => {
    return get().pages.find((p) => p.isComponentPage)
  },

  ensureComponentPage: () => {
    const state = get()
    const existing = state.pages.find((p) => p.isComponentPage)
    if (existing) return existing

    const root = createInternalRoot(COMPONENT_PAGE_ID)
    const page: Page = {
      id: COMPONENT_PAGE_ID,
      name: 'Components',
      route: '/__components__',
      root,
      isComponentPage: true,
    }
    set({ pages: [...state.pages, page] })
    return page
  },

  addComponentMaster: (master) => {
    const compPage = get().ensureComponentPage()
    const compPageRoot = get().pages.find((p) => p.isComponentPage)!.root
    const newCompRoot = addChildInTree(compPageRoot, compPageRoot.id, master) as BoxElement
    const pages = updatePageRoot(get().pages, COMPONENT_PAGE_ID, newCompRoot)
    set({ pages, dirty: true })
  },

  createComponent: (frameId) => {
    const state = get()
    const frame = findInTree(state.root, frameId)
    if (!frame || isRootId(frameId)) return null

    // Ensure components page exists
    const compPage = get().ensureComponentPage()

    // Clone frame as master (gets new IDs)
    const master = cloneWithNewIds(normalizeFrame(frame))
    const componentId = master.id

    // Add master to components page root
    const compPageRoot = get().pages.find((p) => p.isComponentPage)!.root
    const newCompRoot = addChildInTree(compPageRoot, compPageRoot.id, master) as BoxElement

    // Replace original frame with a minimal instance (just _componentId + layout props)
    const history = pushHistory(state)
    const instance: Frame = {
      ...cloneTree(frame),
      _componentId: componentId,
      _overrides: {},
    }
    const newRoot = updateInTree(state.root, frameId, () => instance) as BoxElement

    const pages = updatePageRoot(
      updatePageRoot(get().pages, COMPONENT_PAGE_ID, newCompRoot),
      state.activePageId, newRoot,
    )

    set({
      root: newRoot,
      pages,
      dirty: true,
      ...history,
    })

    // Register in catalogStore so it shows in Components panel
    useCatalogStore.getState().registerComponent({
      id: componentId,
      name: master.name || frame.name || 'Component',
      tags: [],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })

    return componentId
  },

  insertInstance: (componentId, parentId, index) => {
    const state = get()

    // Find master in components page
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (!compPage) return null
    const master = findInTree(compPage.root, componentId)
    if (!master) return null

    // Clone master and mark as instance
    const cloned = cloneWithNewIds(normalizeFrame(master))
    cloned._componentId = componentId
    cloned._overrides = {}

    const history = pushHistory(state)
    const parent = findInTree(state.root, parentId)
    if (!parent || parent.type !== 'box') return null

    const insertIdx = index ?? (parent as BoxElement).children.length
    const newRoot = insertChildInTree(state.root, parentId, cloned, insertIdx) as BoxElement

    set({
      ...updateActiveRoot(state, newRoot),
      selectedId: cloned.id,
      selectedIds: new Set([cloned.id]),
      ...history,
    })

    return cloned.id
  },

  detachInstance: (frameId) => set((state) => {
    const frame = findInTree(state.root, frameId)
    if (!frame || !frame._componentId) return {}

    const history = pushHistory(state)
    const newRoot = updateInTree(state.root, frameId, (f) => {
      const detached = { ...f }
      delete detached._componentId
      delete detached._overrides
      return detached as Frame
    }) as BoxElement

    return { ...updateActiveRoot(state, newRoot), ...history }
  }),

  resetInstance: (frameId) => set((state) => {
    const frame = findInTree(state.root, frameId)
    if (!frame || !frame._componentId) return {}

    // Look up master: Components page first, then catalogStore fallback
    let master: Frame | null = null
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (compPage) {
      master = findInTree(compPage.root, frame._componentId)
    }
    if (!master) {
      const catalog = useCatalogStore.getState()
      const comp = catalog.getComponent(frame._componentId)
      if (comp) master = comp.frame
    }
    if (!master) return {} // master deleted

    // Re-clone master tree
    const freshClone = cloneWithNewIds(normalizeFrame(master))

    // Preserve instance's own identity and component link
    freshClone.id = frame.id
    freshClone.name = frame.name
    freshClone._componentId = frame._componentId
    freshClone._overrides = {}

    const history = pushHistory(state)
    const newRoot = updateInTree(state.root, frameId, () => freshClone) as BoxElement

    return { ...updateActiveRoot(state, newRoot), ...history }
  }),

  propagateComponent: (componentId) => {
    // Find new master (just edited on Components page)
    const state = get()
    const compPage = state.pages.find((p) => p.isComponentPage)
    if (!compPage) return

    const newMaster = findInTree(compPage.root, componentId)
    if (!newMaster) return

    // Get original master from catalog (baseline for diffing user overrides)
    const catalogComp = useCatalogStore.getState().getComponent(componentId)
    const originalMaster = catalogComp?.frame ?? null

    // Find all instances across all pages
    const instances = collectInstances(state.pages, componentId)
    if (instances.length === 0) return

    // For each instance, detect user overrides, then apply new master + overrides
    let pages = [...state.pages]
    let currentRoot = state.root

    for (const { pageId, frameId } of instances) {
      const page = pages.find((p) => p.id === pageId)
      if (!page) continue

      const instanceFrame = findInTree(page.root, frameId)
      if (!instanceFrame) continue

      // Detect user overrides by diffing instance vs original master (by structural position)
      const userOverrides = originalMaster
        ? collectUserOverrides(instanceFrame, originalMaster)
        : new Map<string, Record<string, unknown>>()

      // Re-clone new master with new IDs
      const freshClone = cloneWithNewIds(normalizeFrame(newMaster))

      // Preserve instance's own identity and component link
      freshClone.id = instanceFrame.id
      freshClone.name = instanceFrame.name
      freshClone._componentId = componentId
      freshClone._overrides = instanceFrame._overrides || {}

      // Apply user overrides to the fresh clone (by structural position)
      if (userOverrides.size > 0) {
        applyUserOverrides(freshClone, userOverrides, '')
      }

      const newPageRoot = updateInTree(page.root, frameId, () => freshClone) as BoxElement
      pages = updatePageRoot(pages, pageId, newPageRoot)

      if (pageId === state.activePageId) {
        currentRoot = newPageRoot
      }
    }

    // Also update catalog entry with the new master frame
    const catalog = useCatalogStore.getState()
    const comp = catalog.getComponent(componentId)
    if (comp) {
      // Update the catalog's stored frame to the latest master
      catalog.registerComponent({ ...comp, frame: cloneTree(newMaster) })
    }

    set({ pages, root: currentRoot, dirty: true })
  },

  // --- Page management ---

  addPage: (name, route) => set((state) => {
    const id = generatePageId()
    const regularPages = state.pages.filter((p) => !p.isComponentPage)
    const pageName = name || `Page ${regularPages.length + 1}`
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
    if (id === COMPONENT_PAGE_ID) return {} // never remove components page
    const regularPages = state.pages.filter((p) => !p.isComponentPage)
    if (regularPages.length <= 1) return {} // min 1 regular page
    const pages = state.pages.filter((p) => p.id !== id)
    const wasActive = state.activePageId === id
    if (wasActive) {
      const newActive = pages.find((p) => !p.isComponentPage) || pages[0]
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

// Auto-propagate: when editing masters on the Components page, sync all instances
let propagateTimer: ReturnType<typeof setTimeout> | null = null
let lastCompPageRoot: BoxElement | null = null
useFrameStore.subscribe((state) => {
  const compPage = state.pages.find((p) => p.isComponentPage)
  if (!compPage) { lastCompPageRoot = null; return }

  // Only propagate when the Components page root actually changed
  if (compPage.root === lastCompPageRoot) return
  const prevRoot = lastCompPageRoot
  lastCompPageRoot = compPage.root

  // Skip the first time (initialization)
  if (!prevRoot) return

  // Debounce propagation to avoid redundant work during rapid edits
  if (propagateTimer) clearTimeout(propagateTimer)
  propagateTimer = setTimeout(() => {
    propagateTimer = null
    const s = useFrameStore.getState()
    const cp = s.pages.find((p) => p.isComponentPage)
    if (!cp || cp.root.type !== 'box') return
    for (const master of cp.root.children) {
      s.propagateComponent(master.id)
    }
  }, 0)
})
