import { describe, it, expect } from 'vitest'
import { exportToHTML, exportToHTMLDocument } from '../exportHtml'
import { exportToJSX } from '../exportTailwind'
import { buildClassString } from '../exportShared'
import { frameToClasses } from '../frameToClasses'
import { resolveTag } from '../../components/Canvas/FrameRenderer'
import {
  makeBox, makeText, makeImage, makeButton, makeInput, makeTextarea, makeSelect,
  dvNum, dvStr, dvToken, dvColorToken,
} from './helpers'

// ══════════════════════════════════════════════════════════════
// 1. EXPORT CONSISTENCY — same classes across all outputs
// ══════════════════════════════════════════════════════════════

describe('Class consistency: frameToClasses = buildClassString = export classes', () => {
  const frames = [
    makeBox({ bg: dvColorToken('blue-500'), padding: { top: dvToken('4', 16), right: dvToken('4', 16), bottom: dvToken('4', 16), left: dvToken('4', 16) } }),
    makeText({ fontSize: dvToken('lg', 18), fontWeight: dvNum(700), color: dvColorToken('red-500') }),
    makeImage({ objectFit: 'contain', width: { mode: 'fixed', value: dvNum(200) } }),
    makeButton({ bg: dvStr('#333'), borderRadius: { topLeft: dvToken('lg', 8), topRight: dvToken('lg', 8), bottomRight: dvToken('lg', 8), bottomLeft: dvToken('lg', 8) } }),
    makeInput({ fontSize: dvToken('sm', 14), border: { width: dvToken('', 1), color: dvColorToken('gray-300'), style: 'solid' } }),
  ]

  for (const frame of frames) {
    it(`${frame.type} (${frame.name}): classes match across all outputs`, () => {
      const ftc = frameToClasses(frame)
      const bcs = buildClassString(frame)

      // buildClassString = frameToClasses when no user className
      expect(bcs).toBe(ftc)

      // HTML export should contain the same class attribute value
      const html = exportToHTML(frame)
      if (ftc) {
        expect(html).toContain(`class="${ftc}"`)
      }

      // JSX export should contain the same className attribute value
      const jsx = exportToJSX(frame)
      if (ftc) {
        expect(jsx).toContain(`className="${ftc}"`)
      }
    })
  }
})

// ══════════════════════════════════════════════════════════════
// 2. CLASS STRING WITH USER className
// ══════════════════════════════════════════════════════════════

describe('buildClassString with user className', () => {
  it('prepends user className', () => {
    const f = makeBox({ className: 'my-custom-class' })
    const result = buildClassString(f)
    expect(result).toMatch(/^my-custom-class /)
  })

  it('returns only frameToClasses when no className', () => {
    const f = makeBox()
    expect(buildClassString(f)).toBe(frameToClasses(f))
  })
})

// ══════════════════════════════════════════════════════════════
// 3. HTML EXPORT — element types
// ══════════════════════════════════════════════════════════════

describe('exportToHTML', () => {
  it('exports text with correct tag', () => {
    expect(exportToHTML(makeText({ tag: 'h1', content: 'Title' }))).toContain('<h1')
    expect(exportToHTML(makeText({ tag: 'h1', content: 'Title' }))).toContain('Title')
    expect(exportToHTML(makeText({ tag: 'h1', content: 'Title' }))).toContain('</h1>')
  })

  it('exports text with href on <a>', () => {
    const html = exportToHTML(makeText({ tag: 'a', content: 'Link', href: 'https://example.com' }))
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('<a')
  })

  it('escapes HTML entities in text content', () => {
    const html = exportToHTML(makeText({ content: '<script>alert("xss")</script>' }))
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('exports image with src and alt', () => {
    const html = exportToHTML(makeImage({ src: 'photo.jpg', alt: 'A photo' }))
    expect(html).toContain('<img')
    expect(html).toContain('src="photo.jpg"')
    expect(html).toContain('alt="A photo"')
  })

  it('exports button with type="button"', () => {
    const html = exportToHTML(makeButton({ content: 'Submit' }))
    expect(html).toContain('<button')
    expect(html).toContain('type="button"')
    expect(html).toContain('Submit')
  })

  it('exports input with type and placeholder', () => {
    const html = exportToHTML(makeInput({ inputType: 'email', placeholder: 'you@example.com' }))
    expect(html).toContain('<input')
    expect(html).toContain('type="email"')
    expect(html).toContain('placeholder="you@example.com"')
  })

  it('omits type="text" for input (default)', () => {
    const html = exportToHTML(makeInput({ inputType: 'text' }))
    expect(html).not.toContain('type="text"')
  })

  it('exports disabled input', () => {
    const html = exportToHTML(makeInput({ disabled: true }))
    expect(html).toContain(' disabled')
  })

  it('exports textarea with rows and placeholder', () => {
    const html = exportToHTML(makeTextarea({ rows: 5, placeholder: 'Write here...' }))
    expect(html).toContain('<textarea')
    expect(html).toContain('rows="5"')
    expect(html).toContain('placeholder="Write here..."')
  })

  it('exports select with options', () => {
    const html = exportToHTML(makeSelect({
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ]
    }))
    expect(html).toContain('<select')
    expect(html).toContain('<option value="a">Alpha</option>')
    expect(html).toContain('<option value="b">Beta</option>')
    expect(html).toContain('</select>')
  })

  it('exports box with children', () => {
    const box = makeBox({
      children: [
        makeText({ content: 'Hello' }),
        makeText({ content: 'World' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).toContain('<div')
    expect(html).toContain('Hello')
    expect(html).toContain('World')
    expect(html).toContain('</div>')
  })

  it('exports box with semantic tag', () => {
    expect(exportToHTML(makeBox({ tag: 'section' }))).toContain('<section')
    expect(exportToHTML(makeBox({ tag: 'nav' }))).toContain('<nav')
    expect(exportToHTML(makeBox({ tag: 'header' }))).toContain('<header')
    expect(exportToHTML(makeBox({ tag: 'footer' }))).toContain('<footer')
  })

  it('exports empty box as self-closing pair', () => {
    const html = exportToHTML(makeBox())
    expect(html).toMatch(/<div[^>]*><\/div>/)
  })

  it('exports htmlId as id attribute', () => {
    const html = exportToHTML(makeBox({ htmlId: 'my-box' }))
    expect(html).toContain('id="my-box"')
  })

  it('skips hidden frames', () => {
    const html = exportToHTML(makeText({ hidden: true, content: 'Secret' }))
    expect(html).toBe('')
  })

  it('skips hidden children in box', () => {
    const box = makeBox({
      children: [
        makeText({ content: 'Visible' }),
        makeText({ hidden: true, content: 'Hidden' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).toContain('Visible')
    expect(html).not.toContain('Hidden')
  })
})

// ══════════════════════════════════════════════════════════════
// 4. JSX EXPORT — element types
// ══════════════════════════════════════════════════════════════

describe('exportToJSX', () => {
  it('exports text with className instead of class', () => {
    const jsx = exportToJSX(makeText({ fontSize: dvToken('lg', 18) }))
    expect(jsx).toContain('className="')
    expect(jsx).not.toContain(' class="')
  })

  it('exports image as self-closing', () => {
    const jsx = exportToJSX(makeImage({ src: 'photo.jpg' }))
    expect(jsx).toContain('<img')
    expect(jsx).toContain('/>')
  })

  it('exports textarea with numeric rows', () => {
    const jsx = exportToJSX(makeTextarea({ rows: 5 }))
    expect(jsx).toContain('rows={5}')
  })

  it('exports label htmlFor instead of for', () => {
    // Label-input pairing: text[tag=label] followed by input
    const box = makeBox({
      children: [
        makeText({ id: 'lbl', tag: 'label', content: 'Email' }),
        makeInput({ id: 'inp', placeholder: 'you@example.com' }),
      ],
    })
    const jsx = exportToJSX(box)
    expect(jsx).toContain('htmlFor=')
  })

  it('skips hidden frames', () => {
    const jsx = exportToJSX(makeButton({ hidden: true, content: 'Secret' }))
    expect(jsx).toBe('')
  })

  it('exports empty box as self-closing', () => {
    const jsx = exportToJSX(makeBox())
    expect(jsx).toContain('/>')
  })
})

// ══════════════════════════════════════════════════════════════
// 5. HTML DOCUMENT EXPORT
// ══════════════════════════════════════════════════════════════

describe('exportToHTMLDocument', () => {
  it('produces valid HTML5 document', () => {
    const root = makeBox({ children: [makeText({ content: 'Hello' })] })
    const doc = exportToHTMLDocument(root)
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc).toContain('<html lang="en">')
    expect(doc).toContain('<meta charset="UTF-8">')
    expect(doc).toContain('<meta name="viewport"')
    expect(doc).toContain('</html>')
  })

  it('applies root classes to body tag', () => {
    const root = makeBox({
      bg: dvColorToken('blue-500'),
      padding: { top: dvToken('8', 32), right: dvToken('8', 32), bottom: dvToken('8', 32), left: dvToken('8', 32) },
      children: [makeText({ content: 'Hello' })],
    })
    const doc = exportToHTMLDocument(root)
    expect(doc).toContain('<body class="')
    expect(doc).toContain('bg-blue-500')
    expect(doc).toContain('p-8')
  })

  it('includes Tailwind CDN script', () => {
    const root = makeBox({ children: [] })
    const doc = exportToHTMLDocument(root)
    expect(doc).toContain('@tailwindcss/browser@4')
  })
})

// ══════════════════════════════════════════════════════════════
// 6. LABEL-INPUT PAIRING
// ══════════════════════════════════════════════════════════════

describe('Label-input pairing', () => {
  it('pairs label text with following input in HTML', () => {
    const box = makeBox({
      children: [
        makeText({ id: 'lbl', tag: 'label', content: 'Email' }),
        makeInput({ id: 'inp', placeholder: 'you@example.com' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).toContain('for="email"')
    expect(html).toContain('id="email"')
  })

  it('uses htmlId for input association when provided', () => {
    const box = makeBox({
      children: [
        makeText({ id: 'lbl', tag: 'label', content: 'Email' }),
        makeInput({ id: 'inp', htmlId: 'custom-id', placeholder: 'you@example.com' }),
      ],
    })
    const html = exportToHTML(box)
    // htmlId takes precedence
    expect(html).toContain('id="custom-id"')
  })

  it('does not pair non-label text', () => {
    const box = makeBox({
      children: [
        makeText({ id: 'txt', tag: 'p', content: 'Not a label' }),
        makeInput({ id: 'inp' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).not.toContain('for="')
  })

  it('pairs label with textarea', () => {
    const box = makeBox({
      children: [
        makeText({ id: 'lbl', tag: 'label', content: 'Message' }),
        makeTextarea({ id: 'ta' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).toContain('for="message"')
  })

  it('pairs label with select', () => {
    const box = makeBox({
      children: [
        makeText({ id: 'lbl', tag: 'label', content: 'Country' }),
        makeSelect({ id: 'sel' }),
      ],
    })
    const html = exportToHTML(box)
    expect(html).toContain('for="country"')
  })
})

// ══════════════════════════════════════════════════════════════
// 7. HTML ENTITY ESCAPING
// ══════════════════════════════════════════════════════════════

describe('Escaping', () => {
  it('escapes < > & in text content', () => {
    const html = exportToHTML(makeText({ content: '1 < 2 & 3 > 0' }))
    expect(html).toContain('1 &lt; 2 &amp; 3 &gt; 0')
  })

  it('escapes quotes in attributes', () => {
    const html = exportToHTML(makeImage({ src: 'img.jpg', alt: 'He said "hello"' }))
    expect(html).toContain('alt="He said &quot;hello&quot;"')
  })

  it('escapes single quotes in href', () => {
    const html = exportToHTML(makeText({ tag: 'a', content: 'Link', href: "it's" }))
    expect(html).toContain('href="it&#39;s"')
  })
})

// ══════════════════════════════════════════════════════════════
// 8. EDITOR ↔ EXPORT PARITY — tag + classes must match
// ══════════════════════════════════════════════════════════════

/** Extract the opening tag name from an HTML string, e.g. '<img ...' → 'img' */
function extractTag(html: string): string {
  const m = html.match(/<([a-z][a-z0-9]*)[\s>]/)
  return m ? m[1] : ''
}

describe('Editor ↔ Export parity: tags match', () => {
  const cases: { name: string; frame: ReturnType<typeof makeBox> | ReturnType<typeof makeText> | ReturnType<typeof makeImage> | ReturnType<typeof makeButton> | ReturnType<typeof makeInput> | ReturnType<typeof makeTextarea> | ReturnType<typeof makeSelect>; expectedTag: string }[] = [
    { name: 'box (div)', frame: makeBox({ tag: 'div' }), expectedTag: 'div' },
    { name: 'box (section)', frame: makeBox({ tag: 'section' }), expectedTag: 'section' },
    { name: 'box (nav)', frame: makeBox({ tag: 'nav' }), expectedTag: 'nav' },
    { name: 'box (ul)', frame: makeBox({ tag: 'ul' }), expectedTag: 'ul' },
    { name: 'box (form)', frame: makeBox({ tag: 'form' }), expectedTag: 'form' },
    { name: 'text (p)', frame: makeText({ tag: 'p' }), expectedTag: 'p' },
    { name: 'text (h1)', frame: makeText({ tag: 'h1' }), expectedTag: 'h1' },
    { name: 'text (span)', frame: makeText({ tag: 'span' }), expectedTag: 'span' },
    { name: 'text (a)', frame: makeText({ tag: 'a', href: '#' }), expectedTag: 'a' },
    { name: 'text (label)', frame: makeText({ tag: 'label' }), expectedTag: 'label' },
    { name: 'button', frame: makeButton(), expectedTag: 'button' },
    { name: 'image (with src)', frame: makeImage({ src: 'photo.jpg' }), expectedTag: 'img' },
    { name: 'input', frame: makeInput(), expectedTag: 'input' },
    { name: 'textarea', frame: makeTextarea(), expectedTag: 'textarea' },
    { name: 'select', frame: makeSelect(), expectedTag: 'select' },
  ]

  for (const { name, frame, expectedTag } of cases) {
    it(`${name}: editor resolveTag = export tag = "${expectedTag}"`, () => {
      // Editor tag
      const editorTag = resolveTag(frame)
      expect(editorTag).toBe(expectedTag)

      // Export tag
      const html = exportToHTML(frame)
      const exportTag = extractTag(html)
      expect(exportTag).toBe(expectedTag)
    })
  }

  it('box (body) → editor uses div (React 19 singleton), export uses body', () => {
    const frame = makeBox({ tag: 'body' })
    // Editor must use div (React 19 can't nest <body> in existing <body>)
    expect(resolveTag(frame)).toBe('div')
    // Export uses body
    expect(extractTag(exportToHTML(frame))).toBe('body')
  })

  it('image (empty src) → editor uses div (placeholder), export uses img', () => {
    const frame = makeImage({ src: '' })
    // Editor renders div placeholder for authoring
    expect(resolveTag(frame)).toBe('div')
    // Export still produces img (even without src)
    expect(extractTag(exportToHTML(frame))).toBe('img')
  })
})

describe('Editor ↔ Export parity: classes match', () => {
  const frames = [
    makeBox({ bg: dvColorToken('blue-500'), padding: { top: dvToken('4', 16), right: dvToken('4', 16), bottom: dvToken('4', 16), left: dvToken('4', 16) } }),
    makeText({ fontSize: dvToken('lg', 18), fontWeight: dvNum(700), color: dvColorToken('red-500') }),
    makeImage({ src: 'photo.jpg', objectFit: 'contain', width: { mode: 'fixed', value: dvNum(200) } }),
    makeButton({ bg: dvStr('#333'), borderRadius: { topLeft: dvToken('lg', 8), topRight: dvToken('lg', 8), bottomRight: dvToken('lg', 8), bottomLeft: dvToken('lg', 8) } }),
    makeInput({ fontSize: dvToken('sm', 14), border: { width: dvToken('', 1), color: dvColorToken('gray-300'), style: 'solid' } }),
    makeTextarea({ fontSize: dvToken('base', 16), padding: { top: dvToken('2', 8), right: dvToken('2', 8), bottom: dvToken('2', 8), left: dvToken('2', 8) } }),
    makeSelect({ fontSize: dvToken('sm', 14), bg: dvColorToken('white') }),
  ]

  for (const frame of frames) {
    it(`${frame.type}: editor classes = export classes`, () => {
      // Editor uses frameToClasses directly
      const editorClasses = frameToClasses(frame)

      // Export uses buildClassString (which is frameToClasses + user className)
      const exportClasses = buildClassString(frame)

      // Without user className, they must be identical
      expect(editorClasses).toBe(exportClasses)

      // And the export HTML must contain those exact classes
      const html = exportToHTML(frame)
      if (editorClasses) {
        expect(html).toContain(`class="${editorClasses}"`)
      }
    })
  }
})
