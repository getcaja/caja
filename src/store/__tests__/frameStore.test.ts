import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage before importing the store (it subscribes at module level)
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
})

import { useFrameStore, findInTree, findParent, isRootId, normalizeFrame } from '../frameStore'
import type { BoxElement, Frame, InputElement, TextElement } from '../../types/frame'

// --- Helpers ---

function store() {
  return useFrameStore.getState()
}

function root(): BoxElement {
  return store().root
}

function rootChildren(): Frame[] {
  return root().children
}

/** Reset to blank state between tests */
function resetStore() {
  store().newFile()
  // newFile doesn't clear clipboard — do it explicitly
  useFrameStore.setState({ clipboard: [] })
  storage.clear()
}

/** Add a child and return its id */
function addChild(type: Parameters<ReturnType<typeof useFrameStore.getState>['addChild']>[1] = 'box', parentId?: string): string {
  const s = store()
  s.addChild(parentId ?? s.root.id, type)
  return useFrameStore.getState().selectedId!
}

// --- Tests ---

describe('frameStore', () => {
  beforeEach(() => {
    resetStore()
  })

  // ===== Tree Mutations =====

  describe('addChild', () => {
    it('adds a box child to root', () => {
      addChild('box')
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('box')
    })

    it('adds a text child', () => {
      addChild('text')
      expect(rootChildren()[0].type).toBe('text')
    })

    it('adds an image child', () => {
      addChild('image')
      expect(rootChildren()[0].type).toBe('image')
    })

    it('adds a button child', () => {
      addChild('button')
      expect(rootChildren()[0].type).toBe('button')
    })

    it('adds an input child', () => {
      addChild('input')
      expect(rootChildren()[0].type).toBe('input')
    })

    it('adds a textarea child', () => {
      addChild('textarea')
      expect(rootChildren()[0].type).toBe('textarea')
    })

    it('adds a select child', () => {
      addChild('select')
      expect(rootChildren()[0].type).toBe('select')
    })

    it('adds a link child (text with tag=a)', () => {
      addChild('link')
      const child = rootChildren()[0] as TextElement
      expect(child.type).toBe('text')
      expect(child.tag).toBe('a')
    })

    it('auto-names children sequentially', () => {
      addChild('box')
      addChild('box')
      expect(rootChildren()[0].name).toBe('frame-1')
      expect(rootChildren()[1].name).toBe('frame-2')
    })

    it('selects the newly added child', () => {
      const id = addChild('text')
      expect(store().selectedId).toBe(id)
      expect(store().selectedIds.has(id)).toBe(true)
    })

    it('adds child to nested parent', () => {
      const parentId = addChild('box')
      addChild('text', parentId)
      const parent = findInTree(root(), parentId) as BoxElement
      expect(parent.children).toHaveLength(1)
      expect(parent.children[0].type).toBe('text')
    })

    it('supports overrides', () => {
      store().addChild(root().id, 'box', { name: 'Custom' })
      expect(rootChildren()[0].name).toBe('Custom')
    })

    it('pushes undo history', () => {
      addChild('box')
      store().undo()
      expect(rootChildren()).toHaveLength(0)
    })
  })

  describe('removeFrame', () => {
    it('removes a child from root', () => {
      const id = addChild('box')
      store().removeFrame(id)
      expect(rootChildren()).toHaveLength(0)
    })

    it('does not remove root', () => {
      store().removeFrame(root().id)
      expect(root()).toBeDefined()
      expect(isRootId(root().id)).toBe(true)
    })

    it('clears selection if removed frame was selected', () => {
      const id = addChild('box')
      store().select(id)
      store().removeFrame(id)
      expect(store().selectedId).toBeNull()
    })

    it('removes nested children', () => {
      const parentId = addChild('box')
      addChild('text', parentId)
      const childId = (findInTree(root(), parentId) as BoxElement).children[0].id
      store().removeFrame(childId)
      expect((findInTree(root(), parentId) as BoxElement).children).toHaveLength(0)
    })
  })

  describe('duplicateFrame', () => {
    it('creates a duplicate next to the original', () => {
      const id = addChild('text')
      store().duplicateFrame(id)
      expect(rootChildren()).toHaveLength(2)
      expect(rootChildren()[0].id).toBe(id)
      expect(rootChildren()[1].id).not.toBe(id)
    })

    it('deep-clones box with children', () => {
      const boxId = addChild('box')
      addChild('text', boxId)
      addChild('image', boxId)
      store().duplicateFrame(boxId)
      const clone = rootChildren()[1] as BoxElement
      expect(clone.children).toHaveLength(2)
      // All IDs should be new
      const origBox = rootChildren()[0] as BoxElement
      expect(clone.id).not.toBe(origBox.id)
      expect(clone.children[0].id).not.toBe(origBox.children[0].id)
    })

    it('selects the duplicate', () => {
      const id = addChild('box')
      store().duplicateFrame(id)
      expect(store().selectedId).toBe(rootChildren()[1].id)
    })

    it('stores idMap in _lastDuplicateMap', () => {
      const id = addChild('box')
      store().duplicateFrame(id)
      const map = store()._lastDuplicateMap
      expect(map).not.toBeNull()
      expect(map![id]).toBe(rootChildren()[1].id)
    })

    it('does not duplicate root', () => {
      store().duplicateFrame(root().id)
      // Should be no-op
      expect(store().pages).toHaveLength(1)
    })
  })

  describe('wrapInFrame', () => {
    it('wraps a frame in a new box parent', () => {
      const id = addChild('text')
      store().wrapInFrame(id)
      expect(rootChildren()).toHaveLength(1)
      const wrapper = rootChildren()[0] as BoxElement
      expect(wrapper.type).toBe('box')
      expect(wrapper.children).toHaveLength(1)
      expect(wrapper.children[0].id).toBe(id)
    })

    it('selects the wrapper', () => {
      const id = addChild('text')
      store().wrapInFrame(id)
      expect(store().selectedId).toBe(rootChildren()[0].id)
    })

    it('does not wrap root', () => {
      store().wrapInFrame(root().id)
      expect(isRootId(root().id)).toBe(true)
    })
  })

  describe('moveFrame', () => {
    it('moves a frame to a different parent', () => {
      const textId = addChild('text')
      const boxId = addChild('box')
      store().moveFrame(textId, boxId, 0)
      expect(rootChildren()).toHaveLength(1)
      const box = rootChildren()[0] as BoxElement
      expect(box.children).toHaveLength(1)
      expect(box.children[0].id).toBe(textId)
    })

    it('moves to specific index', () => {
      const boxId = addChild('box')
      addChild('text', boxId)
      addChild('text', boxId)
      const newChild = addChild('image')
      store().moveFrame(newChild, boxId, 1)
      const box = findInTree(root(), boxId) as BoxElement
      expect(box.children[1].type).toBe('image')
    })

    it('does not move root', () => {
      const boxId = addChild('box')
      store().moveFrame(root().id, boxId, 0)
      // root should still be root
      expect(isRootId(root().id)).toBe(true)
    })
  })

  describe('reorderFrame', () => {
    it('moves frame up', () => {
      addChild('text')
      const secondId = addChild('image')
      store().reorderFrame(secondId, 'up')
      expect(rootChildren()[0].type).toBe('image')
      expect(rootChildren()[1].type).toBe('text')
    })

    it('moves frame down', () => {
      const firstId = addChild('text')
      addChild('image')
      store().reorderFrame(firstId, 'down')
      expect(rootChildren()[0].type).toBe('image')
      expect(rootChildren()[1].type).toBe('text')
    })

    it('no-op at boundary', () => {
      const firstId = addChild('text')
      addChild('image')
      store().reorderFrame(firstId, 'up')
      // Should remain unchanged
      expect(rootChildren()[0].type).toBe('text')
    })
  })

  // ===== Selection & Clipboard =====

  describe('select / selectMulti', () => {
    it('selects a frame by id', () => {
      const id = addChild('text')
      store().select(null)
      store().select(id)
      expect(store().selectedId).toBe(id)
      expect(store().selectedIds.has(id)).toBe(true)
    })

    it('deselects with null', () => {
      const id = addChild('text')
      store().select(id)
      store().select(null)
      expect(store().selectedId).toBeNull()
      expect(store().selectedIds.size).toBe(0)
    })

    it('selectMulti toggles frames in selection set', () => {
      const id1 = addChild('text')
      const id2 = addChild('image')
      store().select(id1)
      store().selectMulti(id2)
      expect(store().selectedIds.has(id1)).toBe(true)
      expect(store().selectedIds.has(id2)).toBe(true)
    })

    it('selectMulti removes on second click', () => {
      const id1 = addChild('text')
      const id2 = addChild('image')
      store().select(id1)
      store().selectMulti(id2)
      store().selectMulti(id2)
      expect(store().selectedIds.has(id2)).toBe(false)
    })
  })

  describe('removeSelected', () => {
    it('removes all selected frames', () => {
      const id1 = addChild('text')
      const id2 = addChild('image')
      store().select(id1)
      store().selectMulti(id2)
      store().removeSelected()
      expect(rootChildren()).toHaveLength(0)
      expect(store().selectedId).toBeNull()
    })

    it('skips root in selection', () => {
      addChild('text')
      store().select(root().id)
      store().removeSelected()
      // Root should not be removed, but text is still there
      expect(isRootId(root().id)).toBe(true)
    })

    it('no-op with no selection', () => {
      addChild('text')
      store().select(null)
      store().removeSelected()
      expect(rootChildren()).toHaveLength(1)
    })
  })

  describe('copy / cut / paste', () => {
    it('copies selected frame to clipboard', () => {
      const id = addChild('text')
      store().select(id)
      store().copySelected()
      expect(store().clipboard).toHaveLength(1)
      // Original still exists
      expect(rootChildren()).toHaveLength(1)
    })

    it('cuts selected frame — removes from tree, copies to clipboard', () => {
      const id = addChild('text')
      store().select(id)
      store().cutSelected()
      expect(store().clipboard).toHaveLength(1)
      expect(rootChildren()).toHaveLength(0)
    })

    it('paste creates new IDs', () => {
      const id = addChild('text')
      store().select(id)
      store().copySelected()
      store().pasteClipboard()
      expect(rootChildren()).toHaveLength(2)
      expect(rootChildren()[1].id).not.toBe(id)
    })

    it('paste inserts after selected frame', () => {
      addChild('text')
      const secondId = addChild('image')
      addChild('button')
      store().select(secondId)
      store().copySelected()
      store().pasteClipboard()
      // Should insert after image (index 1), so index 2 should be the paste
      expect(rootChildren()).toHaveLength(4)
      expect(rootChildren()[2].type).toBe('image') // pasted copy
    })

    it('paste at root when nothing selected', () => {
      const id = addChild('text')
      store().select(id)
      store().copySelected()
      store().select(null)
      store().pasteClipboard()
      expect(rootChildren()).toHaveLength(2)
    })

    it('paste is no-op with empty clipboard', () => {
      addChild('text')
      store().pasteClipboard()
      expect(rootChildren()).toHaveLength(1)
    })

    it('cut does not copy root', () => {
      store().select(root().id)
      store().cutSelected()
      expect(store().clipboard).toHaveLength(0)
    })

    it('multi-select copy/paste', () => {
      const id1 = addChild('text')
      const id2 = addChild('image')
      store().select(id1)
      store().selectMulti(id2)
      store().copySelected()
      expect(store().clipboard).toHaveLength(2)
      store().pasteClipboard()
      expect(rootChildren()).toHaveLength(4)
    })
  })

  // ===== Insertion =====

  describe('insertFrame / insertFrameAt', () => {
    it('insertFrame normalizes and clones the frame', () => {
      const raw: Partial<BoxElement> = { type: 'box', name: 'Test', children: [] } as any
      store().insertFrame(root().id, raw as Frame)
      expect(rootChildren()).toHaveLength(1)
      // Should have all default fields filled (createBox defaults to 'block')
      const inserted = rootChildren()[0] as BoxElement
      expect(inserted.display).toBe('block')
      expect(inserted.padding).toBeDefined()
    })

    it('insertFrame assigns new IDs', () => {
      const raw: Partial<BoxElement> = { id: 'old-id', type: 'box', name: 'Test', children: [] } as any
      store().insertFrame(root().id, raw as Frame)
      expect(rootChildren()[0].id).not.toBe('old-id')
    })

    it('insertFrame stores origin metadata', () => {
      const raw: Partial<BoxElement> = { type: 'box', name: 'Test', children: [] } as any
      store().insertFrame(root().id, raw as Frame, { patternId: 'p1' })
      expect(rootChildren()[0]._origin).toEqual({ patternId: 'p1' })
    })

    it('insertFrameAt inserts at specified index', () => {
      addChild('text')
      addChild('image')
      const raw: Partial<BoxElement> = { type: 'box', name: 'Middle', children: [] } as any
      store().insertFrameAt(root().id, raw as Frame, 1)
      expect(rootChildren()).toHaveLength(3)
      expect(rootChildren()[1].name).toBe('Middle')
    })

    it('insertFrame does nothing for non-box parent', () => {
      const textId = addChild('text')
      const raw: Partial<BoxElement> = { type: 'box', name: 'X', children: [] } as any
      store().insertFrame(textId, raw as Frame)
      // Text can't have children — should be no-op
      expect(rootChildren()).toHaveLength(1)
    })
  })

  // ===== Updates =====

  describe('updateFrame', () => {
    it('updates a frame with partial data', () => {
      const id = addChild('text')
      store().updateFrame(id, { content: 'Updated' } as Partial<TextElement>)
      const frame = findInTree(root(), id) as TextElement
      expect(frame.content).toBe('Updated')
    })

    it('preserves non-updated fields', () => {
      const id = addChild('text')
      const original = findInTree(root(), id) as TextElement
      const origContent = original.content
      store().updateFrame(id, { name: 'Renamed' })
      const updated = findInTree(root(), id) as TextElement
      expect(updated.name).toBe('Renamed')
      expect(updated.content).toBe(origContent)
    })
  })

  describe('updateSpacing', () => {
    it('updates padding partially', () => {
      const id = addChild('box')
      store().updateSpacing(id, 'padding', { top: { mode: 'custom', value: 16 } })
      const frame = findInTree(root(), id)!
      expect(frame.padding.top.value).toBe(16)
      expect(frame.padding.right.value).toBe(0) // unchanged
    })

    it('updates margin', () => {
      const id = addChild('box')
      store().updateSpacing(id, 'margin', { left: { mode: 'custom', value: 8 } })
      expect(findInTree(root(), id)!.margin.left.value).toBe(8)
    })

    it('updates inset', () => {
      const id = addChild('box')
      store().updateSpacing(id, 'inset', { top: { mode: 'custom', value: 10 } })
      expect(findInTree(root(), id)!.inset.top.value).toBe(10)
    })
  })

  describe('updateSize', () => {
    it('updates width mode', () => {
      const id = addChild('box')
      store().updateSize(id, 'width', { mode: 'fixed', value: { mode: 'custom', value: 200 } })
      const frame = findInTree(root(), id)!
      expect(frame.width.mode).toBe('fixed')
      expect(frame.width.value.value).toBe(200)
    })

    it('updates height', () => {
      const id = addChild('box')
      store().updateSize(id, 'height', { mode: 'fill' })
      expect(findInTree(root(), id)!.height.mode).toBe('fill')
    })
  })

  describe('updateBorderRadius', () => {
    it('updates border radius partially', () => {
      const id = addChild('box')
      store().updateBorderRadius(id, { topLeft: { mode: 'custom', value: 8 } })
      const frame = findInTree(root(), id)!
      expect(frame.borderRadius.topLeft.value).toBe(8)
      expect(frame.borderRadius.topRight.value).toBe(0) // unchanged
    })
  })

  describe('renameFrame', () => {
    it('renames a frame', () => {
      const id = addChild('box')
      store().renameFrame(id, 'MyBox')
      expect(findInTree(root(), id)!.name).toBe('MyBox')
    })
  })

  // ===== Pages =====

  describe('addPage', () => {
    it('adds a page and switches to it', () => {
      store().addPage('About', '/about')
      expect(store().pages).toHaveLength(2)
      expect(store().pages[1].name).toBe('About')
      expect(store().pages[1].route).toBe('/about')
      expect(store().activePageId).toBe(store().pages[1].id)
    })

    it('auto-generates name and route', () => {
      store().addPage()
      expect(store().pages[1].name).toBe('Page 2')
      expect(store().pages[1].route).toBe('/page-2')
    })

    it('creates an empty root for the new page', () => {
      store().addPage('New')
      expect(root().children).toHaveLength(0)
      expect(isRootId(root().id)).toBe(true)
    })

    it('clears selection on page switch', () => {
      addChild('text')
      store().addPage()
      expect(store().selectedId).toBeNull()
    })
  })

  describe('removePage', () => {
    it('removes a page', () => {
      store().addPage('About')
      const aboutId = store().pages[1].id
      store().removePage(aboutId)
      expect(store().pages).toHaveLength(1)
    })

    it('does not remove last page', () => {
      const homeId = store().pages[0].id
      store().removePage(homeId)
      expect(store().pages).toHaveLength(1)
    })

    it('switches to first page when active page is removed', () => {
      store().addPage('About')
      const aboutId = store().activePageId
      store().removePage(aboutId)
      expect(store().activePageId).toBe(store().pages[0].id)
    })

    it('keeps current active page when non-active page removed', () => {
      const homeId = store().pages[0].id
      store().addPage('About')
      const aboutId = store().pages[1].id
      // Switch back to home
      store().setActivePage(homeId)
      store().removePage(aboutId)
      expect(store().activePageId).toBe(homeId)
    })

    it('cleans up undo stacks for removed page', () => {
      store().addPage('About')
      const aboutId = store().activePageId
      // Make some change to create history
      addChild('text')
      store().removePage(aboutId)
      // past/future for aboutId should be gone
      const state = store()
      expect(state.past[aboutId]).toBeUndefined()
      expect(state.future[aboutId]).toBeUndefined()
    })
  })

  describe('setActivePage', () => {
    it('switches active page and root', () => {
      addChild('text') // add to home
      store().addPage('About')
      const aboutId = store().activePageId
      addChild('image') // add to about
      store().setActivePage(store().pages[0].id)
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('text')
      store().setActivePage(aboutId)
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('image')
    })

    it('no-op when switching to current page', () => {
      const id = store().activePageId
      const before = store()
      store().setActivePage(id)
      // Should not have changed state
      expect(store().activePageId).toBe(before.activePageId)
    })

    it('no-op for non-existent page', () => {
      store().setActivePage('nonexistent')
      expect(store().pages).toHaveLength(1)
    })
  })

  describe('duplicatePage', () => {
    it('creates a copy of the page with new IDs', () => {
      addChild('text')
      addChild('box')
      const homeId = store().pages[0].id
      store().duplicatePage(homeId)
      expect(store().pages).toHaveLength(2)
      expect(store().pages[1].name).toBe('Page 1 (Copy)')
      expect(store().pages[1].route).toBe('/page-1-copy')
    })

    it('duplicated page has same number of children with new IDs', () => {
      const textId = addChild('text')
      store().duplicatePage(store().pages[0].id)
      // Now on the duplicate page
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('text')
      expect(rootChildren()[0].id).not.toBe(textId)
    })

    it('inserts duplicate right after source', () => {
      store().addPage('About')
      store().addPage('Contact')
      // Duplicate About (index 1)
      store().duplicatePage(store().pages[1].id)
      expect(store().pages[2].name).toBe('About (Copy)')
    })
  })

  describe('reorderPages', () => {
    it('reorders pages', () => {
      store().addPage('About')
      store().addPage('Contact')
      store().reorderPages(2, 0)
      expect(store().pages[0].name).toBe('Contact')
      expect(store().pages[1].name).toBe('Page 1')
      expect(store().pages[2].name).toBe('About')
    })
  })

  describe('renamePage / setPageRoute', () => {
    it('renames a page', () => {
      store().renamePage(store().pages[0].id, 'Landing')
      expect(store().pages[0].name).toBe('Landing')
    })

    it('sets page route', () => {
      store().setPageRoute(store().pages[0].id, '/landing')
      expect(store().pages[0].route).toBe('/landing')
    })
  })

  // ===== Undo / Redo =====

  describe('undo / redo', () => {
    it('undo restores previous state after addChild', () => {
      addChild('text')
      expect(rootChildren()).toHaveLength(1)
      store().undo()
      expect(rootChildren()).toHaveLength(0)
    })

    it('redo re-applies undone change', () => {
      addChild('text')
      store().undo()
      store().redo()
      expect(rootChildren()).toHaveLength(1)
    })

    it('undo after remove restores the frame', () => {
      const id = addChild('text')
      store().removeFrame(id)
      expect(rootChildren()).toHaveLength(0)
      store().undo()
      expect(rootChildren()).toHaveLength(1)
    })

    it('multiple undos', () => {
      addChild('text')
      addChild('image')
      addChild('button')
      expect(rootChildren()).toHaveLength(3)
      store().undo()
      expect(rootChildren()).toHaveLength(2)
      store().undo()
      expect(rootChildren()).toHaveLength(1)
      store().undo()
      expect(rootChildren()).toHaveLength(0)
    })

    it('undo is no-op on empty stack', () => {
      const before = rootChildren().length
      store().undo()
      expect(rootChildren()).toHaveLength(before)
    })

    it('redo is no-op on empty stack', () => {
      addChild('text')
      const count = rootChildren().length
      store().redo()
      expect(rootChildren()).toHaveLength(count)
    })

    it('undo/redo is per-page (isolated)', () => {
      addChild('text') // Home
      store().addPage('About')
      addChild('image') // About
      store().undo() // Should undo About's image, not Home's text
      expect(rootChildren()).toHaveLength(0) // About empty
      store().setActivePage(store().pages[0].id)
      expect(rootChildren()).toHaveLength(1) // Home still has text
    })

    it('redo clears when new action is taken after undo', () => {
      addChild('text')
      addChild('image')
      store().undo() // undo image
      addChild('button') // new action clears redo
      store().redo() // should be no-op
      expect(rootChildren()).toHaveLength(2)
      expect(rootChildren()[1].type).toBe('button')
    })

    it('undo after rename restores old name', () => {
      const id = addChild('box')
      const oldName = findInTree(root(), id)!.name
      store().renameFrame(id, 'Renamed')
      store().undo()
      expect(findInTree(root(), id)!.name).toBe(oldName)
    })

    it('undo after move restores position', () => {
      const textId = addChild('text')
      const boxId = addChild('box')
      store().moveFrame(textId, boxId, 0)
      store().undo()
      expect(rootChildren()).toHaveLength(2)
      expect(rootChildren()[0].id).toBe(textId)
    })
  })

  // ===== Utilities =====

  describe('newFile', () => {
    it('resets to clean state', () => {
      addChild('text')
      addChild('image')
      store().newFile()
      expect(rootChildren()).toHaveLength(0)
      expect(store().selectedId).toBeNull()
      expect(store().dirty).toBe(false)
      expect(store().filePath).toBeNull()
    })

    it('clears undo history', () => {
      addChild('text')
      store().newFile()
      store().undo() // should be no-op
      expect(rootChildren()).toHaveLength(0)
    })
  })

  describe('loadFromStorage', () => {
    it('loads saved state from localStorage', () => {
      // Manually construct saved state (simulating what auto-save would write)
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [
          { id: 'frame-10', type: 'text', name: 'text-10', content: 'Hello' },
        ],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('text')
    })

    it('handles corrupted localStorage gracefully', () => {
      storage.set('caja-state', '{invalid json')
      store().loadFromStorage()
      // Should not crash — falls back to removing bad data
      expect(storage.has('caja-state')).toBe(false)
    })

    it('handles legacy single-root format', () => {
      const legacyRoot = { type: 'box', id: 'frame-1', name: 'Root', tag: 'div', display: 'flex', direction: 'column', justify: 'start', align: 'stretch', gap: 0, wrap: false, children: [] }
      storage.set('caja-state', JSON.stringify({ root: legacyRoot }))
      store().loadFromStorage()
      // Should wrap in internal root
      expect(isRootId(root().id)).toBe(true)
      expect(rootChildren()).toHaveLength(1)
    })
  })

  describe('expandToFrame', () => {
    it('uncollapses ancestors to reveal a frame', () => {
      const parentId = addChild('box')
      const childId = addChild('text', parentId)
      // Collapse the parent
      store().toggleCollapse(parentId)
      expect(store().collapsedIds.has(parentId)).toBe(true)
      store().expandToFrame(childId)
      expect(store().collapsedIds.has(parentId)).toBe(false)
    })

    it('no-op for root-level frames', () => {
      const id = addChild('text')
      store().expandToFrame(id)
      // Root is never collapsed
      expect(store().collapsedIds.size).toBe(0)
    })
  })

  describe('toggleCollapse', () => {
    it('toggles collapsed state', () => {
      const id = addChild('box')
      store().toggleCollapse(id)
      expect(store().collapsedIds.has(id)).toBe(true)
      store().toggleCollapse(id)
      expect(store().collapsedIds.has(id)).toBe(false)
    })
  })

  describe('toggleHidden', () => {
    it('toggles hidden state', () => {
      const id = addChild('box')
      expect(findInTree(root(), id)!.hidden).toBe(false)
      store().toggleHidden(id)
      expect(findInTree(root(), id)!.hidden).toBe(true)
      store().toggleHidden(id)
      expect(findInTree(root(), id)!.hidden).toBe(false)
    })

    it('is undoable', () => {
      const id = addChild('box')
      store().toggleHidden(id)
      store().undo()
      expect(findInTree(root(), id)!.hidden).toBe(false)
    })
  })

  // ===== normalizeFrame / migrateFrame robustness =====

  describe('normalizeFrame', () => {
    it('fills missing fields on a minimal box', () => {
      const raw = { id: 'test-1', type: 'box', name: 'Bare', children: [] } as any
      const result = normalizeFrame(raw) as BoxElement
      expect(result.display).toBe('block') // createBox defaults to 'block'
      expect(result.padding).toBeDefined()
      expect(result.padding.top.mode).toBe('custom')
      expect(result.gap).toBeDefined()
      expect(result.opacity).toBeDefined()
    })

    it('fills missing fields on a minimal text', () => {
      const raw = { id: 'test-2', type: 'text', name: 'Bare' } as any
      const result = normalizeFrame(raw) as TextElement
      expect(result.content).toBeDefined()
      expect(result.fontSize).toBeDefined()
      expect(result.padding).toBeDefined()
    })

    it('fills missing input fields (checked, inputName, etc.)', () => {
      const raw = { id: 'test-3', type: 'input', name: 'OldInput', inputType: 'text' } as any
      const result = normalizeFrame(raw) as InputElement
      expect(result.checked).toBe(false)
      expect(result.inputName).toBe('')
      expect(result.inputValue).toBe('')
      expect(result.min).toBe(0)
      expect(result.max).toBe(100)
      expect(result.step).toBe(1)
      expect(result.defaultValue).toBe(50)
    })

    it('preserves existing values', () => {
      const raw = { id: 'test-4', type: 'box', name: 'Custom', display: 'grid', children: [] } as any
      const result = normalizeFrame(raw) as BoxElement
      expect(result.display).toBe('grid')
      expect(result.name).toBe('Custom')
    })

    it('recursively normalizes children', () => {
      const raw = {
        id: 'test-5', type: 'box', name: 'Parent',
        children: [{ id: 'test-6', type: 'text', name: 'Child' }],
      } as any
      const result = normalizeFrame(raw) as BoxElement
      expect(result.children).toHaveLength(1)
      expect(result.children[0].padding).toBeDefined()
    })
  })

  describe('migrateFrame via loadFromStorage', () => {
    it('migrates old input without new fields (checked, inputName, etc.)', () => {
      const oldInput = {
        id: 'frame-1', type: 'input', name: 'Input',
        placeholder: 'Email', inputType: 'email', disabled: false,
        // Missing: checked, inputName, inputValue, min, max, step, defaultValue
      }
      const page = {
        id: 'page-1', name: 'Home', route: '/',
        root: { id: '__root__page-1', type: 'box', name: 'Root', tag: 'body', display: 'flex', direction: 'column', justify: 'start', align: 'stretch', gap: 0, wrap: false, children: [oldInput] },
      }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      const input = rootChildren()[0] as InputElement
      expect(input.checked).toBe(false)
      expect(input.inputName).toBe('')
      expect(input.min).toBe(0)
      expect(input.max).toBe(100)
    })

    it('migrates data with entirely missing fields gracefully', () => {
      const minimalBox = {
        id: 'frame-1', type: 'box', name: 'Minimal',
        children: [{ id: 'frame-2', type: 'text', name: 'T' }],
      }
      const page = {
        id: 'page-1', name: 'Home', route: '/',
        root: { id: '__root__page-1', type: 'box', name: 'Root', tag: 'body', display: 'flex', direction: 'column', justify: 'start', align: 'stretch', gap: 0, wrap: false, children: [minimalBox] },
      }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      const box = rootChildren()[0] as BoxElement
      // Should have all fields from normalizeFrame pass
      expect(box.padding).toBeDefined()
      expect(box.display).toBe('flex') // migrateFrame defaults display to 'flex'
      expect(box.children[0].padding).toBeDefined()
    })
  })

  // ===== Getter helpers =====

  describe('getSelected', () => {
    it('returns the selected frame', () => {
      const id = addChild('text')
      store().select(id)
      expect(store().getSelected()?.id).toBe(id)
    })

    it('returns null when nothing selected', () => {
      store().select(null)
      expect(store().getSelected()).toBeNull()
    })
  })

  describe('getParentDirection / getParentDisplay', () => {
    it('returns parent direction', () => {
      const boxId = addChild('box')
      store().updateFrame(boxId, { direction: 'row' } as Partial<BoxElement>)
      const childId = addChild('text', boxId)
      expect(store().getParentDirection(childId)).toBe('row')
    })

    it('returns parent display', () => {
      const boxId = addChild('box')
      store().updateFrame(boxId, { display: 'grid' } as Partial<BoxElement>)
      const childId = addChild('text', boxId)
      expect(store().getParentDisplay(childId)).toBe('grid')
    })

    it('returns default for root children', () => {
      const id = addChild('text')
      // Root's default direction is column
      expect(store().getParentDirection(id)).toBe('column')
    })
  })

  // ===== dirty flag =====

  describe('dirty flag', () => {
    it('is set after tree mutation', () => {
      expect(store().dirty).toBe(false)
      addChild('text')
      expect(store().dirty).toBe(true)
    })

    it('markClean resets dirty', () => {
      addChild('text')
      store().markClean()
      expect(store().dirty).toBe(false)
    })

    it('addPage sets dirty', () => {
      store().addPage('About')
      expect(store().dirty).toBe(true)
    })
  })
})
