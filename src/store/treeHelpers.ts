import type { Frame, BoxElement } from '../types/frame'
import { cloneTree } from './frameFactories'

// --- ID generators ---

let nextId = 1
export function generateId(): string {
  return `frame-${nextId++}`
}

let nextPageId = 2
export function generatePageId(): string {
  return `page-${nextPageId++}`
}

/** Reset ID counters (used by newFile, loadFromStorage, etc.) */
export function resetIdCounters(frameId: number, pageId: number) {
  nextId = frameId
  nextPageId = pageId
}

/** Get current nextId value (for tests or debugging) */
export function getNextId(): number {
  return nextId
}

// Each page gets a unique root ID: __root__<pageId>
export function rootIdForPage(pageId: string): string {
  return `__root__${pageId}`
}

/** Check whether an ID belongs to an internal root frame */
export function isRootId(id: string): boolean {
  return id.startsWith('__root__')
}

// --- Pure tree helpers ---

// Get children (text and image elements have none)
export function getChildren(frame: Frame): Frame[] {
  return frame.type === 'box' ? frame.children : []
}

// Set children on a frame (only works for box)
export function withChildren(frame: Frame, children: Frame[]): Frame {
  if (frame.type === 'box') return { ...frame, children }
  return frame
}

// Collect all names in the tree
export function collectNames(frame: Frame): Set<string> {
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
export function nextName(prefix: string, root: Frame): string {
  const names = collectNames(root)
  let i = 1
  while (names.has(`${prefix}-${i}`)) i++
  return `${prefix}-${i}`
}

// Find a frame by id
export function findInTree(root: Frame, id: string): Frame | null {
  if (root.id === id) return root
  for (const child of getChildren(root)) {
    const found = findInTree(child, id)
    if (found) return found
  }
  return null
}

// Find and update a frame in the tree by id
export function updateInTree(root: Frame, id: string, updater: (f: Frame) => Frame): Frame {
  if (root.id === id) {
    return updater(root)
  }
  return withChildren(
    root,
    getChildren(root).map((child) => updateInTree(child, id, updater))
  )
}

// Insert a child frame at a specific index
export function insertChildInTree(root: Frame, parentId: string, child: Frame, index: number): Frame {
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
export function addChildInTree(root: Frame, parentId: string, child: Frame): Frame {
  if (root.id === parentId && root.type === 'box') {
    return { ...root, children: [...root.children, child] }
  }
  return withChildren(
    root,
    getChildren(root).map((c) => addChildInTree(c, parentId, child))
  )
}

// Remove a frame from the tree by id (never removes internal root)
export function removeFromTree(root: Frame, id: string): Frame {
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
export function moveInTree(root: Frame, frameId: string, newParentId: string, index: number): Frame {
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

/** Walk up from `id` to find the direct child of root (top-level ancestor).
 *  Returns the id itself if it's already a direct child of root, or null if not found. */
export function findTopLevelAncestor(root: Frame, id: string): string | null {
  if (root.type !== 'box') return null
  // Direct child of root?
  if (root.children.some((c) => c.id === id)) return id
  // Walk up
  let current = id
  let parent = findParent(root, current)
  while (parent) {
    if (parent.id === root.id) return current
    current = parent.id
    parent = findParent(root, current)
  }
  return null
}

/** Given an ancestor frame, find its direct child that contains descendantId.
 *  Returns descendantId itself if it IS a direct child of ancestor.
 *  Returns null if descendantId is not inside ancestor. */
export function resolveToDirectChild(root: Frame, ancestorId: string, descendantId: string): string | null {
  if (ancestorId === descendantId) return null // can't be a child of itself
  const ancestor = findInTree(root, ancestorId)
  if (!ancestor || ancestor.type !== 'box') return null
  // Direct child?
  if (ancestor.children.some((c) => c.id === descendantId)) return descendantId
  // Check if descendant is inside ancestor at all
  if (!findInTree(ancestor, descendantId)) return null
  // Walk up from descendant to find the direct child of ancestor
  let current = descendantId
  let parent = findParent(root, current)
  while (parent && parent.id !== ancestorId) {
    current = parent.id
    parent = findParent(root, current)
  }
  return parent ? current : null
}

// Deep clone with new IDs (for duplication)
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

/** Append " (Copy)" to a name, or increment "Copy N" if already a copy */
export function appendCopySuffix(name: string): string {
  const match = name.match(/^(.*)\(Copy(?: (\d+))?\)\s*$/)
  if (match) {
    const base = match[1].trimEnd()
    const n = match[2] ? parseInt(match[2], 10) + 1 : 2
    return `${base} (Copy ${n})`
  }
  return `${name} (Copy)`
}

// Duplicate a frame next to itself
export function duplicateInTree(root: Frame, id: string): { tree: Frame; newId: string; idMap: Record<string, string> } | null {
  const target = findInTree(root, id)
  if (!target) return null
  if (isRootId(target.id)) return null // can't duplicate internal root
  const idMap: Record<string, string> = {}
  const clone = cloneWithNewIds(target, idMap)
  clone.name = appendCopySuffix(clone.name)
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
export function wrapInFrameInTree(root: Frame, id: string, createBox: (opts?: { children: Frame[] }) => BoxElement): { tree: Frame; wrapperId: string } | null {
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
export function maxIdInTree(frame: Frame): number {
  const num = parseInt(frame.id.split('-')[1] || '0')
  const childMax = getChildren(frame).map(maxIdInTree)
  return Math.max(isNaN(num) ? 0 : num, ...childMax, 0)
}

// Update both root and the active page's root in the pages array
export function updateActiveRoot<P extends { id: string; root: BoxElement }>(state: { pages: P[]; activePageId: string }, newRoot: BoxElement): { pages: P[]; root: BoxElement } {
  return {
    root: newRoot,
    pages: state.pages.map((p) => p.id === state.activePageId ? { ...p, root: newRoot } : p),
  }
}

// Update a specific page's root in the pages array
export function updatePageRoot<P extends { id: string; root: BoxElement }>(pages: P[], pageId: string, newRoot: BoxElement): P[] {
  return pages.map((p) => p.id === pageId ? { ...p, root: newRoot } : p)
}

/** Check if a target is an instance or inside one. Used to prevent inserting children. */
export function isInstanceOrInsideInstance(root: Frame, targetId: string): boolean {
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

// --- Drill-down resolution (shared by canvas click + hover) ---

/** Compute the drill-down context: the container whose direct children are the
 *  candidates for selection/hover.  When a non-root frame is selected, the context
 *  is its parent; when root (or nothing) is selected, the context is root itself. */
export function getDrillContext(root: Frame, selectedId: string | null): string {
  if (selectedId && !isRootId(selectedId)) {
    const parent = findParent(root, selectedId)
    if (parent) return parent.id
  }
  return root.id
}

/** Resolve a target frame to the current drill-down level.
 *  Returns the direct child of `contextId` that contains `targetId`,
 *  or the top-level ancestor if `targetId` is outside the context.
 *  Returns `null` when `targetId` IS the context (hovering the background). */
export function resolveToContextLevel(root: Frame, contextId: string, targetId: string): string | null {
  // Clicking/hovering the context itself → select root (click) or suppress (hover)
  if (targetId === contextId) return null

  // Try to resolve within context
  const resolved = resolveToDirectChild(root, contextId, targetId)
  if (resolved) return resolved

  // Outside context → fall back to top-level ancestor
  return findTopLevelAncestor(root, targetId) ?? targetId
}

/** Check if a frame is a child INSIDE an instance (but not the instance root itself). */
export function isChildOfInstance(root: Frame, frameId: string): boolean {
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
