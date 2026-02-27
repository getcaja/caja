/**
 * canvasDrop tests — pure-logic, no real DOM environment required.
 *
 * The functions under test (getFrameDepth, indexAmongSiblings, resolveCanvasDrop)
 * only depend on a small subset of the HTMLElement API:
 *   - el.hasAttribute('data-frame-id')
 *   - el.getAttribute('data-frame-id')
 *   - el.parentElement
 *   - el.children  (iterable of HTMLElement)
 *   - el.getBoundingClientRect()
 *
 * We build minimal plain-object stubs that satisfy exactly this interface.
 */
import { describe, it, expect, vi } from 'vitest'
import { getFrameDepth, indexAmongSiblings, resolveCanvasDrop } from '../canvasDrop'
import { makeBox, makeText, dvNum } from './helpers'

// ---------------------------------------------------------------------------
// Minimal HTMLElement stub
// ---------------------------------------------------------------------------

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number }

interface FakeEl {
  _frameId: string | null
  _rect: Rect
  _parent: FakeEl | null
  _children: FakeEl[]
  // HTMLElement subset
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null
  get parentElement(): FakeEl | null
  get children(): ArrayLike<FakeEl>
  getBoundingClientRect(): DOMRect
}

function makeEl(
  id: string | null,
  rect: Partial<Rect> = {},
  parent: FakeEl | null = null,
): FakeEl {
  const fullRect: Rect = {
    top: 0, left: 0, right: 100, bottom: 50, width: 100, height: 50,
    ...rect,
  }
  const el: FakeEl = {
    _frameId: id,
    _rect: fullRect,
    _parent: parent,
    _children: [],
    hasAttribute(name: string) {
      return name === 'data-frame-id' && this._frameId !== null
    },
    getAttribute(name: string) {
      return name === 'data-frame-id' ? this._frameId : null
    },
    get parentElement() { return this._parent },
    get children() {
      return this._children as unknown as ArrayLike<FakeEl>
    },
    getBoundingClientRect() {
      return { ...this._rect, x: this._rect.left, y: this._rect.top, toJSON: () => ({}) } as DOMRect
    },
  }
  if (parent) parent._children.push(el)
  return el
}

/** Plain wrapper div (no data-frame-id) — used to add nesting without frame ids */
function makePlainEl(parent: FakeEl | null = null): FakeEl {
  return makeEl(null, {}, parent)
}

// ---------------------------------------------------------------------------
// getFrameDepth
// ---------------------------------------------------------------------------

describe('getFrameDepth', () => {
  it('returns 0 for an element with no data-frame-id ancestors', () => {
    const el = makeEl('root')
    expect(getFrameDepth(el as unknown as HTMLElement)).toBe(0)
  })

  it('returns 1 for a direct child of a frame element', () => {
    const parent = makeEl('parent')
    const child = makeEl('child', {}, parent)
    expect(getFrameDepth(child as unknown as HTMLElement)).toBe(1)
  })

  it('returns 2 for a grandchild', () => {
    const grandparent = makeEl('grandparent')
    const parent = makeEl('parent', {}, grandparent)
    const child = makeEl('child', {}, parent)
    expect(getFrameDepth(child as unknown as HTMLElement)).toBe(2)
  })

  it('returns 0 when the only ancestor lacks a frame id', () => {
    const wrapper = makePlainEl()
    const el = makeEl('el', {}, wrapper)
    expect(getFrameDepth(el as unknown as HTMLElement)).toBe(0)
  })

  it('counts only data-frame-id ancestors, skipping plain wrappers', () => {
    const grandparent = makeEl('gp')
    const plain = makePlainEl(grandparent)
    const child = makeEl('child', {}, plain)
    // grandparent IS a frame ancestor; plain wrapper is not
    expect(getFrameDepth(child as unknown as HTMLElement)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// indexAmongSiblings — column direction
// ---------------------------------------------------------------------------

describe('indexAmongSiblings — column direction', () => {
  /**
   * Three vertically stacked children:
   *   c0: top=0,   bottom=50  → midpoint y=25
   *   c1: top=60,  bottom=110 → midpoint y=85
   *   c2: top=120, bottom=170 → midpoint y=145
   */
  function makeColumnParent(): FakeEl {
    const parent = makePlainEl()
    makeEl('c0', { top: 0, bottom: 50, height: 50 }, parent)
    makeEl('c1', { top: 60, bottom: 110, height: 50 }, parent)
    makeEl('c2', { top: 120, bottom: 170, height: 50 }, parent)
    return parent
  }

  it('returns 0 when cursor is above the midpoint of the first child', () => {
    const parent = makeColumnParent()
    // cy=10 < midpoint of c0 (25)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 10)).toBe(0)
  })

  it('returns 1 when cursor is between child 0 and child 1', () => {
    const parent = makeColumnParent()
    // cy=55 — past c0 midpoint (25) but before c1 midpoint (85)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 55)).toBe(1)
  })

  it('returns 2 when cursor is between child 1 and child 2', () => {
    const parent = makeColumnParent()
    // cy=115 — past c1 midpoint (85) but before c2 midpoint (145)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 115)).toBe(2)
  })

  it('returns 3 (length) when cursor is below all children', () => {
    const parent = makeColumnParent()
    // cy=200 — past all midpoints
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 200)).toBe(3)
  })

  it('returns 1 for a single child when cursor is below its midpoint', () => {
    const parent = makePlainEl()
    makeEl('only', { top: 0, bottom: 50, height: 50 }, parent)
    // cy=30 > midpoint (25) → index 1
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 30)).toBe(1)
  })

  it('ignores child elements that lack data-frame-id', () => {
    const parent = makeColumnParent()
    makePlainEl(parent) // extra plain child — must not shift indices
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 10)).toBe(0)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'column', 50, 200)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// indexAmongSiblings — row direction
// ---------------------------------------------------------------------------

describe('indexAmongSiblings — row direction', () => {
  /**
   * Three horizontally laid-out children:
   *   r0: left=0,   right=100  → midpoint x=50
   *   r1: left=110, right=210  → midpoint x=160
   *   r2: left=220, right=320  → midpoint x=270
   */
  function makeRowParent(): FakeEl {
    const parent = makePlainEl()
    makeEl('r0', { left: 0, right: 100, width: 100 }, parent)
    makeEl('r1', { left: 110, right: 210, width: 100 }, parent)
    makeEl('r2', { left: 220, right: 320, width: 100 }, parent)
    return parent
  }

  it('returns 0 when cursor is left of the midpoint of the first child', () => {
    const parent = makeRowParent()
    // cx=20 < midpoint of r0 (50)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row', 20, 25)).toBe(0)
  })

  it('returns 1 when cursor is between child 0 and child 1', () => {
    const parent = makeRowParent()
    // cx=105 — past r0 midpoint (50) but before r1 midpoint (160)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row', 105, 25)).toBe(1)
  })

  it('returns 3 (length) when cursor is right of all children', () => {
    const parent = makeRowParent()
    // cx=400 — past all midpoints
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row', 400, 25)).toBe(3)
  })

  it('returns 0 for a single child when cursor is left of its midpoint', () => {
    const parent = makePlainEl()
    makeEl('only', { left: 0, right: 100, width: 100 }, parent)
    // cx=10 < midpoint (50) → index 0
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row', 10, 25)).toBe(0)
  })

  it('handles row-reverse the same as row (uses cx axis)', () => {
    const parent = makeRowParent()
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row-reverse', 20, 25)).toBe(0)
    expect(indexAmongSiblings(parent as unknown as HTMLElement, 'row-reverse', 400, 25)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// resolveCanvasDrop helpers
// ---------------------------------------------------------------------------

/**
 * Standard frame tree:
 *
 *   root  (box, column, id='root')
 *     child1 (box, column, id='child1')
 *       gc1   (text, id='gc1')
 *       gc2   (text, id='gc2')
 *     child2 (box, column, id='child2')   ← empty
 */
function buildStandardTree() {
  const gc1 = makeText({ id: 'gc1' })
  const gc2 = makeText({ id: 'gc2' })
  const child1 = makeBox({ id: 'child1', direction: 'column', children: [gc1, gc2] })
  const child2 = makeBox({ id: 'child2', direction: 'column', children: [] })
  const root = makeBox({ id: 'root', direction: 'column', children: [child1, child2] })
  return { root, child1, child2, gc1, gc2 }
}

/**
 * Standard DOM structure mirroring the frame tree above.
 *
 *   rootEl  (id='root',   top=0,   left=0,   right=400, bottom=600)
 *     child1El (id='child1', top=10,  left=10,  right=190, bottom=290)
 *       gc1El  (id='gc1',   top=10,  left=10,  right=190, bottom=140)
 *       gc2El  (id='gc2',   top=150, left=10,  right=190, bottom=290)
 *     child2El (id='child2', top=10,  left=210, right=390, bottom=290)
 */
function buildStandardDom() {
  const rootEl = makeEl('root', { top: 0, left: 0, right: 400, bottom: 600, width: 400, height: 600 })
  const child1El = makeEl(
    'child1',
    { top: 10, left: 10, right: 190, bottom: 290, width: 180, height: 280 },
    rootEl,
  )
  const gc1El = makeEl(
    'gc1',
    { top: 10, left: 10, right: 190, bottom: 140, width: 180, height: 130 },
    child1El,
  )
  const gc2El = makeEl(
    'gc2',
    { top: 150, left: 10, right: 190, bottom: 290, width: 180, height: 140 },
    child1El,
  )
  const child2El = makeEl(
    'child2',
    { top: 10, left: 210, right: 390, bottom: 290, width: 180, height: 280 },
    rootEl,
  )
  return { rootEl, child1El, child2El, gc1El, gc2El }
}

/** Build a minimal Document stub whose elementFromPoint returns the given element. */
function mockDoc(el: FakeEl | null): Document {
  return { elementFromPoint: vi.fn(() => el) } as unknown as Document
}

// ---------------------------------------------------------------------------
// resolveCanvasDrop
// ---------------------------------------------------------------------------

describe('resolveCanvasDrop', () => {
  it('returns null when elementFromPoint returns null', () => {
    const { root } = buildStandardTree()
    expect(resolveCanvasDrop(mockDoc(null), 50, 50, null, root)).toBeNull()
  })

  it('falls back to root box when cursor is over a non-frame element (empty space)', () => {
    const { root } = buildStandardTree()
    // A plain element with no data-frame-id and no frame ancestors simulates empty space
    const emptySpace = makePlainEl()
    const result = resolveCanvasDrop(mockDoc(emptySpace), 999, 999, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('root')
    // root has 2 children → fallback appends at end
    expect(result!.index).toBe(2)
  })

  it('returns null when cursor is over empty space and root is not a box', () => {
    const textRoot = makeText({ id: 'text-root' })
    const emptySpace = makePlainEl()
    expect(resolveCanvasDrop(mockDoc(emptySpace), 0, 0, null, textRoot)).toBeNull()
  })

  it('returns index 0 when dropping into an empty child2 box (eager accept)', () => {
    const { root } = buildStandardTree()
    const { child2El } = buildStandardDom()
    // cx=300 is well inside child2El center — not near any edge zone
    const result = resolveCanvasDrop(mockDoc(child2El), 300, 150, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('child2')
    expect(result!.index).toBe(0)
  })

  it('drops into child1 when cursor is at its center (not in edge zone)', () => {
    const { root } = buildStandardTree()
    const { child1El } = buildStandardDom()
    // child1El: left=10, right=190, top=10, bottom=290 — center cx=100, cy=150
    const result = resolveCanvasDrop(mockDoc(child1El), 100, 150, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('child1')
  })

  it('inserts as sibling in parent box when cursor is over a non-box (text) element', () => {
    const { root } = buildStandardTree()
    const { gc1El } = buildStandardDom()
    // gc1 is a text node — nearest box parent is child1
    const result = resolveCanvasDrop(mockDoc(gc1El), 100, 75, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('child1')
  })

  it('returns null when cursor is over the excluded frame (excludeId = targetId)', () => {
    const { root } = buildStandardTree()
    const { child1El } = buildStandardDom()
    expect(resolveCanvasDrop(mockDoc(child1El), 100, 150, 'child1', root)).toBeNull()
  })

  it('returns null when cursor is over a descendant of the excluded frame', () => {
    const { root } = buildStandardTree()
    const { gc1El } = buildStandardDom()
    // gc1 is a descendant of child1 (excluded) — resolveCanvasDrop detects this via
    // isDescendant(root, excludeId='child1', targetId='gc1') and returns null
    const result = resolveCanvasDrop(mockDoc(gc1El), 100, 75, 'child1', root)
    expect(result).toBeNull()
  })

  it('respects maxDropDepth and walks up when target is too deep', () => {
    const { root } = buildStandardTree()
    const { child1El } = buildStandardDom()
    // child1El depth = 1 (rootEl is its frame ancestor); maxDropDepth=0 → must use root
    const result = resolveCanvasDrop(mockDoc(child1El), 100, 150, null, root, 0)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('root')
  })

  it('accepts drop into empty box at exactly maxDropDepth', () => {
    const { root } = buildStandardTree()
    const { child2El } = buildStandardDom()
    // child2 is empty and at depth 1; maxDropDepth=1 → depth <= maxDropDepth → accepts
    const result = resolveCanvasDrop(mockDoc(child2El), 300, 150, null, root, 1)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('child2')
    expect(result!.index).toBe(0)
  })

  it('escapes to parent when cursor is in the leading edge zone of a box', () => {
    const { root } = buildStandardTree()
    const { child1El } = buildStandardDom()
    // child1El: top=10, EDGE_ZONE=12px → zone is 10..22 → cy=14 is inside edge zone
    const result = resolveCanvasDrop(mockDoc(child1El), 100, 14, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('root')
  })

  it('escapes to parent when cursor is in the trailing edge zone of a box', () => {
    const { root } = buildStandardTree()
    const { child1El } = buildStandardDom()
    // child1El: bottom=290, EDGE_ZONE=12px → zone is 278..290 → cy=285 is inside edge zone
    const result = resolveCanvasDrop(mockDoc(child1El), 100, 285, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('root')
  })

  it('works normally when excludeId is null', () => {
    const { root } = buildStandardTree()
    const { child2El } = buildStandardDom()
    const result = resolveCanvasDrop(mockDoc(child2El), 300, 150, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('child2')
  })

  it('drops into root when cursor is directly over the root frame element', () => {
    const gc1 = makeText({ id: 'gc1-r' })
    const child1 = makeBox({ id: 'child1-r', direction: 'column', children: [gc1] })
    const root = makeBox({ id: 'root-r', direction: 'column', children: [child1] })

    const rootEl = makeEl('root-r', { top: 0, left: 0, right: 400, bottom: 600, width: 400, height: 600 })
    makeEl('child1-r', { top: 50, left: 50, right: 200, bottom: 200, width: 150, height: 150 }, rootEl)

    // Cursor at cx=350, cy=300 — well inside rootEl but not over child1El
    // elementFromPoint returns rootEl, which has children so we go through the normal path
    const result = resolveCanvasDrop(mockDoc(rootEl), 350, 300, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('root-r')
  })
})

// ---------------------------------------------------------------------------
// resolveCanvasDrop — edge cases
// ---------------------------------------------------------------------------

describe('resolveCanvasDrop — edge cases', () => {
  it('returns null when elementFromPoint returns null (explicit coverage)', () => {
    const root = makeBox({ id: 'root', children: [] })
    expect(resolveCanvasDrop(mockDoc(null), 0, 0, null, root)).toBeNull()
  })

  it('returns null when root is non-box and cursor is over empty space', () => {
    const root = makeText({ id: 'root-text' })
    expect(resolveCanvasDrop(mockDoc(makePlainEl()), 0, 0, null, root)).toBeNull()
  })

  it('returns { parentId: root, index: 0 } when root is empty box and cursor is over empty space', () => {
    const root = makeBox({ id: 'empty-root', children: [] })
    const result = resolveCanvasDrop(mockDoc(makePlainEl()), 0, 0, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('empty-root')
    expect(result!.index).toBe(0)
  })

  it('returns null when the frame id on a DOM element is not found in the tree', () => {
    const root = makeBox({ id: 'root', children: [] })
    const orphan = makeEl('nonexistent-id', { top: 0, left: 0, right: 100, bottom: 50, width: 100, height: 50 })
    // findInTree returns null for 'nonexistent-id' → resolveCanvasDrop should return null
    expect(resolveCanvasDrop(mockDoc(orphan), 50, 25, null, root)).toBeNull()
  })

  it('drops into a grid box (effectiveDir → row when gridCols > 1)', () => {
    const child = makeText({ id: 'grid-child' })
    const gridRoot = makeBox({
      id: 'grid-root',
      display: 'grid',
      direction: 'row',
      gridCols: dvNum(3),
      children: [child],
    })

    const gridRootEl = makeEl('grid-root', { top: 0, left: 0, right: 300, bottom: 100, width: 300, height: 100 })
    const gridChildEl = makeEl(
      'grid-child',
      { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 },
      gridRootEl,
    )

    // Cursor over grid child (text) → inserts as sibling in grid parent
    const result = resolveCanvasDrop(mockDoc(gridChildEl), 50, 50, null, gridRoot)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('grid-root')
  })

  it('handles deeply nested trees without throwing', () => {
    // Build: root → level1 → level2 → level3 (text)
    const level3 = makeText({ id: 'l3' })
    const level2 = makeBox({ id: 'l2', direction: 'column', children: [level3] })
    const level1 = makeBox({ id: 'l1', direction: 'column', children: [level2] })
    const root = makeBox({ id: 'root-deep', direction: 'column', children: [level1] })

    const rootEl = makeEl('root-deep', { top: 0, left: 0, right: 400, bottom: 600, width: 400, height: 600 })
    const l1El = makeEl('l1', { top: 0, left: 0, right: 300, bottom: 400, width: 300, height: 400 }, rootEl)
    const l2El = makeEl('l2', { top: 0, left: 0, right: 200, bottom: 200, width: 200, height: 200 }, l1El)
    const l3El = makeEl('l3', { top: 0, left: 0, right: 150, bottom: 100, width: 150, height: 100 }, l2El)

    // Cursor over l3 (text) — nearest box parent is l2
    const result = resolveCanvasDrop(mockDoc(l3El), 75, 50, null, root)
    expect(result).not.toBeNull()
    expect(result!.parentId).toBe('l2')
  })
})
