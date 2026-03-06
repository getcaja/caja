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
    expect(rules[2]).toContain('frame-2')
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
