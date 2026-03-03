import { describe, it, expect } from 'vitest'
import {
  sanitizeDVNum, sanitizeDVStr, sanitizeSpacingValues,
  sanitizeBorderRadius, sanitizeBorder, sanitizeFrameProperties,
  SPACING_LOOKUP, COLOR_LOOKUP,
} from '../sanitize'
import { resolveRefs, extractResultId } from '../batchRefs'
import { compactSnapshot, summaryTree } from '../tools'
import { makeBox, makeText, makeButton, makeImage, defaultBorder } from '../../utils/__tests__/helpers'

// ---------------------------------------------------------------------------
// sanitizeDVNum
// ---------------------------------------------------------------------------

describe('sanitizeDVNum', () => {
  it('number → DV custom when no lookup provided', () => {
    expect(sanitizeDVNum(42)).toEqual({ mode: 'custom', value: 42 })
  })

  it('number → DV custom when lookup has no match', () => {
    expect(sanitizeDVNum(999, SPACING_LOOKUP)).toEqual({ mode: 'custom', value: 999 })
  })

  it('number with token auto-match: 16 → token "4" using SPACING_LOOKUP', () => {
    // SPACING_SCALE has { token: '4', value: 16 }
    expect(sanitizeDVNum(16, SPACING_LOOKUP)).toEqual({ mode: 'token', token: '4', value: 16 })
  })

  it('number 0 → custom value 0 when no token match', () => {
    // SPACING_LOOKUP does have 0 → '0'
    expect(sanitizeDVNum(0, new Map())).toEqual({ mode: 'custom', value: 0 })
  })

  it('null → undefined', () => {
    expect(sanitizeDVNum(null)).toBeUndefined()
  })

  it('undefined → undefined', () => {
    expect(sanitizeDVNum(undefined)).toBeUndefined()
  })

  it('existing DV object passthrough (already has mode)', () => {
    const dv = { mode: 'token' as const, token: '4', value: 16 }
    expect(sanitizeDVNum(dv, SPACING_LOOKUP)).toBe(dv)
  })

  it('string → undefined (rejected)', () => {
    expect(sanitizeDVNum('16', SPACING_LOOKUP)).toBeUndefined()
  })

  it('boolean → undefined (rejected)', () => {
    expect(sanitizeDVNum(true, SPACING_LOOKUP)).toBeUndefined()
  })

  it('negative number → custom (no negative token match)', () => {
    expect(sanitizeDVNum(-8, SPACING_LOOKUP)).toEqual({ mode: 'custom', value: -8 })
  })

  it('float number → custom when no exact match', () => {
    expect(sanitizeDVNum(3.7, SPACING_LOOKUP)).toEqual({ mode: 'custom', value: 3.7 })
  })

  it('number 4 → token match "1" with SPACING_LOOKUP', () => {
    // SPACING_SCALE has { token: '1', value: 4 }
    expect(sanitizeDVNum(4, SPACING_LOOKUP)).toEqual({ mode: 'token', token: '1', value: 4 })
  })
})

// ---------------------------------------------------------------------------
// sanitizeDVStr
// ---------------------------------------------------------------------------

describe('sanitizeDVStr', () => {
  it('string → DV custom when no lookup provided', () => {
    expect(sanitizeDVStr('hello')).toEqual({ mode: 'custom', value: 'hello' })
  })

  it('string → DV custom when lookup has no match', () => {
    expect(sanitizeDVStr('#123456', COLOR_LOOKUP)).toEqual({ mode: 'custom', value: '#123456' })
  })

  it('hex string with color token auto-match: #ef4444 → red-500', () => {
    // red-500 = #ef4444
    expect(sanitizeDVStr('#ef4444', COLOR_LOOKUP)).toEqual({ mode: 'token', token: 'red-500', value: '#ef4444' })
  })

  it('case insensitivity: #EF4444 → red-500', () => {
    expect(sanitizeDVStr('#EF4444', COLOR_LOOKUP)).toEqual({ mode: 'token', token: 'red-500', value: '#EF4444' })
  })

  it('null → undefined', () => {
    expect(sanitizeDVStr(null)).toBeUndefined()
  })

  it('undefined → undefined', () => {
    expect(sanitizeDVStr(undefined)).toBeUndefined()
  })

  it('existing DV object passthrough (already has mode)', () => {
    const dv = { mode: 'token' as const, token: 'red-500', value: '#ef4444' }
    expect(sanitizeDVStr(dv, COLOR_LOOKUP)).toBe(dv)
  })

  it('number → undefined (rejected)', () => {
    expect(sanitizeDVStr(42 as unknown as string, COLOR_LOOKUP)).toBeUndefined()
  })

  it('empty string → custom with empty value', () => {
    expect(sanitizeDVStr('')).toEqual({ mode: 'custom', value: '' })
  })

  it('#ffffff → white token', () => {
    // SPECIAL_COLORS has { token: 'white', value: '#ffffff' }
    expect(sanitizeDVStr('#ffffff', COLOR_LOOKUP)).toEqual({ mode: 'token', token: 'white', value: '#ffffff' })
  })
})

// ---------------------------------------------------------------------------
// sanitizeSpacingValues
// ---------------------------------------------------------------------------

describe('sanitizeSpacingValues', () => {
  it('all 4 sides with numbers → DV objects', () => {
    const result = sanitizeSpacingValues({ top: 8, right: 8, bottom: 8, left: 8 })
    expect(result.top).toEqual({ mode: 'token', token: '2', value: 8 })
    expect(result.right).toEqual({ mode: 'token', token: '2', value: 8 })
    expect(result.bottom).toEqual({ mode: 'token', token: '2', value: 8 })
    expect(result.left).toEqual({ mode: 'token', token: '2', value: 8 })
  })

  it('partial sides (only top and right)', () => {
    const result = sanitizeSpacingValues({ top: 4, right: 12 })
    expect(result.top).toEqual({ mode: 'token', token: '1', value: 4 })
    expect(result.right).toEqual({ mode: 'token', token: '3', value: 12 })
    expect(result.bottom).toBeUndefined()
    expect(result.left).toBeUndefined()
  })

  it('token auto-match on spacing values: 16 → token "4"', () => {
    const result = sanitizeSpacingValues({ top: 16 })
    expect(result.top).toEqual({ mode: 'token', token: '4', value: 16 })
  })

  it('empty object → empty result', () => {
    const result = sanitizeSpacingValues({})
    expect(result).toEqual({})
  })

  it('null values are skipped (key present but value null)', () => {
    const result = sanitizeSpacingValues({ top: null, right: 8 })
    expect(result.top).toBeUndefined()
    expect(result.right).toEqual({ mode: 'token', token: '2', value: 8 })
  })

  it('mixed: some sides are numbers, some are already DV objects', () => {
    const existingDV = { mode: 'token' as const, token: '4', value: 16 }
    const result = sanitizeSpacingValues({ top: 8, left: existingDV })
    expect(result.top).toEqual({ mode: 'token', token: '2', value: 8 })
    // Passthrough of existing DV
    expect(result.left).toBe(existingDV)
  })
})

// ---------------------------------------------------------------------------
// sanitizeBorderRadius
// ---------------------------------------------------------------------------

describe('sanitizeBorderRadius', () => {
  it('number → uniform 4-corner DV with custom mode for unmatched value', () => {
    // 8 is not in BORDER_RADIUS_SCALE directly... let me check: lg=8 IS in scale
    // Actually lg=8, so it will match token 'lg'
    const result = sanitizeBorderRadius(8)
    expect(result).toEqual({
      topLeft: { mode: 'token', token: 'lg', value: 8 },
      topRight: { mode: 'token', token: 'lg', value: 8 },
      bottomRight: { mode: 'token', token: 'lg', value: 8 },
      bottomLeft: { mode: 'token', token: 'lg', value: 8 },
    })
  })

  it('number with token match: 4 → token "DEFAULT" from BORDER_RADIUS_LOOKUP', () => {
    // BORDER_RADIUS_SCALE has { token: 'DEFAULT', value: 4 }
    const result = sanitizeBorderRadius(4)
    expect(result).toEqual({
      topLeft: { mode: 'token', token: 'DEFAULT', value: 4 },
      topRight: { mode: 'token', token: 'DEFAULT', value: 4 },
      bottomRight: { mode: 'token', token: 'DEFAULT', value: 4 },
      bottomLeft: { mode: 'token', token: 'DEFAULT', value: 4 },
    })
  })

  it('object with DV sub-fields → passthrough (topLeft is already an object)', () => {
    const br = {
      topLeft: { mode: 'custom' as const, value: 4 },
      topRight: { mode: 'custom' as const, value: 4 },
      bottomRight: { mode: 'custom' as const, value: 4 },
      bottomLeft: { mode: 'custom' as const, value: 4 },
    }
    expect(sanitizeBorderRadius(br)).toBe(br)
  })

  it('object with plain numbers (old format) → converted to DV per-corner', () => {
    const result = sanitizeBorderRadius({ topLeft: 4, topRight: 8, bottomRight: 0, bottomLeft: 6 })
    expect(result).toEqual({
      topLeft: { mode: 'token', token: 'DEFAULT', value: 4 },
      topRight: { mode: 'token', token: 'lg', value: 8 },
      bottomRight: { mode: 'token', token: 'none', value: 0 },
      bottomLeft: { mode: 'token', token: 'md', value: 6 },
    })
  })

  it('null → undefined', () => {
    expect(sanitizeBorderRadius(null)).toBeUndefined()
  })

  it('undefined → undefined', () => {
    expect(sanitizeBorderRadius(undefined)).toBeUndefined()
  })

  it('0 → uniform with value 0, token "none"', () => {
    // BORDER_RADIUS_SCALE has { token: 'none', value: 0 }
    const result = sanitizeBorderRadius(0)
    expect(result).toEqual({
      topLeft: { mode: 'token', token: 'none', value: 0 },
      topRight: { mode: 'token', token: 'none', value: 0 },
      bottomRight: { mode: 'token', token: 'none', value: 0 },
      bottomLeft: { mode: 'token', token: 'none', value: 0 },
    })
  })

  it('object with per-corner numbers, unmatched values → custom', () => {
    const result = sanitizeBorderRadius({ topLeft: 99, topRight: 99, bottomRight: 99, bottomLeft: 99 })
    expect(result).toEqual({
      topLeft: { mode: 'custom', value: 99 },
      topRight: { mode: 'custom', value: 99 },
      bottomRight: { mode: 'custom', value: 99 },
      bottomLeft: { mode: 'custom', value: 99 },
    })
  })
})

// ---------------------------------------------------------------------------
// sanitizeBorder
// ---------------------------------------------------------------------------

describe('sanitizeBorder', () => {
  it('{ width: 2 } → 4-side expansion (backward compat)', () => {
    const result = sanitizeBorder({ width: 2 }, defaultBorder)
    // BORDER_WIDTH_SCALE has { token: '2', value: 2 }
    const expectedW = { mode: 'token', token: '2', value: 2 }
    expect(result).toBeDefined()
    expect(result!.top).toEqual(expectedW)
    expect(result!.right).toEqual(expectedW)
    expect(result!.bottom).toEqual(expectedW)
    expect(result!.left).toEqual(expectedW)
  })

  it('{ width: 2, color: "#ef4444" } → all sides + color token match', () => {
    const result = sanitizeBorder({ width: 2, color: '#ef4444' }, defaultBorder)
    expect(result).toBeDefined()
    const expectedW = { mode: 'token', token: '2', value: 2 }
    expect(result!.top).toEqual(expectedW)
    expect(result!.right).toEqual(expectedW)
    expect(result!.bottom).toEqual(expectedW)
    expect(result!.left).toEqual(expectedW)
    expect(result!.color).toEqual({ mode: 'token', token: 'red-500', value: '#ef4444' })
  })

  it('{ width: 2, style: "dashed" } → preserves style', () => {
    const result = sanitizeBorder({ width: 2, style: 'dashed' }, defaultBorder)
    expect(result).toBeDefined()
    expect(result!.style).toBe('dashed')
  })

  it('per-side: { top: 1, bottom: 2 } → per-side with existing fallback for unspecified sides', () => {
    const result = sanitizeBorder({ top: 1, bottom: 2 }, defaultBorder)
    expect(result).toBeDefined()
    // BORDER_WIDTH_SCALE has { token: '', value: 1 } and { token: '2', value: 2 }
    expect(result!.top).toEqual({ mode: 'token', token: '', value: 1 })
    expect(result!.bottom).toEqual({ mode: 'token', token: '2', value: 2 })
    // right and left fall back to existing (defaultBorder has dvNum(0))
    expect(result!.right).toEqual(defaultBorder.right)
    expect(result!.left).toEqual(defaultBorder.left)
  })

  it('null → undefined', () => {
    expect(sanitizeBorder(null, defaultBorder)).toBeUndefined()
  })

  it('undefined → undefined', () => {
    expect(sanitizeBorder(undefined, defaultBorder)).toBeUndefined()
  })

  it('non-object (string) → undefined', () => {
    expect(sanitizeBorder('solid', defaultBorder)).toBeUndefined()
  })

  it('{ top: 1, color: "#000000" } → per-side with black color token', () => {
    const result = sanitizeBorder({ top: 1, color: '#000000' }, defaultBorder)
    expect(result).toBeDefined()
    expect(result!.top).toEqual({ mode: 'token', token: '', value: 1 })
    // SPECIAL_COLORS has { token: 'black', value: '#000000' }
    expect(result!.color).toEqual({ mode: 'token', token: 'black', value: '#000000' })
  })
})

// ---------------------------------------------------------------------------
// sanitizeFrameProperties
// ---------------------------------------------------------------------------

describe('sanitizeFrameProperties', () => {
  it('label → content alias when label present and no content', () => {
    const result = sanitizeFrameProperties({ label: 'Click me' })
    expect(result.content).toBe('Click me')
    expect(result.label).toBeUndefined()
  })

  it('label + content both present → content wins, label kept (alias does not fire)', () => {
    // The alias guard: if 'label' in sanitized && !('content' in sanitized).
    // When content is already present the guard is false — label stays as-is.
    const result = sanitizeFrameProperties({ label: 'Label text', content: 'Content text' })
    expect(result.content).toBe('Content text')
    expect(result.label).toBe('Label text')
  })

  it('options string → array conversion with slugified values', () => {
    const result = sanitizeFrameProperties({ options: 'Opt A\nOpt B\nOpt C' })
    expect(result.options).toEqual([
      { value: 'opt-a', label: 'Opt A' },
      { value: 'opt-b', label: 'Opt B' },
      { value: 'opt-c', label: 'Opt C' },
    ])
  })

  it('numeric field coercion: fontSize: 16 → DV with token match (base)', () => {
    // FONT_SIZE_SCALE has { token: 'base', value: 16 }
    const result = sanitizeFrameProperties({ fontSize: 16 })
    expect(result.fontSize).toEqual({ mode: 'token', token: 'base', value: 16 })
  })

  it('color field coercion: bg: "#ef4444" → DV with token match (red-500)', () => {
    const result = sanitizeFrameProperties({ bg: '#ef4444' })
    expect(result.bg).toEqual({ mode: 'token', token: 'red-500', value: '#ef4444' })
  })

  it('borderRadius number → uniform DV objects across all corners', () => {
    const result = sanitizeFrameProperties({ borderRadius: 8 })
    const corners = result.borderRadius as { topLeft: unknown; topRight: unknown; bottomRight: unknown; bottomLeft: unknown }
    expect(corners.topLeft).toEqual({ mode: 'token', token: 'lg', value: 8 })
    expect(corners.topRight).toEqual({ mode: 'token', token: 'lg', value: 8 })
    expect(corners.bottomRight).toEqual({ mode: 'token', token: 'lg', value: 8 })
    expect(corners.bottomLeft).toEqual({ mode: 'token', token: 'lg', value: 8 })
  })

  it('bgImage trimming (string with spaces)', () => {
    const result = sanitizeFrameProperties({ bgImage: '  url(foo.png)  ' })
    expect(result.bgImage).toBe('url(foo.png)')
  })

  it('fontFamily trimming', () => {
    const result = sanitizeFrameProperties({ fontFamily: '  Inter  ' })
    expect(result.fontFamily).toBe('Inter')
  })

  it('border with existing frame → border is sanitized', () => {
    const frame = makeBox()
    const result = sanitizeFrameProperties({ border: { width: 2 } }, frame)
    const border = result.border as { top: unknown; right: unknown; bottom: unknown; left: unknown }
    const expectedW = { mode: 'token', token: '2', value: 2 }
    expect(border.top).toEqual(expectedW)
    expect(border.right).toEqual(expectedW)
    expect(border.bottom).toEqual(expectedW)
    expect(border.left).toEqual(expectedW)
  })

  it('multiple fields at once are all processed', () => {
    const result = sanitizeFrameProperties({ fontSize: 16, bg: '#ef4444', gap: 8 })
    expect(result.fontSize).toEqual({ mode: 'token', token: 'base', value: 16 })
    expect(result.bg).toEqual({ mode: 'token', token: 'red-500', value: '#ef4444' })
    // SPACING_SCALE has { token: '2', value: 8 }
    expect(result.gap).toEqual({ mode: 'token', token: '2', value: 8 })
  })

  it('passthrough of unknown properties', () => {
    const result = sanitizeFrameProperties({ someUnknownProp: 'some-value', display: 'flex' })
    expect(result.someUnknownProp).toBe('some-value')
    expect(result.display).toBe('flex')
  })

  it('empty props → empty result', () => {
    const result = sanitizeFrameProperties({})
    expect(result).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// resolveRefs
// ---------------------------------------------------------------------------

describe('resolveRefs', () => {
  it('$prev substitution in parent_id field', () => {
    const result = resolveRefs({ parent_id: '$prev' }, ['frame-1', 'frame-2'])
    expect(result.parent_id).toBe('frame-2')
  })

  it('$0, $1 indexed refs resolve correctly', () => {
    const result = resolveRefs({ parent_id: '$0', id: '$1' }, ['first-id', 'second-id'])
    expect(result.parent_id).toBe('first-id')
    expect(result.id).toBe('second-id')
  })

  it('non-ID field content: "$0" stays as-is (e.g. content field)', () => {
    const result = resolveRefs({ content: '$0', parent_id: '$0' }, ['some-id'])
    // content is not an ID field — should stay as literal "$0"
    expect(result.content).toBe('$0')
    // parent_id IS an ID field — should be substituted
    expect(result.parent_id).toBe('some-id')
  })

  it('nested objects: ID fields in nested object are resolved', () => {
    const result = resolveRefs({ nested: { parent_id: '$prev' } }, ['nested-id'])
    const nested = result.nested as Record<string, unknown>
    expect(nested.parent_id).toBe('nested-id')
  })

  it('$prev with empty resultIds → stays as "$prev"', () => {
    const result = resolveRefs({ parent_id: '$prev' }, [])
    expect(result.parent_id).toBe('$prev')
  })

  it('$prev skips empty strings in resultIds (uses last non-empty)', () => {
    const result = resolveRefs({ parent_id: '$prev' }, ['frame-1', '', ''])
    expect(result.parent_id).toBe('frame-1')
  })

  it('$2 out of range → stays as "$2"', () => {
    const result = resolveRefs({ parent_id: '$2' }, ['only-one'])
    expect(result.parent_id).toBe('$2')
  })

  it('array values (no key context) → no substitution performed', () => {
    const result = resolveRefs({ items: ['$prev', '$0'] }, ['some-id'])
    // Arrays are iterated without key context, so no substitution
    expect(result.items).toEqual(['$prev', '$0'])
  })

  it('mixed: some ID fields resolved, some content fields not', () => {
    const result = resolveRefs(
      { parent_id: '$prev', name: 'My Frame', content: '$1', frame_id: '$0' },
      ['frame-a', 'frame-b']
    )
    expect(result.parent_id).toBe('frame-b')   // ID field → last non-empty
    expect(result.name).toBe('My Frame')        // not an ID field, regular string
    expect(result.content).toBe('$1')           // not an ID field → stays literal
    expect(result.frame_id).toBe('frame-a')     // ID field → $0
  })

  it('regular string in ID field → passthrough without substitution', () => {
    const result = resolveRefs({ parent_id: 'root-frame-id' }, ['frame-1'])
    expect(result.parent_id).toBe('root-frame-id')
  })
})

// ---------------------------------------------------------------------------
// extractResultId
// ---------------------------------------------------------------------------

describe('extractResultId', () => {
  it('{ data: { id: "abc" } } → "abc"', () => {
    expect(extractResultId({ success: true, data: { id: 'abc' } })).toBe('abc')
  })

  it('{ data: { duplicate: "xyz" } } → "xyz"', () => {
    expect(extractResultId({ success: true, data: { duplicate: 'xyz' } })).toBe('xyz')
  })

  it('{ data: { removed: "del" } } → "del"', () => {
    expect(extractResultId({ success: true, data: { removed: 'del' } })).toBe('del')
  })

  it('{ data: { wrapper: "wrp" } } → "wrp"', () => {
    expect(extractResultId({ success: true, data: { wrapper: 'wrp' } })).toBe('wrp')
  })

  it('{ data: {} } → ""', () => {
    expect(extractResultId({ success: true, data: {} })).toBe('')
  })

  it('{ data: null } → ""', () => {
    expect(extractResultId({ success: true, data: null })).toBe('')
  })

  it('no data property → ""', () => {
    expect(extractResultId({ success: false })).toBe('')
  })
})

// ---------------------------------------------------------------------------
// compactSnapshot
// ---------------------------------------------------------------------------

describe('compactSnapshot', () => {
  it('box with children → includes id, type, name, childCount, childIds', () => {
    const child1 = makeText({ id: 'child-1' })
    const child2 = makeText({ id: 'child-2' })
    const box = makeBox({ id: 'box-1', name: 'Hero', children: [child1, child2] })
    const snap = compactSnapshot(box)
    expect(snap).toEqual({
      id: 'box-1',
      type: 'box',
      name: 'Hero',
      childCount: 2,
      childIds: ['child-1', 'child-2'],
    })
  })

  it('text element → only id, type, name (no childCount)', () => {
    const text = makeText({ id: 'text-1', name: 'Heading' })
    const snap = compactSnapshot(text)
    expect(snap).toEqual({ id: 'text-1', type: 'text', name: 'Heading' })
    expect(snap.childCount).toBeUndefined()
    expect(snap.childIds).toBeUndefined()
  })

  it('button element → only id, type, name', () => {
    const btn = makeButton({ id: 'btn-1', name: 'CTA Button' })
    const snap = compactSnapshot(btn)
    expect(snap).toEqual({ id: 'btn-1', type: 'button', name: 'CTA Button' })
  })

  it('image element → only id, type, name', () => {
    const img = makeImage({ id: 'img-1', name: 'Hero Image' })
    const snap = compactSnapshot(img)
    expect(snap).toEqual({ id: 'img-1', type: 'image', name: 'Hero Image' })
  })
})

// ---------------------------------------------------------------------------
// summaryTree
// ---------------------------------------------------------------------------

describe('summaryTree', () => {
  it('box with nested children → recursive structure with display, childCount, children', () => {
    const child = makeText({ id: 'child-text', name: 'Title', content: 'Hello World' })
    const box = makeBox({ id: 'parent-box', name: 'Section', display: 'flex', children: [child] })
    const tree = summaryTree(box)
    expect(tree).toEqual({
      id: 'parent-box',
      type: 'box',
      name: 'Section',
      display: 'flex',
      childCount: 1,
      children: [
        { id: 'child-text', type: 'text', name: 'Title', content: 'Hello World' },
      ],
    })
  })

  it('text element → includes content field', () => {
    const text = makeText({ id: 'text-1', name: 'Paragraph', content: 'Some text here' })
    const tree = summaryTree(text)
    expect(tree).toEqual({
      id: 'text-1',
      type: 'text',
      name: 'Paragraph',
      content: 'Some text here',
    })
    // No children or display fields for leaf elements
    expect(tree.children).toBeUndefined()
    expect(tree.display).toBeUndefined()
  })

  it('button element → includes content field', () => {
    const btn = makeButton({ id: 'btn-1', name: 'Submit', content: 'Submit Form' })
    const tree = summaryTree(btn)
    expect(tree).toEqual({
      id: 'btn-1',
      type: 'button',
      name: 'Submit',
      content: 'Submit Form',
    })
  })

  it('image element → no content field', () => {
    const img = makeImage({ id: 'img-1', name: 'Logo' })
    const tree = summaryTree(img)
    expect(tree).toEqual({ id: 'img-1', type: 'image', name: 'Logo' })
    expect(tree.content).toBeUndefined()
  })
})
