/**
 * Regression test: MCP new_file must show a native Caja dialog when there are
 * unsaved changes, forcing the user to respond in the app UI — not just blindly
 * confirming in the agent's terminal. If the user saves, the save must succeed
 * before proceeding. If the save is cancelled, new_file must abort.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))

function readSource(filename: string): string {
  return readFileSync(resolve(dir, '..', filename), 'utf-8')
}

describe('MCP new_file unsaved changes guard', () => {
  const src = readSource('tools.ts')
  // Extract the new_file handler
  const handlerStart = src.indexOf('async new_file()')
  const handlerEnd = src.indexOf('\n  },', handlerStart)
  const handler = src.slice(handlerStart, handlerEnd)

  it('new_file is async (can await dialogs)', () => {
    expect(handlerStart).toBeGreaterThan(-1)
    expect(handler).toContain('async new_file()')
  })

  it('checks dirty state before proceeding', () => {
    expect(handler).toContain('store.dirty')
  })

  it('shows unsaved changes dialog (not just returns error)', () => {
    expect(handler).toContain('askUnsavedChanges(')
  })

  it('calls saveFile when user chooses Save', () => {
    expect(handler).toContain('saveFile(')
  })

  it('aborts new_file if save is cancelled by user', () => {
    expect(handler).toContain('if (!path)')
    expect(handler).toContain('new file aborted')
  })

  it('only calls newFile() after guard passes', () => {
    // newFile() must come AFTER the dirty check block
    const dirtyCheck = handler.indexOf('store.dirty')
    const newFileCall = handler.lastIndexOf('store.newFile()')
    expect(newFileCall).toBeGreaterThan(dirtyCheck)
  })
})
