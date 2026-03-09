/**
 * SelectionOverlay logic tests — verifies CSS rule generation,
 * hover/selection suppression, and rule prioritization.
 */
import { describe, it, expect } from 'vitest'
import { buildOverlayRules } from '../SelectionOverlay'

// ── CSS rule generation ──

describe('buildOverlayRules', () => {
  const base = {
    selectedId: null as string | null,
    selectedIds: new Set<string>(),
    selectedParentId: null as string | null,
    hoveredId: null as string | null,
    showSel: false,
    showHov: false,
    canvasDragId: null as string | null,
    showDragGuides: false,
    dragTargetParentId: null as string | null,
  }

  it('returns empty array when nothing is active', () => {
    expect(buildOverlayRules(base)).toEqual([])
  })

  it('generates selection outline rule', () => {
    const rules = buildOverlayRules({ ...base, selectedId: 'frame-1', showSel: true })
    expect(rules).toHaveLength(2)
    expect(rules[0]).toContain('[data-frame-id="frame-1"]')
    expect(rules[0]).toContain('outline: 1px solid')
    expect(rules[0]).toContain('outline-offset: -1px')
    expect(rules[1]).toContain('> [data-frame-id]')
    expect(rules[1]).toContain('dotted')
  })

  it('generates parent hint when selectedParentId is set', () => {
    const rules = buildOverlayRules({ ...base, selectedId: 'child-1', selectedParentId: 'parent-1', showSel: true })
    expect(rules).toHaveLength(3)
    // Parent hint first, then selection, then child hints
    expect(rules[0]).toContain('[data-frame-id="parent-1"]')
    expect(rules[0]).toContain('dotted')
    expect(rules[1]).toContain('[data-frame-id="child-1"]')
    expect(rules[1]).toContain('solid')
  })

  it('generates hover outline rule', () => {
    const rules = buildOverlayRules({ ...base, hoveredId: 'frame-2', showHov: true })
    expect(rules).toHaveLength(2)
    expect(rules[0]).toContain('[data-frame-id="frame-2"]')
    expect(rules[0]).toContain('outline: 2px solid')
    expect(rules[0]).toContain('outline-offset: -2px')
    expect(rules[1]).toContain('> [data-frame-id]')
    expect(rules[1]).toContain('dotted')
  })

  it('generates both selection and hover rules when both active', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'frame-1', showSel: true,
      hoveredId: 'frame-2', showHov: true,
    })
    expect(rules).toHaveLength(4)
    // Selection rules first, then hover
    expect(rules[0]).toContain('frame-1')
    expect(rules[0]).toContain('solid')
    expect(rules[2]).toContain('frame-2')
    expect(rules[2]).toContain('2px solid')
  })

  it('parent hint + selection + child hints + hover = 5 rules', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'child-1', selectedParentId: 'parent-1', showSel: true,
      hoveredId: 'sibling-1', showHov: true,
    })
    // parent-hint(dotted) + sel(solid) + child-hints(dotted) + hover(2px solid) + hover-child-hints(dotted)
    expect(rules).toHaveLength(5)
    expect(rules[0]).toContain('parent-1')
    expect(rules[0]).toContain('dotted')
    expect(rules[1]).toContain('child-1')
    expect(rules[1]).toContain('1px solid')
    expect(rules[2]).toContain('> [data-frame-id]')
    expect(rules[3]).toContain('sibling-1')
    expect(rules[3]).toContain('2px solid')
  })

  it('no parent hint when selectedParentId is null', () => {
    const rules = buildOverlayRules({ ...base, selectedId: 'frame-1', selectedParentId: null, showSel: true })
    expect(rules).toHaveLength(2)
    // First rule is selection, not parent hint
    expect(rules[0]).toContain('1px solid')
    expect(rules[0]).not.toContain('dotted')
  })

  it('parent hint not generated when showSel is false', () => {
    const rules = buildOverlayRules({ ...base, selectedId: 'child-1', selectedParentId: 'parent-1', showSel: false })
    expect(rules).toEqual([])
  })

  it('excludes dragged element from child guides', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'frame-1', showSel: true,
      canvasDragId: 'child-1',
    })
    expect(rules[1]).toContain(':not([data-frame-id="child-1"])')
  })

  it('generates drag sibling guide rules', () => {
    const rules = buildOverlayRules({
      ...base,
      canvasDragId: 'frame-3',
      showDragGuides: true,
      dragTargetParentId: 'frame-2',
    })
    expect(rules).toHaveLength(1)
    expect(rules[0]).toContain('[data-frame-id="frame-2"] > [data-frame-id]')
    expect(rules[0]).toContain(':not([data-frame-id="frame-3"])')
    expect(rules[0]).toContain('dotted')
  })

  it('does not generate rules when showSel is false', () => {
    const rules = buildOverlayRules({ ...base, selectedId: 'frame-1', showSel: false })
    expect(rules).toEqual([])
  })

  it('does not generate rules when showHov is false', () => {
    const rules = buildOverlayRules({ ...base, hoveredId: 'frame-1', showHov: false })
    expect(rules).toEqual([])
  })

  it('hover child-hints exclude primary selected element', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'child-1', showSel: true,
      hoveredId: 'parent-1', showHov: true,
    })
    // Hover child-hints rule starts with the hovered element's selector
    const hoverChildRule = rules.find(r => r.startsWith('[data-frame-id="parent-1"] >'))
    expect(hoverChildRule).toContain(':not([data-frame-id="child-1"])')
  })

  it('hover child-hints exclude all multi-selected elements', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'child-1',
      selectedIds: new Set(['child-1', 'child-2']),
      showSel: true,
      hoveredId: 'parent-1', showHov: true,
    })
    const hoverChildRule = rules.find(r => r.startsWith('[data-frame-id="parent-1"] >'))
    expect(hoverChildRule).toContain(':not([data-frame-id="child-1"])')
    expect(hoverChildRule).toContain(':not([data-frame-id="child-2"])')
  })

  it('drag guides exclude selected elements', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'sel-1', showSel: true,
      canvasDragId: 'drag-1',
      showDragGuides: true,
      dragTargetParentId: 'parent-1',
    })
    const dragRule = rules.find(r => r.includes('parent-1') && r.includes('> [data-frame-id]'))
    expect(dragRule).toContain(':not([data-frame-id="drag-1"])')
    expect(dragRule).toContain(':not([data-frame-id="sel-1"])')
  })

  it('selection child-hints exclude hovered element', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'parent-1', showSel: true,
      hoveredId: 'child-1', showHov: true,
    })
    const childHintRule = rules.find(r => r.startsWith('[data-frame-id="parent-1"] >'))
    expect(childHintRule).toContain(':not([data-frame-id="child-1"])')
  })

  it('secondary selections get solid outlines', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'frame-1',
      selectedIds: new Set(['frame-1', 'frame-2', 'frame-3']),
      showSel: true,
    })
    // Primary + child-hints + 2 secondary = 4 rules
    const secondaryRules = rules.filter(r => r.includes('frame-2') || r.includes('frame-3'))
    expect(secondaryRules).toHaveLength(2)
    secondaryRules.forEach(r => {
      expect(r).toContain('1px solid')
      expect(r).not.toContain('dotted')
    })
  })

  it('secondary selections do not generate child-hints', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'frame-1',
      selectedIds: new Set(['frame-1', 'frame-2']),
      showSel: true,
    })
    // Only primary gets child-hints
    const childHintRules = rules.filter(r => r.includes('> [data-frame-id]'))
    expect(childHintRules).toHaveLength(1)
    expect(childHintRules[0]).toContain('frame-1')
  })

  it('drag guides without selection have no selection exclusions', () => {
    const rules = buildOverlayRules({
      ...base,
      canvasDragId: 'drag-1',
      showDragGuides: true,
      dragTargetParentId: 'parent-1',
    })
    expect(rules).toHaveLength(1)
    expect(rules[0]).toContain(':not([data-frame-id="drag-1"])')
    // No selection exclusion since selectedId is null
    expect(rules[0]).not.toContain(':not([data-frame-id="null"])')
  })

  it('parent hint uses dotted style distinct from solid selection', () => {
    const rules = buildOverlayRules({
      ...base,
      selectedId: 'child-1', selectedParentId: 'parent-1', showSel: true,
    })
    const parentRule = rules[0]
    const selRule = rules[1]
    expect(parentRule).toContain('dotted')
    expect(parentRule).not.toContain('!important; outline-offset: -1px !important')
    expect(selRule).toContain('solid')
    expect(selRule).toContain('!important')
  })

})

// ── Hover source (tree vs canvas) ──

describe('Tree hover vs canvas hover behavior', () => {
  // These test the isTreeHover flag behavior conceptually.
  // The actual effectiveHoveredId selector runs in React, but we verify
  // the expected resolution logic here.

  type Node = { id: string; type: 'box' | 'text'; children: Node[] }

  function findParent(root: Node, id: string): Node | null {
    for (const child of root.children) {
      if (child.id === id) return root
      if (child.type === 'box') {
        const found = findParent(child, id)
        if (found) return found
      }
    }
    return null
  }

  function resolveToDirectChild(root: Node, ancestorId: string, descendantId: string): string | null {
    if (ancestorId === descendantId) return null
    function findInTree(node: Node, id: string): Node | null {
      if (node.id === id) return node
      if (node.type === 'box') {
        for (const c of node.children) { const f = findInTree(c, id); if (f) return f }
      }
      return null
    }
    const ancestor = findInTree(root, ancestorId)
    if (!ancestor || ancestor.type !== 'box') return null
    if (ancestor.children.some(c => c.id === descendantId)) return descendantId
    if (!findInTree(ancestor, descendantId)) return null
    let current = descendantId
    let parent = findParent(root, current)
    while (parent && parent.id !== ancestorId) { current = parent.id; parent = findParent(root, current) }
    return parent ? current : null
  }

  /** Mirrors the shared getDrillContext + resolveToContextLevel logic */
  function resolveHover(
    root: Node,
    selectedId: string | null,
    hoveredId: string | null,
    isTreeHover: boolean,
  ): string | null {
    if (!hoveredId) return null
    // Tree hover bypasses drill-down
    if (isTreeHover) return hoveredId

    // getDrillContext equivalent
    let contextId = root.id
    if (selectedId && !selectedId.startsWith('__root__')) {
      const parent = findParent(root, selectedId)
      if (parent) contextId = parent.id
    }
    // resolveToContextLevel equivalent
    if (hoveredId === contextId) return null
    const resolved = resolveToDirectChild(root, contextId, hoveredId)
    if (resolved) return resolved
    // Fall back: not in context
    return null
  }

  const tree: Node = {
    id: '__root__p1', type: 'box', children: [
      {
        id: 'hero', type: 'box', children: [
          { id: 'title', type: 'text', children: [] },
          {
            id: 'cta-row', type: 'box', children: [
              { id: 'btn-1', type: 'text', children: [] },
              { id: 'btn-2', type: 'text', children: [] },
            ],
          },
        ],
      },
      { id: 'footer', type: 'text', children: [] },
    ],
  }

  it('tree hover returns exact element regardless of drill depth', () => {
    // Selected: title (inside hero). Context = hero.
    // Canvas hover on btn-1 would resolve to cta-row (direct child of hero).
    // Tree hover on btn-1 should return btn-1 directly.
    expect(resolveHover(tree, 'title', 'btn-1', true)).toBe('btn-1')
  })

  it('canvas hover resolves deeply nested to direct child of context', () => {
    // Selected: title. Context = hero. Hover on btn-1 → cta-row
    expect(resolveHover(tree, 'title', 'btn-1', false)).toBe('cta-row')
  })

  it('canvas hover on direct child of context returns it directly', () => {
    // Selected: title. Context = hero. Hover on cta-row → cta-row
    expect(resolveHover(tree, 'title', 'cta-row', false)).toBe('cta-row')
  })

  it('canvas hover on context itself returns null', () => {
    // Selected: title. Context = hero. Hover on hero → null (background)
    expect(resolveHover(tree, 'title', 'hero', false)).toBe(null)
  })

  it('tree hover on context returns the element itself', () => {
    // Tree hover always returns the element directly
    expect(resolveHover(tree, 'title', 'hero', true)).toBe('hero')
  })

  it('no selection: canvas hover resolves to top-level child of root', () => {
    // No selection → context = root. Hover on btn-1 → hero
    expect(resolveHover(tree, null, 'btn-1', false)).toBe('hero')
  })

  it('no selection: tree hover returns exact element', () => {
    expect(resolveHover(tree, null, 'btn-1', true)).toBe('btn-1')
  })

  it('canvas hover on element outside context returns null (fallback handles it)', () => {
    // Selected: btn-1. Context = cta-row. Hover on footer → not inside cta-row
    expect(resolveHover(tree, 'btn-1', 'footer', false)).toBe(null)
  })

  it('tree hover on element outside context still returns it', () => {
    expect(resolveHover(tree, 'btn-1', 'footer', true)).toBe('footer')
  })
})

// ── Hover/selection suppression logic ──

describe('Hover suppression when hovering selected descendants', () => {
  type Node = { id: string; type: 'box' | 'text'; children?: Node[] }

  function findInTree(node: Node, id: string): Node | null {
    if (node.id === id) return node
    if (node.type === 'box' && node.children) {
      for (const child of node.children) {
        const found = findInTree(child, id)
        if (found) return found
      }
    }
    return null
  }

  function shouldShowHover(
    selectedId: string | null,
    hoveredId: string | null,
    root: Node,
    previewMode = false,
    canvasDragId: string | null = null,
  ): boolean {
    if (previewMode || !hoveredId || hoveredId === selectedId || !!canvasDragId) return false
    if (selectedId) {
      const selFrame = findInTree(root, selectedId)
      if (selFrame && selFrame.type === 'box') {
        if (findInTree(selFrame, hoveredId)) return false
      }
    }
    return true
  }

  const tree: Node = {
    id: 'root', type: 'box', children: [
      {
        id: 'frame-1', type: 'box', children: [
          { id: 'text-1', type: 'text' },
          { id: 'text-2', type: 'text' },
        ],
      },
      { id: 'text-3', type: 'text' },
    ],
  }

  it('shows hover on unrelated element', () => {
    expect(shouldShowHover('frame-1', 'text-3', tree)).toBe(true)
  })

  it('suppresses hover on same element as selection', () => {
    expect(shouldShowHover('frame-1', 'frame-1', tree)).toBe(false)
  })

  it('suppresses hover on direct child of selected element', () => {
    expect(shouldShowHover('frame-1', 'text-1', tree)).toBe(false)
  })

  it('suppresses hover on nested descendant of selected element', () => {
    expect(shouldShowHover('root', 'text-1', tree)).toBe(false)
  })

  it('shows hover when nothing is selected', () => {
    expect(shouldShowHover(null, 'text-1', tree)).toBe(true)
  })

  it('suppresses hover in preview mode', () => {
    expect(shouldShowHover(null, 'text-1', tree, true)).toBe(false)
  })

  it('suppresses hover during drag', () => {
    expect(shouldShowHover(null, 'text-1', tree, false, 'text-2')).toBe(false)
  })

  it('shows hover on parent when child is selected', () => {
    expect(shouldShowHover('text-1', 'frame-1', tree)).toBe(true)
  })

  it('shows hover on sibling of selected element', () => {
    expect(shouldShowHover('text-1', 'text-2', tree)).toBe(true)
  })
})
