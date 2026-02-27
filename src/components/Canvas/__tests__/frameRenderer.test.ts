import { describe, it, expect } from 'vitest'
import { resolveTag } from '../FrameRenderer'
import { makeBox, makeText, makeImage, makeButton, makeInput, makeTextarea, makeSelect } from '../../../utils/__tests__/helpers'

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
