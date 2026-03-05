/**
 * Regression test: "Reset Workspace" (Cmd+Shift+R) must reset ALL workspace
 * state to defaults: panels, zoom, breakpoint, preview mode, spacing grid,
 * auto-style, and section collapse states.
 *
 * Previously "Reset Interface to Default" — renamed and expanded to include
 * zoom, breakpoint, and preview mode resets.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

function readSource(relPath: string): string {
  return readFileSync(resolve(dir, relPath), 'utf-8')
}

describe('Reset Workspace handler', () => {
  const src = readSource('../../../App.tsx')

  // Extract the reset-workspace case block
  const caseStart = src.indexOf("case 'reset-workspace':")
  const caseEnd = src.indexOf('break', caseStart)
  const block = src.slice(caseStart, caseEnd)

  it('handler exists', () => {
    expect(caseStart).toBeGreaterThan(-1)
  })

  it('resets panel widths to defaults', () => {
    expect(block).toContain('setLeftWidth(LEFT_DEFAULT)')
    expect(block).toContain('setRightWidth(RIGHT_DEFAULT)')
  })

  it('expands both panels', () => {
    expect(block).toContain('setLeftCollapsed(false)')
    expect(block).toContain('setRightCollapsed(false)')
  })

  it('expands all tree layers', () => {
    expect(block).toContain('expandAll()')
  })

  it('resets auto-style new frames to on', () => {
    expect(block).toContain('setStyleNewFrames(true)')
  })

  it('resets spacing grid to 4px', () => {
    expect(block).toContain("setSpacingGrid('4px')")
  })

  it('resets zoom to 100%', () => {
    expect(block).toContain('setCanvasZoom(1)')
  })

  it('resets breakpoint to base (desktop)', () => {
    expect(block).toContain("setActiveBreakpoint('base')")
  })

  it('resets preview mode to off', () => {
    expect(block).toContain('setPreviewMode(false)')
  })

  it('clears section collapse localStorage keys', () => {
    expect(block).toContain("caja-section-")
    expect(block).toContain('localStorage.removeItem')
  })
})

describe('Reset Workspace menu item (Rust)', () => {
  const rs = readSource('../../../../src-tauri/src/lib.rs')

  it('uses reset-workspace ID (not old reset-layout)', () => {
    expect(rs).toContain('"reset-workspace"')
    expect(rs).not.toContain('"reset-layout"')
  })

  it('has label "Reset Workspace"', () => {
    expect(rs).toContain('"Reset Workspace"')
    expect(rs).not.toContain('"Reset Interface to Default"')
  })

  it('has Cmd+Shift+R shortcut', () => {
    // The accelerator should be on the same menu item
    const resetIdx = rs.indexOf('"reset-workspace"')
    const nextItem = rs.indexOf('MenuItemBuilder', resetIdx + 1)
    const region = rs.slice(resetIdx, nextItem > -1 ? nextItem : resetIdx + 300)
    expect(region).toContain('CmdOrCtrl+Shift+R')
  })

  it('is in the Window menu, not View menu', () => {
    const windowMenuStart = rs.indexOf('SubmenuBuilder::new(app, "Window")')
    const windowMenuEnd = rs.indexOf('.build()?;', windowMenuStart)
    const windowMenu = rs.slice(windowMenuStart, windowMenuEnd)
    expect(windowMenu).toContain('reset_workspace')

    const viewMenuStart = rs.indexOf('SubmenuBuilder::new(app, "View")')
    const viewMenuEnd = rs.indexOf('.build()?;', viewMenuStart)
    const viewMenu = rs.slice(viewMenuStart, viewMenuEnd)
    expect(viewMenu).not.toContain('reset_workspace')
    expect(viewMenu).not.toContain('reset_layout')
  })
})
