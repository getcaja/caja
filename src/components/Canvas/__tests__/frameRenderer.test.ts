import { describe, it, expect } from 'vitest'
import { resolveTag, renderMultiline } from '../FrameRenderer'
import { makeBox, makeText, makeImage, makeButton, makeInput, makeTextarea, makeSelect } from '../../../utils/__tests__/helpers'
import { isValidElement } from 'react'

describe('resolveTag', () => {
  describe('box', () => {
    it('returns "div" for default tag', () => {
      const frame = makeBox()
      expect(resolveTag(frame)).toBe('div')
    })

    it('returns "section" for tag="section"', () => {
      const frame = makeBox({ tag: 'section' })
      expect(resolveTag(frame)).toBe('section')
    })

    it('returns "nav" for tag="nav"', () => {
      const frame = makeBox({ tag: 'nav' })
      expect(resolveTag(frame)).toBe('nav')
    })

    it('returns "header" for tag="header"', () => {
      const frame = makeBox({ tag: 'header' })
      expect(resolveTag(frame)).toBe('header')
    })

    it('returns "footer" for tag="footer"', () => {
      const frame = makeBox({ tag: 'footer' })
      expect(resolveTag(frame)).toBe('footer')
    })

    it('returns "div" for tag="body" (React 19 singleton exception)', () => {
      const frame = makeBox({ tag: 'body' })
      expect(resolveTag(frame)).toBe('div')
    })

    it('returns "ul" for tag="ul"', () => {
      const frame = makeBox({ tag: 'ul' })
      expect(resolveTag(frame)).toBe('ul')
    })

    it('returns "form" for tag="form"', () => {
      const frame = makeBox({ tag: 'form' })
      expect(resolveTag(frame)).toBe('form')
    })
  })

  describe('text', () => {
    it('returns "p" for default tag', () => {
      const frame = makeText()
      expect(resolveTag(frame)).toBe('p')
    })

    it('returns "h1" for tag="h1"', () => {
      const frame = makeText({ tag: 'h1' })
      expect(resolveTag(frame)).toBe('h1')
    })

    it('returns "span" for tag="span"', () => {
      const frame = makeText({ tag: 'span' })
      expect(resolveTag(frame)).toBe('span')
    })

    it('returns "a" for tag="a"', () => {
      const frame = makeText({ tag: 'a' })
      expect(resolveTag(frame)).toBe('a')
    })
  })

  describe('button', () => {
    it('returns "button"', () => {
      const frame = makeButton()
      expect(resolveTag(frame)).toBe('button')
    })
  })

  describe('image', () => {
    it('returns "img" when src is set', () => {
      const frame = makeImage({ src: 'https://placehold.co/600x400' })
      expect(resolveTag(frame)).toBe('img')
    })

    it('returns "div" when src is empty (placeholder)', () => {
      const frame = makeImage({ src: '' })
      expect(resolveTag(frame)).toBe('div')
    })
  })

  describe('input', () => {
    it('returns "input"', () => {
      const frame = makeInput()
      expect(resolveTag(frame)).toBe('input')
    })
  })

  describe('textarea', () => {
    it('returns "textarea"', () => {
      const frame = makeTextarea()
      expect(resolveTag(frame)).toBe('textarea')
    })
  })

  describe('select', () => {
    it('returns "select"', () => {
      const frame = makeSelect()
      expect(resolveTag(frame)).toBe('select')
    })
  })
})

describe('renderMultiline', () => {
  it('returns plain string when no line breaks', () => {
    const result = renderMultiline('hello world')
    expect(result).toBe('hello world')
  })

  it('returns an array with <br> elements for line breaks', () => {
    const result = renderMultiline('hello\nworld')
    expect(Array.isArray(result)).toBe(true)
    const arr = result as React.ReactElement[]
    expect(arr).toHaveLength(2)
  })

  it('preserves multiple line breaks', () => {
    const result = renderMultiline('line1\nline2\nline3')
    expect(Array.isArray(result)).toBe(true)
    const arr = result as React.ReactElement[]
    expect(arr).toHaveLength(3)
  })

  it('handles empty lines (consecutive newlines)', () => {
    const result = renderMultiline('hello\n\nworld')
    expect(Array.isArray(result)).toBe(true)
    const arr = result as React.ReactElement[]
    expect(arr).toHaveLength(3)
  })

  it('Fragment children contain text and br elements', () => {
    const result = renderMultiline('hello\nworld')
    const arr = result as { props: { children: unknown[] } }[]
    // Each Fragment has props.children — first has text + <br>, last has just text
    const firstChildren = arr[0].props.children
    expect(firstChildren[0]).toBe('hello')
    // Second element in children is the <br>
    expect(isValidElement(firstChildren[1])).toBe(true)
    expect((firstChildren[1] as React.ReactElement).type).toBe('br')

    const lastChildren = arr[1].props.children
    expect(lastChildren[0]).toBe('world')
    // Last line should not have a <br>
    expect(lastChildren[1]).toBe(false)
  })
})
