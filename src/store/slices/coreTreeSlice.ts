import type { StateCreator } from 'zustand'
import type { Frame, BoxElement, TextElement, ImageElement, ButtonElement, InputElement, TextareaElement, SelectElement, DesignValue, Spacing, SizeValue, BorderRadius, Page, ResponsiveOverrides } from '../../types/frame'
import type { FrameStore } from '../frameStore'
import {
  isRootId, findInTree, findParent, cloneWithNewIds, updateInTree,
  insertChildInTree, addChildInTree, removeFromTree, moveInTree,
  duplicateInTree, wrapInFrameInTree, updateActiveRoot, updatePageRoot,
  getChildren, withChildren, nextName,
  isInstanceOrInsideInstance, isChildOfInstance,
} from '../treeHelpers'
import {
  createBox, createText, createImage, createButton, createInput,
  createTextarea, createSelect, createLink, createInternalRoot,
  normalizeFrame, cloneTree,
} from '../frameFactories'
import { useCatalogStore } from '../catalogStore'

const MAX_HISTORY = 50

export function pushHistory(state: { root: BoxElement; past: Record<string, BoxElement[]>; future: Record<string, BoxElement[]>; activePageId: string; _previewSnapshot: BoxElement | null }) {
  if (state._previewSnapshot) return {}
  const pageId = state.activePageId
  const pagePast = state.past[pageId] || []
  return {
    past: { ...state.past, [pageId]: [...pagePast.slice(-(MAX_HISTORY - 1)), cloneTree(state.root) as BoxElement] },
    future: { ...state.future, [pageId]: [] as BoxElement[] },
    dirty: true,
  }
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

const initialPageId = 'page-1'
const initialRoot = createInternalRoot(initialPageId)
const initialPages: Page[] = [{ id: initialPageId, name: 'Page 1', route: '/page-1', root: initialRoot }]

export interface CoreTreeSlice {
  root: BoxElement
  pages: Page[]
  activePageId: string
  dirty: boolean
  past: Record<string, BoxElement[]>
  future: Record<string, BoxElement[]>
  _previewSnapshot: BoxElement | null
  _lastDuplicateMap: Record<string, string> | null

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
  toggleHidden: (id: string) => void

  removeSelected: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: () => void

  startPreview: () => void
  endPreview: (commit: boolean) => void
  undo: () => void
  redo: () => void
}

export const createCoreTreeSlice: StateCreator<FrameStore, [], [], CoreTreeSlice> = (set, get) => ({
  root: initialRoot,
  pages: initialPages,
  activePageId: initialPageId,
  dirty: false,
  past: {},
  future: {},
  _previewSnapshot: null,
  _lastDuplicateMap: null,

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
      const result = wrapInFrameInTree(state.root, id, createBox)
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
        const result = wrapInFrameInTree(state.root, id, createBox)
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
        const spacingMerged = { ...existingOverride, ...values }
        const newSpacing = { top: spacingMerged.top ?? ZERO, right: spacingMerged.right ?? ZERO, bottom: spacingMerged.bottom ?? ZERO, left: spacingMerged.left ?? ZERO }
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

  toggleHidden: (id) =>
    set((state) => {
      const frame = findInTree(state.root, id)
      if (!frame) return {}
      const history = pushHistory(state)
      const newRoot = updateInTree(state.root, id, (f) => ({ ...f, hidden: !f.hidden })) as BoxElement
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
})
