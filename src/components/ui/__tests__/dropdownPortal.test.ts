/**
 * Regression test: dropdown menus in TokenInput and SizeInput MUST render via
 * createPortal to document.body with position:fixed. When dropdowns use
 * position:absolute inside the properties panel's overflow-y:auto scroll
 * container, hover-triggered store updates cause WebKit to reset scrollTop.
 *
 * Also: scroll-into-view effects must use manual scrollTop on the dropdown
 * container, never scrollIntoView() which scrolls all ancestor containers.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

function readSource(filename: string): string {
  return readFileSync(resolve(dir, '..', filename), 'utf-8')
}

describe('Dropdown portal rendering (scroll-jump prevention)', () => {
  it('TokenInput renders dropdown via createPortal with fixed positioning', () => {
    const src = readSource('TokenInput.tsx')
    expect(src).toContain("createPortal")
    expect(src).toContain("document.body")
    expect(src).toContain("position: 'fixed'")
  })

  it('TokenInput dropdown does NOT use position absolute', () => {
    const src = readSource('TokenInput.tsx')
    const dropdownSection = src.slice(src.indexOf('ref={dropdownRef}'))
    const dropdownStyle = dropdownSection.slice(0, dropdownSection.indexOf('onMouseLeave'))
    expect(dropdownStyle).not.toMatch(/className=.*absolute/)
  })

  it('SizeInput renders dropdown via createPortal with fixed positioning', () => {
    const src = readSource('SizeInput.tsx')
    expect(src).toContain("createPortal")
    expect(src).toContain("document.body")
    expect(src).toContain("position: 'fixed'")
  })

  it('SizeInput dropdown does NOT use position absolute', () => {
    const src = readSource('SizeInput.tsx')
    const dropdownSection = src.slice(src.indexOf('ref={dropdownRef}'))
    const dropdownStyle = dropdownSection.slice(0, dropdownSection.indexOf('onMouseLeave'))
    expect(dropdownStyle).not.toMatch(/className=.*absolute/)
  })

  it('No scrollIntoView in dropdown scroll effects', () => {
    for (const file of ['TokenInput.tsx', 'SizeInput.tsx']) {
      const src = readSource(file)
      const scrollEffect = src.match(/Scroll selected.*?(?=\n\s+\/\/ ---|\n\s+const )/s)
      if (scrollEffect) {
        expect(scrollEffect[0], `${file} scroll effect must not use scrollIntoView`).not.toContain('scrollIntoView')
      }
    }
  })
})

describe('Keyboard handler deduplication', () => {
  it('useTreeKeyboard checks defaultPrevented on all action handlers', () => {
    const src = readSource('../TreePanel/hooks/useTreeKeyboard.ts')
    // Every action handler (Delete, arrows, Cmd+A/C/X/V/D) must check defaultPrevented
    // Only match the `if (...)` guard lines, not body lines
    const actionLines = src.split('\n').filter(line =>
      line.trimStart().startsWith('if') && (
        line.includes("e.key === 'Delete'") ||
        line.includes("e.key === 'Backspace'") ||
        line.includes("'ArrowUp'") ||
        line.includes('config.selectAll') ||
        line.includes('config.copySelected') ||
        line.includes('config.cutSelected') ||
        line.includes('config.pasteClipboard') ||
        line.includes('config.duplicateSelected')
      )
    )
    expect(actionLines.length).toBeGreaterThan(0)
    for (const line of actionLines) {
      expect(line, `Handler must check defaultPrevented: ${line.trim()}`).toContain('defaultPrevented')
    }
  })
})
