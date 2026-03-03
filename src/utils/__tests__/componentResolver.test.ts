import { describe, it, expect } from 'vitest'
import { resolveInstance } from '../componentResolver'
import type { BoxElement, TextElement, Frame } from '../../types/frame'

function makeBox(id: string, children: Frame[] = []): BoxElement {
  return {
    id,
    type: 'box',
    name: id,
    children,
    display: 'flex',
    direction: 'column',
    justify: 'start',
    align: 'stretch',
    gap: { mode: 'token', token: '0', value: 0 },
    wrap: false,
    bg: { mode: 'custom', value: '' },
    padding: {
      top: { mode: 'token', token: '0', value: 0 },
      right: { mode: 'token', token: '0', value: 0 },
      bottom: { mode: 'token', token: '0', value: 0 },
      left: { mode: 'token', token: '0', value: 0 },
    },
    margin: {
      top: { mode: 'token', token: '0', value: 0 },
      right: { mode: 'token', token: '0', value: 0 },
      bottom: { mode: 'token', token: '0', value: 0 },
      left: { mode: 'token', token: '0', value: 0 },
    },
    borderRadius: {
      topLeft: { mode: 'token', token: '0', value: 0 },
      topRight: { mode: 'token', token: '0', value: 0 },
      bottomLeft: { mode: 'token', token: '0', value: 0 },
      bottomRight: { mode: 'token', token: '0', value: 0 },
    },
    border: { top: { mode: 'token', token: '0', value: 0 }, right: { mode: 'token', token: '0', value: 0 }, bottom: { mode: 'token', token: '0', value: 0 }, left: { mode: 'token', token: '0', value: 0 }, color: { mode: 'custom', value: '' }, style: 'none' },
    overflow: 'visible',
    opacity: { mode: 'token', token: '100', value: 1 },
    width: { mode: 'default', value: { mode: 'custom', value: 0 } },
    height: { mode: 'default', value: { mode: 'custom', value: 0 } },
    minWidth: { mode: 'custom', value: 0 },
    maxWidth: { mode: 'custom', value: 0 },
    minHeight: { mode: 'custom', value: 0 },
    maxHeight: { mode: 'custom', value: 0 },
  } as BoxElement
}

function makeText(id: string, content = 'Hello'): TextElement {
  return {
    id,
    type: 'text',
    name: id,
    content,
    tag: 'p',
    href: '',
    hidden: false,
    className: '',
    htmlId: '',
    width: { mode: 'default', value: { mode: 'custom', value: 0 } },
    height: { mode: 'default', value: { mode: 'custom', value: 0 } },
    grow: { mode: 'custom', value: 0 },
    shrink: { mode: 'custom', value: 1 },
    padding: { top: { mode: 'custom', value: 0 }, right: { mode: 'custom', value: 0 }, bottom: { mode: 'custom', value: 0 }, left: { mode: 'custom', value: 0 } },
    margin: { top: { mode: 'custom', value: 0 }, right: { mode: 'custom', value: 0 }, bottom: { mode: 'custom', value: 0 }, left: { mode: 'custom', value: 0 } },
    minWidth: { mode: 'custom', value: 0 },
    maxWidth: { mode: 'custom', value: 0 },
    minHeight: { mode: 'custom', value: 0 },
    maxHeight: { mode: 'custom', value: 0 },
    alignSelf: 'auto',
    position: 'static',
    zIndex: { mode: 'custom', value: 0 },
    inset: { top: { mode: 'custom', value: 0 }, right: { mode: 'custom', value: 0 }, bottom: { mode: 'custom', value: 0 }, left: { mode: 'custom', value: 0 } },
    color: { mode: 'token', token: 'gray-900', value: '#111827' },
    bg: { mode: 'custom', value: '' },
    bgImage: '',
    bgSize: 'auto',
    bgPosition: 'center',
    bgRepeat: 'repeat',
    border: { top: { mode: 'custom', value: 0 }, right: { mode: 'custom', value: 0 }, bottom: { mode: 'custom', value: 0 }, left: { mode: 'custom', value: 0 }, color: { mode: 'custom', value: '' }, style: 'none' },
    borderRadius: { topLeft: { mode: 'custom', value: 0 }, topRight: { mode: 'custom', value: 0 }, bottomRight: { mode: 'custom', value: 0 }, bottomLeft: { mode: 'custom', value: 0 } },
    overflow: 'visible',
    opacity: { mode: 'token', token: '100', value: 1 },
    boxShadow: 'none',
    cursor: 'auto',
    blur: { mode: 'custom', value: 0 },
    backdropBlur: { mode: 'custom', value: 0 },
    rotate: { mode: 'custom', value: 0 },
    scaleVal: { mode: 'custom', value: 100 },
    translateX: { mode: 'custom', value: 0 },
    translateY: { mode: 'custom', value: 0 },
    skewX: { mode: 'custom', value: 0 },
    skewY: { mode: 'custom', value: 0 },
    transformOrigin: 'center',
    transition: 'none',
    duration: { mode: 'custom', value: 0 },
    ease: 'linear',
    colSpan: { mode: 'custom', value: 0 },
    rowSpan: { mode: 'custom', value: 0 },
    tailwindClasses: '',
    fontSize: { mode: 'token', token: '4', value: 16 },
    fontWeight: { mode: 'token', token: '400', value: 400 },
    lineHeight: { mode: 'token', token: '6', value: 24 },
    letterSpacing: { mode: 'token', token: '0', value: 0 },
    textAlign: 'left',
    textAlignVertical: 'start',
    fontStyle: 'normal',
    textDecoration: 'none',
    textTransform: 'none',
    whiteSpace: 'normal',
    fontFamily: '',
  }
}

describe('resolveInstance', () => {
  it('returns frame unchanged if not an instance', () => {
    const frame = makeText('t1', 'Not an instance')
    const compRoot = makeBox('comp-root')
    const result = resolveInstance(frame, compRoot)
    expect(result).toBe(frame) // same reference
  })

  it('returns frame unchanged if componentPageRoot is null', () => {
    const frame: Frame = { ...makeText('t1'), _componentId: 'master-1' }
    const result = resolveInstance(frame, null)
    expect(result).toBe(frame)
  })

  it('returns frame unchanged if master is not found', () => {
    const frame: Frame = { ...makeText('t1'), _componentId: 'nonexistent' }
    const compRoot = makeBox('comp-root')
    const result = resolveInstance(frame, compRoot)
    expect(result).toBe(frame)
  })

  it('resolves an instance from its master', () => {
    const masterChild = makeText('master-child', 'Master Text')
    const master = makeBox('master-1', [masterChild])
    const compRoot = makeBox('comp-root', [master])

    const instance: Frame = {
      ...makeBox('instance-1'),
      _componentId: 'master-1',
      _overrides: {},
    }

    const resolved = resolveInstance(instance, compRoot)

    // Should use instance's own ID and name
    expect(resolved.id).toBe('instance-1')
    expect(resolved.name).toBe('instance-1')
    expect(resolved._componentId).toBe('master-1')

    // Should have master's structure (a box with text child)
    expect(resolved.type).toBe('box')
    if (resolved.type === 'box') {
      expect(resolved.children).toHaveLength(1)
      expect(resolved.children[0].type).toBe('text')
      if (resolved.children[0].type === 'text') {
        expect(resolved.children[0].content).toBe('Master Text')
      }
    }
  })

  it('applies overrides to resolved instance', () => {
    const masterChild = makeText('master-child', 'Original')
    const master = makeBox('master-1', [masterChild])
    const compRoot = makeBox('comp-root', [master])

    const instance: Frame = {
      ...makeBox('instance-1'),
      _componentId: 'master-1',
      _overrides: {
        'master-child': { content: 'Overridden' },
      },
    }

    const resolved = resolveInstance(instance, compRoot)

    if (resolved.type === 'box') {
      const child = resolved.children[0]
      if (child.type === 'text') {
        expect(child.content).toBe('Overridden')
      }
    }
  })

  it('does not mutate the original master', () => {
    const masterChild = makeText('master-child', 'Original')
    const master = makeBox('master-1', [masterChild])
    const compRoot = makeBox('comp-root', [master])

    const instance: Frame = {
      ...makeBox('instance-1'),
      _componentId: 'master-1',
      _overrides: {
        'master-child': { content: 'Changed' },
      },
    }

    resolveInstance(instance, compRoot)

    // Master should be unaffected
    if (master.type === 'box') {
      const child = master.children[0]
      if (child.type === 'text') {
        expect(child.content).toBe('Original')
      }
    }
  })

  it('preserves _componentId and _overrides on resolved frame', () => {
    const master = makeBox('master-1')
    const compRoot = makeBox('comp-root', [master])
    const overrides = { 'some-child': { color: 'red' } }

    const instance: Frame = {
      ...makeBox('instance-1'),
      _componentId: 'master-1',
      _overrides: overrides,
    }

    const resolved = resolveInstance(instance, compRoot)
    expect(resolved._componentId).toBe('master-1')
    expect(resolved._overrides).toBe(overrides)
  })
})
