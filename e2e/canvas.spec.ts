/**
 * Canvas E2E tests — runs in WebKit (matches Tauri WKWebView).
 *
 * Architecture: The canvas renders inline via #caja-canvas container.
 *
 * State is seeded via localStorage before the app loads.
 */
import { test, expect } from '@playwright/test'
import {
  dv, dvt, dvct, canvasFrame,
  makeBox, makeText, makeInput, makeImage, makeButton,
  seedAndLoad,
} from './helpers'

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
  test('selection outline does not leak to canvas border', async ({ page }) => {
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

    const canvas = canvasFrame(page)
    await expect(canvas).toHaveScreenshot('basic-card-layout.png', {
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
