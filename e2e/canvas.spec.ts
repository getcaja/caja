/**
 * Canvas E2E tests — runs in WebKit (matches Tauri WKWebView).
 *
 * Architecture: The canvas renders inside an iframe. We access the iframe's
 * content via page.frameLocator('iframe[title="Caja Canvas"]').
 *
 * State is seeded via localStorage before the app loads.
 */
import { test, expect, type Page, type FrameLocator } from '@playwright/test'

// ---------------------------------------------------------------------------
// Fixtures: minimal frame trees injected into localStorage
// ---------------------------------------------------------------------------

/** DesignValue helpers — mirrors store format */
const dv = (v: number) => ({ mode: 'custom', value: v })
const dvs = (v: string) => ({ mode: 'custom', value: v })
const dvt = (token: string, value: number) => ({ mode: 'token', token, value })
const dvct = (token: string, value = '#000000') => ({ mode: 'token', token, value })
const zeroSpacing = () => ({ top: dv(0), right: dv(0), bottom: dv(0), left: dv(0) })
const zeroBR = () => ({ topLeft: dv(0), topRight: dv(0), bottomRight: dv(0), bottomLeft: dv(0) })
const defaultSize = () => ({ mode: 'default', value: dv(0) })

const baseDefaults = {
  hidden: false, className: '', htmlId: '',
  width: defaultSize(), height: defaultSize(),
  grow: dv(0), shrink: dv(1),
  padding: zeroSpacing(), margin: zeroSpacing(),
  minWidth: dv(0), maxWidth: dv(0), minHeight: dv(0), maxHeight: dv(0),
  alignSelf: 'auto',
  bg: dvs(''), border: { width: dv(0), color: dvs(''), style: 'none' },
  borderRadius: zeroBR(), overflow: 'visible', opacity: dv(100),
  boxShadow: 'none', cursor: 'auto', tailwindClasses: '',
  position: 'static', zIndex: dv(0),
  inset: zeroSpacing(), bgImage: '', bgSize: 'auto', bgPosition: 'center', bgRepeat: 'repeat',
  blur: dv(0), backdropBlur: dv(0), rotate: dv(0), scaleVal: dv(100),
  translateX: dv(0), translateY: dv(0),
  transition: 'none', duration: dv(0), ease: 'linear',
  colSpan: dv(0), rowSpan: dv(0),
}

const textDefaults = {
  fontSize: dv(0), fontWeight: dv(400), lineHeight: dv(0),
  color: dvs(''), textAlign: 'left', fontStyle: 'normal',
  textDecoration: 'none', letterSpacing: dv(0), textTransform: 'none',
  whiteSpace: 'normal', fontFamily: '',
}

function makeRoot(children: object[]) {
  return {
    id: '__root__page-1', type: 'box', name: 'Body',
    ...baseDefaults,
    tag: 'body', display: 'flex', direction: 'column',
    justify: 'start', align: 'stretch', gap: dv(0), wrap: false,
    gridCols: dv(0), gridRows: dv(0),
    children,
  }
}

function makeBox(id: string, name: string, children: object[] = [], overrides: object = {}) {
  return {
    id, type: 'box', name, ...baseDefaults,
    tag: 'div', display: 'flex', direction: 'column',
    justify: 'start', align: 'stretch', gap: dv(0), wrap: false,
    gridCols: dv(0), gridRows: dv(0),
    children, ...overrides,
  }
}

function makeText(id: string, name: string, content: string, overrides: object = {}) {
  return {
    id, type: 'text', name, ...baseDefaults, ...textDefaults,
    content, tag: 'p', href: '', ...overrides,
  }
}

function makeInput(id: string, name: string, overrides: object = {}) {
  return {
    id, type: 'input', name, ...baseDefaults, ...textDefaults,
    placeholder: 'Type here', inputType: 'text', disabled: false, ...overrides,
  }
}

function makeImage(id: string, name: string, overrides: object = {}) {
  return {
    id, type: 'image', name, ...baseDefaults,
    src: '', alt: '', objectFit: 'cover', ...overrides,
  }
}

function makeButton(id: string, name: string, content: string, overrides: object = {}) {
  return {
    id, type: 'button', name, ...baseDefaults, ...textDefaults,
    content, ...overrides,
  }
}

function seedState(children: object[]) {
  const root = makeRoot(children)
  return JSON.stringify({
    pages: [{ id: 'page-1', name: 'Home', route: '/', root }],
    activePageId: 'page-1',
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canvasFrame(page: Page): FrameLocator {
  return page.frameLocator('iframe[title="Caja Canvas"]')
}

/** Wait for the canvas iframe to be ready (Tailwind loaded, React mounted) */
async function waitForCanvas(page: Page) {
  const frame = canvasFrame(page)
  // Wait for a data-frame-id element to appear (React has mounted inside iframe)
  await frame.locator('[data-frame-id]').first().waitFor({ timeout: 10_000 })
}

async function seedAndLoad(page: Page, children: object[]) {
  // Set localStorage before navigating so the app loads with this state
  await page.addInitScript((state: string) => {
    localStorage.setItem('caja-state', state)
  }, seedState(children))
  await page.goto('/')
  await waitForCanvas(page)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Canvas selection & hover', () => {
  // Use text elements as click targets — they're leaf nodes so clicks always land on them.
  // Parent boxes with children will have clicks intercepted by stopPropagation on children.
  const fixtures = [
    makeText('text-1', 'Title', 'Hello World'),
    makeText('text-2', 'Subtitle', 'Description'),
    makeBox('frame-1', 'Empty Box'),
  ]

  test('clicking an element selects it (shows is-selected class)', async ({ page }) => {
    await seedAndLoad(page, fixtures)
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-1"]')

    await el.click()
    await expect(el).toHaveClass(/is-selected/)
  })

  test('clicking a different element deselects the previous one', async ({ page }) => {
    await seedAndLoad(page, fixtures)
    const frame = canvasFrame(page)
    const el1 = frame.locator('[data-frame-id="text-1"]')
    const el2 = frame.locator('[data-frame-id="text-2"]')

    await el1.click()
    await expect(el1).toHaveClass(/is-selected/)

    await el2.click()
    await expect(el2).toHaveClass(/is-selected/)
    await expect(el1).not.toHaveClass(/is-selected/)
  })

  test('hovering an element shows is-hovered class', async ({ page }) => {
    await seedAndLoad(page, fixtures)
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-1"]')

    await el.hover()
    await expect(el).toHaveClass(/is-hovered/)
  })

  test('hovering a selected element does NOT show is-hovered', async ({ page }) => {
    await seedAndLoad(page, fixtures)
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-1"]')

    await el.click()
    await el.hover()
    await expect(el).toHaveClass(/is-selected/)
    await expect(el).not.toHaveClass(/is-hovered/)
  })

  test('root element never shows is-selected or is-hovered', async ({ page }) => {
    await seedAndLoad(page, fixtures)
    const frame = canvasFrame(page)
    const root = frame.locator('[data-frame-id="__root__page-1"]')

    // Select Body via tree panel
    await page.locator('text=Body').first().click()
    await page.waitForTimeout(100)
    await expect(root).not.toHaveClass(/is-selected/)
    await expect(root).not.toHaveClass(/is-hovered/)
  })
})

test.describe('Canvas DOM structure matches export', () => {
  test('text element renders as <p> tag', async ({ page }) => {
    await seedAndLoad(page, [
      makeText('text-1', 'Heading', 'Hello', { tag: 'h1' }),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('h1')
  })

  test('image with src renders as <img> tag', async ({ page }) => {
    await seedAndLoad(page, [
      makeImage('img-1', 'Photo', { src: 'https://via.placeholder.com/100', alt: 'test' }),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="img-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('img')
  })

  test('image without src renders as <div> (placeholder)', async ({ page }) => {
    await seedAndLoad(page, [
      makeImage('img-1', 'Photo'),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="img-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('div')
  })

  test('input renders as <input> tag', async ({ page }) => {
    await seedAndLoad(page, [
      makeInput('input-1', 'Email'),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="input-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('input')
  })

  test('button renders as <button> tag', async ({ page }) => {
    await seedAndLoad(page, [
      makeButton('btn-1', 'Submit', 'Click me'),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="btn-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('button')
  })

  test('box with tag=section renders as <section>', async ({ page }) => {
    await seedAndLoad(page, [
      makeBox('box-1', 'Section', [], { tag: 'section' }),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="box-1"]')
    await expect(el).toBeVisible()
    const tagName = await el.evaluate((e) => e.tagName.toLowerCase())
    expect(tagName).toBe('section')
  })
})

test.describe('Canvas outline rendering', () => {
  test('all frame elements have pre-allocated transparent outline', async ({ page }) => {
    await seedAndLoad(page, [
      makeBox('frame-1', 'Box A', [makeText('text-1', 'Label', 'Hello')]),
      makeBox('frame-2', 'Box B', [makeText('text-2', 'Label 2', 'World')]),
    ])
    const frame = canvasFrame(page)
    const elements = frame.locator('[data-frame-id]:not([data-frame-id="__root__page-1"])')
    const count = await elements.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const el = elements.nth(i)
      const outlineColor = await el.evaluate((e) => getComputedStyle(e).outlineColor)
      // transparent = rgba(0, 0, 0, 0) in computed styles
      expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(outlineColor)
    }
  })

  test('selected element has blue outline', async ({ page }) => {
    await seedAndLoad(page, [
      makeText('text-1', 'Label', 'Hello'),
      makeText('text-2', 'Label 2', 'World'),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-1"]')

    await el.click()
    await expect(el).toHaveClass(/is-selected/)

    const outlineColor = await el.evaluate((e) => getComputedStyle(e).outlineColor)
    // #2563EB = rgb(37, 99, 235)
    expect(outlineColor).toBe('rgb(37, 99, 235)')
  })

  test('hovered element has lighter blue outline', async ({ page }) => {
    await seedAndLoad(page, [
      makeText('text-1', 'Label', 'Hello'),
      makeText('text-2', 'Label 2', 'World'),
    ])
    const frame = canvasFrame(page)
    const el = frame.locator('[data-frame-id="text-2"]')

    await el.hover()
    await expect(el).toHaveClass(/is-hovered/)

    const outlineColor = await el.evaluate((e) => getComputedStyle(e).outlineColor)
    // #3B82F6 = rgb(59, 130, 246)
    expect(outlineColor).toBe('rgb(59, 130, 246)')
  })

  test('empty box shows dashed outline', async ({ page }) => {
    await seedAndLoad(page, [makeBox('empty-box', 'Empty', [])])
    const frame = canvasFrame(page)
    const box = frame.locator('[data-frame-id="empty-box"]')
    await expect(box).toHaveClass(/is-empty/)

    // Wait for Tailwind runtime to compile and CSS variable --color-surface-3 to resolve
    await frame.locator('[data-frame-id="empty-box"]').evaluate(async (el) => {
      // Poll until outline-style is dashed (Tailwind runtime needs to process @theme)
      for (let i = 0; i < 20; i++) {
        if (getComputedStyle(el).outlineStyle === 'dashed') return
        await new Promise((r) => setTimeout(r, 100))
      }
    })

    const outlineStyle = await box.evaluate((e) => getComputedStyle(e).outlineStyle)
    expect(outlineStyle).toBe('dashed')
  })
})

test.describe('Canvas visual regression', () => {
  test('selection outline does not leak to iframe border', async ({ page }) => {
    await seedAndLoad(page, [
      makeBox('frame-1', 'Box', [makeText('text-1', 'Text', 'Hello')]),
    ])
    const frame = canvasFrame(page)
    const root = frame.locator('[data-frame-id="__root__page-1"]')

    // Select root via tree
    await page.locator('text=Body').first().click()
    await page.waitForTimeout(100)

    const rootOutlineColor = await root.evaluate((e) => getComputedStyle(e).outlineColor)
    expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(rootOutlineColor)
  })

  test('rapid hover transitions do not cause flicker (outline always present)', async ({ page }) => {
    // Use text elements (leaf nodes) to guarantee hover lands on target
    const children = Array.from({ length: 5 }, (_, i) =>
      makeText(`text-${i + 1}`, `Text ${i + 1}`, `Item ${i + 1}`)
    )
    await seedAndLoad(page, children)
    const frame = canvasFrame(page)

    for (let i = 1; i <= 5; i++) {
      const el = frame.locator(`[data-frame-id="text-${i}"]`)
      await el.hover({ force: true })
      const outline = await el.evaluate((e) => {
        const s = getComputedStyle(e)
        return { style: s.outlineStyle, width: s.outlineWidth }
      })
      // outline-style should always be solid (pre-allocated), never 'none'
      expect(outline.style).toBe('solid')
    }
  })

  test('screenshot: basic layout matches baseline', async ({ page }) => {
    await seedAndLoad(page, [
      makeBox('frame-1', 'Card', [
        makeText('text-1', 'Title', 'Hello World', { fontSize: dvt('2xl', 24), fontWeight: dv(700) }),
        makeText('text-2', 'Body', 'This is a description paragraph.'),
      ], {
        bg: dvct('white', '#ffffff'),
        padding: { top: dvt('6', 24), right: dvt('6', 24), bottom: dvt('6', 24), left: dvt('6', 24) },
        borderRadius: { topLeft: dvt('lg', 8), topRight: dvt('lg', 8), bottomRight: dvt('lg', 8), bottomLeft: dvt('lg', 8) },
        gap: dvt('4', 16),
      }),
    ])

    const iframe = page.locator('iframe[title="Caja Canvas"]')
    await expect(iframe).toHaveScreenshot('basic-card-layout.png', {
      maxDiffPixelRatio: 0.01,
    })
  })
})

test.describe('Canvas text editing', () => {
  test('double-click on text enters editing mode', async ({ page }) => {
    await seedAndLoad(page, [
      makeText('text-1', 'Title', 'Edit me'),
    ])
    const frame = canvasFrame(page)
    const text = frame.locator('[data-frame-id="text-1"]')

    await text.click()
    await text.dblclick()

    const editable = frame.locator('.frame-text-editing')
    await expect(editable).toBeVisible()
  })
})

test.describe('Canvas drag handle', () => {
  test('selected box shows drag handle', async ({ page }) => {
    await seedAndLoad(page, [
      makeBox('frame-1', 'Card', [
        makeText('text-1', 'Label', 'Drag me'),
      ]),
    ])
    const frame = canvasFrame(page)

    // Click the text to select it, then click the parent box via tree
    await page.locator('text=Card').first().click()
    const handle = frame.locator('.frame-drag-handle')
    await expect(handle).toBeVisible()
  })

  test('void elements (img, input) do NOT show drag handle', async ({ page }) => {
    await seedAndLoad(page, [
      makeInput('input-1', 'Email'),
    ])
    const frame = canvasFrame(page)

    // Select input via tree panel
    await page.locator('text=Email').first().click()
    const handle = frame.locator('.frame-drag-handle')
    await expect(handle).not.toBeVisible()
  })
})
