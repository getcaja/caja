/**
 * Regression test: MCP add_frame must NEVER apply auto-style (random bg colors
 * and default height) to new box frames, regardless of the user's styleNewFrames
 * preference. The MCP caller is responsible for all styling via classes/properties.
 *
 * Without this bypass, every box added via MCP gets a rainbow of random colors.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

function readSource(filename: string): string {
  return readFileSync(resolve(dir, '..', filename), 'utf-8')
}

describe('MCP add_frame bypasses styleNewFrames', () => {
  it('disables styleNewFrames before calling addChild', () => {
    const src = readSource('tools.ts')
    // Must set styleNewFrames to false before addChild
    const disableIdx = src.indexOf('styleNewFrames: false')
    const firstAddChild = src.indexOf('store.addChild(parent_id, element_type')
    expect(disableIdx, 'styleNewFrames must be set to false before addChild').toBeGreaterThan(-1)
    expect(firstAddChild, 'addChild call must exist').toBeGreaterThan(-1)
    expect(disableIdx, 'styleNewFrames: false must come before addChild').toBeLessThan(firstAddChild)
  })

  it('restores styleNewFrames in a finally block', () => {
    const src = readSource('tools.ts')
    // The add_frame handler must have a try/finally that restores the flag
    // Find the add_frame handler region
    const addFrameStart = src.indexOf('async add_frame(params)')
    expect(addFrameStart).toBeGreaterThan(-1)
    const addFrameRegion = src.slice(addFrameStart, src.indexOf('\n  },', addFrameStart))
    expect(addFrameRegion).toContain('try {')
    expect(addFrameRegion).toContain('} finally {')
    expect(addFrameRegion).toContain('styleNewFrames: true')
  })
})
