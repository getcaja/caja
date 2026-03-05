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

describe('Unsaved changes dialog has cancel option (3 buttons)', () => {
  it('all handlers use askUnsavedChanges (not Tauri ask)', () => {
    expect(src).toContain("import { askUnsavedChanges } from './lib/unsavedDialog'")
    // No more Tauri ask() for unsaved changes
    expect(src).not.toContain("okLabel: 'Save'")
    expect(src).not.toContain("cancelLabel: \"Don't Save\"")
  })

  it('new: checks for cancel choice', () => {
    const newCase = src.slice(src.indexOf("case 'new':"), src.indexOf("case 'open':"))
    expect(newCase).toContain("askUnsavedChanges(")
    expect(newCase).toContain("choice === 'cancel'")
  })

  it('open: checks for cancel choice', () => {
    const openCase = src.slice(src.indexOf("case 'open':"), src.indexOf("case 'quit':"))
    expect(openCase).toContain("askUnsavedChanges(")
    expect(openCase).toContain("choice === 'cancel'")
  })

  it('quit: checks for cancel choice', () => {
    const quitCase = src.slice(src.indexOf("case 'quit':"), src.indexOf("case 'save':"))
    expect(quitCase).toContain("askUnsavedChanges(")
    expect(quitCase).toContain("choice === 'cancel'")
  })

  it('close: checks for cancel choice', () => {
    const closeHandler = src.slice(src.indexOf('onCloseRequested'), src.indexOf('closingRef.current = true'))
    expect(closeHandler).toContain("askUnsavedChanges(")
    expect(closeHandler).toContain("choice === 'cancel'")
  })
})

describe('handleSave has error handling', () => {
  it('handleSave wraps saveFile in try/catch', () => {
    const saveBlock = src.slice(src.indexOf('const handleSave'), src.indexOf('const handleSaveAs'))
    expect(saveBlock).toContain('try {')
    expect(saveBlock).toContain('catch (err)')
    expect(saveBlock).toContain("'Save Failed'")
  })

  it('handleSaveAs wraps saveFileAs in try/catch', () => {
    const saveAsBlock = src.slice(src.indexOf('const handleSaveAs'), src.indexOf('const handleOpen'))
    expect(saveAsBlock).toContain('try {')
    expect(saveAsBlock).toContain('catch (err)')
    expect(saveAsBlock).toContain("'Save Failed'")
  })
})

describe('saveFile validates filePath exists on disk', () => {
  it('fileOps checks exists() before writing', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { resolve, dirname } = await import('node:path')
    const fileOpsSrc = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../lib/fileOps.ts'),
      'utf-8',
    )
    expect(fileOpsSrc).toContain('exists(currentPath)')
    expect(fileOpsSrc).toContain('saveFileAs(')
  })
})

describe('askUnsavedChanges uses native 3-button dialog', () => {
  it('uses message() with yes/no/cancel buttons', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { resolve, dirname } = await import('node:path')
    const dialogSrc = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../lib/unsavedDialog.ts'),
      'utf-8',
    )
    // Uses Tauri message() not ask()
    expect(dialogSrc).toContain("import('@tauri-apps/plugin-dialog')")
    expect(dialogSrc).toContain('message(')
    // Has all 3 button labels
    expect(dialogSrc).toContain("yes: 'Save'")
    expect(dialogSrc).toContain("no: \"Don't Save\"")
    expect(dialogSrc).toContain("cancel: 'Cancel'")
  })
})
