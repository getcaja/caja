/**
 * Regression test: when the user clicks "Save" in the unsaved changes dialog
 * but then cancels the file picker, the destructive action (new/open/quit/close)
 * must be ABORTED. Previously, cancelling the save dialog still proceeded with
 * newFile(), losing all work.
 *
 * Verifies:
 * 1. handleSave returns a boolean (Promise<boolean>)
 * 2. All unsaved-changes callers check the return value and abort on false
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(dir, '../../../App.tsx'), 'utf-8')

describe('handleSave returns boolean', () => {
  it('has Promise<boolean> return type', () => {
    expect(src).toContain('async (): Promise<boolean>')
  })

  it('returns true on successful save', () => {
    // After markClean + addToRecent, should return true
    const returnTrue = src.indexOf('return true')
    const markClean = src.indexOf('store.markClean()')
    expect(returnTrue).toBeGreaterThan(markClean)
  })

  it('returns false when save is cancelled', () => {
    // After the if(path) block, should return false
    expect(src).toContain('return false')
  })
})

describe('Unsaved changes guard aborts on cancelled save', () => {
  // Each handler that calls handleSave after an "unsaved changes" dialog
  // must check the return value and break/return if save was cancelled

  it('new: aborts if save cancelled', () => {
    const newCase = src.slice(src.indexOf("case 'new':"), src.indexOf("case 'open':"))
    expect(newCase).toContain('const saved = await handleSave()')
    expect(newCase).toContain('if (!saved) break')
  })

  it('open: aborts if save cancelled', () => {
    const openCase = src.slice(src.indexOf("case 'open':"), src.indexOf("case 'quit':"))
    expect(openCase).toContain('const saved = await handleSave()')
    expect(openCase).toContain('if (!saved) break')
  })

  it('quit: aborts if save cancelled', () => {
    const quitCase = src.slice(src.indexOf("case 'quit':"), src.indexOf("case 'save':"))
    expect(quitCase).toContain('const saved = await handleSave')
    expect(quitCase).toContain('if (!saved) break')
  })

  it('close: aborts if save cancelled', () => {
    const closeHandler = src.slice(src.indexOf('onCloseRequested'), src.indexOf('closingRef.current = true'))
    expect(closeHandler).toContain('const saved = await handleSaveRef.current()')
    expect(closeHandler).toContain('if (!saved) return')
  })
})
