/**
 * Shared E2E test helpers — frame factories, state seeding, canvas access.
 *
 * Used by canvas.spec.ts and editor.spec.ts.
 */
import type { Page, Locator } from '@playwright/test'

// ---------------------------------------------------------------------------
// DesignValue helpers — mirrors store format
// ---------------------------------------------------------------------------

export const dv = (v: number) => ({ mode: 'custom', value: v })
export const dvs = (v: string) => ({ mode: 'custom', value: v })
export const dvt = (token: string, value: number) => ({ mode: 'token', token, value })
export const dvct = (token: string, value = '#000000') => ({ mode: 'token', token, value })
export const zeroSpacing = () => ({ top: dv(0), right: dv(0), bottom: dv(0), left: dv(0) })
export const zeroBR = () => ({ topLeft: dv(0), topRight: dv(0), bottomRight: dv(0), bottomLeft: dv(0) })
export const defaultSize = () => ({ mode: 'default', value: dv(0) })

export const baseDefaults = {
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

export const textDefaults = {
  fontSize: dv(0), fontWeight: dv(400), lineHeight: dv(0),
  color: dvs(''), textAlign: 'left', fontStyle: 'normal',
  textDecoration: 'none', letterSpacing: dv(0), textTransform: 'none',
  whiteSpace: 'normal', fontFamily: '',
}

// ---------------------------------------------------------------------------
// Frame factories
// ---------------------------------------------------------------------------

export function makeRoot(children: object[]) {
  return {
    id: '__root__page-1', type: 'box', name: 'Body',
    ...baseDefaults,
    tag: 'body', display: 'flex', direction: 'column',
    justify: 'start', align: 'stretch', gap: dv(0), wrap: false,
    gridCols: dv(0), gridRows: dv(0),
    children,
  }
}

export function makeBox(id: string, name: string, children: object[] = [], overrides: object = {}) {
  return {
    id, type: 'box', name, ...baseDefaults,
    tag: 'div', display: 'flex', direction: 'column',
    justify: 'start', align: 'stretch', gap: dv(0), wrap: false,
    gridCols: dv(0), gridRows: dv(0),
    children, ...overrides,
  }
}

export function makeText(id: string, name: string, content: string, overrides: object = {}) {
  return {
    id, type: 'text', name, ...baseDefaults, ...textDefaults,
    content, tag: 'p', href: '', ...overrides,
  }
}

export function makeInput(id: string, name: string, overrides: object = {}) {
  return {
    id, type: 'input', name, ...baseDefaults, ...textDefaults,
    placeholder: 'Type here', inputType: 'text', disabled: false, ...overrides,
  }
}

export function makeImage(id: string, name: string, overrides: object = {}) {
  return {
    id, type: 'image', name, ...baseDefaults,
    src: '', alt: '', objectFit: 'cover', ...overrides,
  }
}

export function makeButton(id: string, name: string, content: string, overrides: object = {}) {
  return {
    id, type: 'button', name, ...baseDefaults, ...textDefaults,
    content, ...overrides,
  }
}

// ---------------------------------------------------------------------------
// State seeding
// ---------------------------------------------------------------------------

export function seedState(children: object[]) {
  const root = makeRoot(children)
  return JSON.stringify({
    pages: [{ id: 'page-1', name: 'Home', route: '/', root }],
    activePageId: 'page-1',
  })
}

// ---------------------------------------------------------------------------
// Playwright helpers
// ---------------------------------------------------------------------------

/** Returns a locator scoped to the inline canvas container */
export function canvasFrame(page: Page): Locator {
  return page.locator('#caja-canvas')
}

/** Wait for the canvas to be ready (React mounted, frames rendered) */
export async function waitForCanvas(page: Page) {
  const canvas = canvasFrame(page)
  await canvas.locator('[data-frame-id]').first().waitFor({ timeout: 10_000 })
}

export async function seedAndLoad(page: Page, children: object[]) {
  await page.addInitScript((state: string) => {
    localStorage.setItem('caja-state', state)
  }, seedState(children))
  await page.goto('/')
  await waitForCanvas(page)
}
