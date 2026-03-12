import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock localStorage before importing the store (it subscribes at module level)
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
})

import { useFrameStore, findInTree, isRootId, normalizeFrame, findTopLevelAncestor, resolveToDirectChild, getDrillContext, resolveToContextLevel, COMPONENT_PAGE_ID } from '../frameStore'
import { appendCopySuffix } from '../treeHelpers'
import { _resetLoadGuard } from '../slices/fileSlice'
import { useHoverStore } from '../hoverStore'
import { mergeResponsiveOverrides } from '../slices/uiSlice'
import { isLayoutDirty, isTypographyDirty, isFillDirty, isBorderDirty, isEffectsDirty, isPositionDirty, isTransformDirty, isTransitionDirty, layoutResetValues, typographyResetValues, fillResetValues, borderResetValues, effectsResetValues, positionResetValues, transformResetValues, transitionResetValues } from '../../components/Properties/sectionReset'
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
  _resetLoadGuard()
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
      expect(rootChildren()[0].name).toBe('Frame-1')
      expect(rootChildren()[1].name).toBe('Frame-2')
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

    it('selects root if removed frame was selected', () => {
      const id = addChild('box')
      store().select(id)
      store().removeFrame(id)
      expect(store().selectedId).toBe(root().id)
    })

    it('selects parent when removing nested child', () => {
      const parentId = addChild('box')
      addChild('text', parentId)
      const childId = (findInTree(root(), parentId) as BoxElement).children[0].id
      store().select(childId)
      store().removeFrame(childId)
      expect(store().selectedId).toBe(parentId)
      expect((findInTree(root(), parentId) as BoxElement).children).toHaveLength(0)
    })

    it('selects parent when removing deeply nested child', () => {
      const grandparentId = addChild('box')
      store().addChild(grandparentId, 'box')
      const parentId = (findInTree(root(), grandparentId) as BoxElement).children[0].id
      store().addChild(parentId, 'text')
      const childId = (findInTree(root(), parentId) as BoxElement).children[0].id
      store().select(childId)
      store().removeFrame(childId)
      // Should select direct parent, NOT grandparent
      expect(store().selectedId).toBe(parentId)
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

    it('select(null) falls back to root', () => {
      const id = addChild('text')
      store().select(id)
      store().select(null)
      expect(store().selectedId).toBe(root().id)
      expect(store().selectedIds).toEqual(new Set([root().id]))
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
      expect(store().selectedId).toBe(root().id)
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

    it('paste inside selected box container', () => {
      const textId = addChild('text')
      const boxId = addChild('box')
      // Copy the text frame
      store().select(textId)
      store().copySelected()
      // Select the box container and paste
      store().select(boxId)
      store().pasteClipboard()
      // Should paste inside the box, not as sibling
      expect(rootChildren()).toHaveLength(2) // text + box (no new sibling)
      const box = rootChildren()[1] as any
      expect(box.children).toHaveLength(1) // pasted inside
      expect(box.children[0].type).toBe('text')
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
      // Should have all default fields filled (createBox defaults to 'flex')
      const inserted = rootChildren()[0] as BoxElement
      expect(inserted.display).toBe('flex')
      expect(inserted.padding).toBeDefined()
    })

    it('insertFrame assigns new IDs', () => {
      const raw: Partial<BoxElement> = { id: 'old-id', type: 'box', name: 'Test', children: [] } as any
      store().insertFrame(root().id, raw as Frame)
      expect(rootChildren()[0].id).not.toBe('old-id')
    })

    it('insertFrame stores origin metadata', () => {
      const raw: Partial<BoxElement> = { type: 'box', name: 'Test', children: [] } as any
      store().insertFrame(root().id, raw as Frame, { componentId: 'p1' })
      expect(rootChildren()[0]._origin).toEqual({ componentId: 'p1' })
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

    it('selects new root on page switch', () => {
      addChild('text')
      store().addPage()
      expect(store().selectedId).toBe(root().id)
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

    it('setPageRoute syncs hrefs in links across all pages', () => {
      const pageId = store().pages[0].id
      const oldRoute = store().pages[0].route
      // Add a link pointing to this page's route
      const linkId = addChild('link')
      store().updateFrame(linkId, { href: oldRoute } as any)
      expect((rootChildren()[0] as any).href).toBe(oldRoute)
      // Add a second page with a link pointing to page 1
      store().addPage('Other')
      const otherLinkId = addChild('link')
      store().updateFrame(otherLinkId, { href: oldRoute } as any)
      // Change page 1's route
      store().setPageRoute(pageId, '/new-route')
      // Both links should be updated
      const page1 = store().pages.find(p => p.id === pageId)!
      const page2 = store().pages.find(p => p.id !== pageId && !p.isComponentPage)!
      const link1 = page1.root.children.find((c: any) => c.id === linkId) as any
      const link2 = page2.root.children.find((c: any) => c.id === otherLinkId) as any
      expect(link1.href).toBe('/new-route')
      expect(link2.href).toBe('/new-route')
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

    it('undo restores active breakpoint context', () => {
      const id = addChild('box')
      // Make a change while in SM breakpoint
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: true })
      // Switch to LG
      store().setActiveBreakpoint('base')
      expect(store().activeBreakpoint).toBe('base')
      // Undo should restore to SM where the change was made
      store().undo()
      expect(store().activeBreakpoint).toBe('md')
    })

    it('redo restores active breakpoint context', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')
      // Undo restores to xl
      store().undo()
      expect(store().activeBreakpoint).toBe('xl')
      // Redo restores to base (where we were when we undid)
      store().redo()
      expect(store().activeBreakpoint).toBe('base')
    })
  })

  // ===== Utilities =====

  describe('newFile', () => {
    it('resets to clean state', () => {
      addChild('text')
      addChild('image')
      store().newFile()
      expect(rootChildren()).toHaveLength(0)
      expect(store().selectedId).toBe(store().root.id)
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
    it('returns true when data is found in localStorage', () => {
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [
          { id: 'frame-10', type: 'text', name: 'text-10', content: 'Hello' },
        ],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      const result = store().loadFromStorage()
      expect(result).toBe(true)
      expect(rootChildren()).toHaveLength(1)
      expect(rootChildren()[0].type).toBe('text')
    })

    it('returns false when no data in localStorage', () => {
      const result = store().loadFromStorage()
      expect(result).toBe(false)
    })

    it('handles corrupted localStorage gracefully', () => {
      storage.set('caja-state', '{invalid json')
      store().loadFromStorage()
      // Should not crash — falls back to removing bad data
      expect(storage.has('caja-state')).toBe(false)
    })

    it('restores filePath from localStorage', () => {
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1', filePath: '/Users/test/xarchivo.caja' }))
      store().loadFromStorage()
      expect(store().filePath).toBe('/Users/test/xarchivo.caja')
    })

    it('filePath defaults to null when not in localStorage', () => {
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      expect(store().filePath).toBeNull()
    })

    it('marks dirty when restoring with filePath (crash recovery)', () => {
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1', filePath: '/test.caja' }))
      store().loadFromStorage()
      expect(store().dirty).toBe(true)
    })

    it('stays clean when restoring without filePath (scratchpad)', () => {
      const savedRoot = {
        id: '__root__page-1', type: 'box', name: 'Root', tag: 'body',
        display: 'flex', direction: 'column', justify: 'start', align: 'stretch',
        gap: 0, wrap: false, children: [],
      }
      const page = { id: 'page-1', name: 'Home', route: '/', root: savedRoot }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      expect(store().dirty).toBe(false)
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

  describe('loadSampleProject', () => {
    it('loads the sample project with pages', () => {
      store().loadSampleProject()
      const s = store()
      expect(s.pages.length).toBeGreaterThanOrEqual(1)
      expect(s.pages[0].name).toBeTruthy()
      expect(s.pages[0].route).toBeTruthy()
      expect(isRootId(s.root.id)).toBe(true)
      // Sample project has children
      expect(s.root.children.length).toBeGreaterThan(0)
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

  // ===== responsive override deduplication =====

  describe('responsive override deduplication', () => {
    it('keeps xl override that differs from base', () => {
      const id = addChild('box')
      // Set hidden at xl
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      expect(findInTree(root(), id)!.responsive?.xl?.hidden).toBe(true)
      store().setActiveBreakpoint('base')
    })

    it('strips xl override when it matches base', () => {
      const id = addChild('box')
      // Set hidden: false at xl (matches base default of false)
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: false })
      // Should be stripped — matches base
      expect(findInTree(root(), id)!.responsive?.xl?.hidden).toBeUndefined()
      store().setActiveBreakpoint('base')
    })

    it('strips md override that matches base', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: false })
      // Should be stripped — matches base
      expect(findInTree(root(), id)!.responsive?.md?.hidden).toBeUndefined()
      store().setActiveBreakpoint('base')
    })
  })

  // ===== normalizeFrame / migrateFrame robustness =====

  describe('normalizeFrame', () => {
    it('fills missing fields on a minimal box', () => {
      const raw = { id: 'test-1', type: 'box', name: 'Bare', children: [] } as any
      const result = normalizeFrame(raw) as BoxElement
      expect(result.display).toBe('flex') // createBox defaults to 'flex'
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

    it('re-parses tailwindClasses during migration (extracts stuck foreign classes)', () => {
      const box = {
        id: 'frame-1', type: 'box', name: 'Card',
        tailwindClasses: 'max-w-screen-lg mx-auto mt-10',
        children: [],
      }
      const page = {
        id: 'page-1', name: 'Home', route: '/',
        root: { id: '__root__page-1', type: 'box', name: 'Root', tag: 'body', display: 'flex', direction: 'column', justify: 'start', align: 'stretch', gap: 0, wrap: false, children: [box] },
      }
      storage.set('caja-state', JSON.stringify({ pages: [page], activePageId: 'page-1' }))
      store().loadFromStorage()
      const card = rootChildren()[0] as BoxElement
      // max-w-screen-lg → maxWidth token
      expect(card.maxWidth).toEqual({ mode: 'token', token: 'screen-lg', value: 1024 })
      // mx-auto → margin left/right auto
      expect(card.margin.left).toEqual({ mode: 'token', token: 'auto', value: 0 })
      expect(card.margin.right).toEqual({ mode: 'token', token: 'auto', value: 0 })
      // mt-10 → margin top token 10 (value 40)
      expect(card.margin.top).toEqual({ mode: 'token', token: '10', value: 40 })
      // tailwindClasses should be empty (all classes recognized)
      expect(card.tailwindClasses).toBe('')
    })
  })

  // ===== Getter helpers =====

  describe('getSelected', () => {
    it('returns the selected frame', () => {
      const id = addChild('text')
      store().select(id)
      expect(store().getSelected()?.id).toBe(id)
    })

    it('returns root when nothing explicitly selected', () => {
      store().select(null)
      expect(store().getSelected()?.id).toBe(root().id)
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

  // ===== Component System =====

  describe('component system', () => {
    describe('ensureComponentPage', () => {
      it('creates a hidden components page on first call', () => {
        const page = store().ensureComponentPage()
        expect(page.id).toBe(COMPONENT_PAGE_ID)
        expect(page.isComponentPage).toBe(true)
        expect(page.name).toBe('Components')
      })

      it('returns the same page on subsequent calls', () => {
        const first = store().ensureComponentPage()
        const second = store().ensureComponentPage()
        expect(first.id).toBe(second.id)
      })
    })

    describe('getComponentPage', () => {
      it('returns undefined before any component is created', () => {
        expect(store().getComponentPage()).toBeUndefined()
      })

      it('returns the component page after ensureComponentPage', () => {
        store().ensureComponentPage()
        expect(store().getComponentPage()).toBeDefined()
        expect(store().getComponentPage()!.isComponentPage).toBe(true)
      })
    })

    describe('createComponent', () => {
      it('creates a master in the components page and replaces original with instance', () => {
        const boxId = addChild('box')
        addChild('text', boxId) // add a child to the box

        const componentId = store().createComponent(boxId)
        expect(componentId).toBeTruthy()

        // The original frame should now be an instance
        const instance = findInTree(store().root, boxId)
        expect(instance).toBeDefined()
        expect(instance!._componentId).toBe(componentId)
        expect(instance!._overrides).toEqual({})

        // Master should exist in components page
        const compPage = store().getComponentPage()
        expect(compPage).toBeDefined()
        const master = findInTree(compPage!.root, componentId!)
        expect(master).toBeDefined()
        expect(master!.type).toBe('box')
      })

      it('returns null for root frame', () => {
        expect(store().createComponent(store().root.id)).toBeNull()
      })

      it('returns null for non-existent frame', () => {
        expect(store().createComponent('nonexistent')).toBeNull()
      })

      it('can undo createComponent', () => {
        const boxId = addChild('box')
        store().createComponent(boxId)

        // After create, frame is an instance
        expect(findInTree(store().root, boxId)!._componentId).toBeTruthy()

        store().undo()

        // After undo, frame should not be an instance
        const restored = findInTree(store().root, boxId)
        expect(restored).toBeDefined()
        expect(restored!._componentId).toBeUndefined()
      })
    })

    describe('insertInstance', () => {
      it('inserts an instance of a component', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        const instanceId = store().insertInstance(componentId, store().root.id)
        expect(instanceId).toBeTruthy()

        const instance = findInTree(store().root, instanceId!)
        expect(instance).toBeDefined()
        expect(instance!._componentId).toBe(componentId)
        expect(instance!._overrides).toEqual({})
      })

      it('inserts at specific index', () => {
        addChild('text') // index 0
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        store().insertInstance(componentId, store().root.id, 0)
        // The instance should be at index 0
        const children = store().root.children
        expect(children[0]._componentId).toBe(componentId)
      })

      it('returns null when component page does not exist', () => {
        // No component page → should return null
        expect(store().insertInstance('fake-id', store().root.id)).toBeNull()
      })

      it('returns null for non-existent component', () => {
        store().ensureComponentPage()
        expect(store().insertInstance('nonexistent', store().root.id)).toBeNull()
      })

      it('returns null for non-box parent', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!
        const textId = addChild('text')
        expect(store().insertInstance(componentId, textId)).toBeNull()
      })
    })

    describe('instance name preservation', () => {
      it('insertInstance preserves master name', () => {
        const boxId = addChild('box')
        store().renameFrame(boxId, 'Button-Black')
        const componentId = store().createComponent(boxId)!

        // Verify master has the correct name
        const compPage = store().getComponentPage()!
        const master = findInTree(compPage.root, componentId)!
        expect(master.name).toBe('Button-Black')

        // Insert an instance
        const instanceId = store().insertInstance(componentId, store().root.id)!
        const instance = findInTree(store().root, instanceId)!
        expect(instance.name).toBe('Button-Black')
      })
    })

    describe('detachInstance', () => {
      it('removes _componentId and _overrides from an instance', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        // Verify it's an instance
        expect(findInTree(store().root, boxId)!._componentId).toBe(componentId)

        store().detachInstance(boxId)

        const detached = findInTree(store().root, boxId)
        expect(detached).toBeDefined()
        expect(detached!._componentId).toBeUndefined()
        expect(detached!._overrides).toBeUndefined()
      })

      it('is a no-op for non-instance frames', () => {
        const boxId = addChild('box')
        const rootBefore = store().root

        store().detachInstance(boxId)

        // Root reference should be the same (no change)
        expect(store().root).toBe(rootBefore)
      })

      it('can undo detachInstance', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        store().detachInstance(boxId)
        expect(findInTree(store().root, boxId)!._componentId).toBeUndefined()

        store().undo()
        expect(findInTree(store().root, boxId)!._componentId).toBe(componentId)
      })
    })

    describe('resetInstance', () => {
      it('clears _overrides on an instance', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        // Manually add overrides via updateFrame
        store().updateFrame(boxId, {
          _overrides: { 'some-child': { content: 'override' } },
        } as any)

        expect(findInTree(store().root, boxId)!._overrides).toHaveProperty('some-child')

        store().resetInstance(boxId)

        expect(findInTree(store().root, boxId)!._overrides).toEqual({})
        expect(findInTree(store().root, boxId)!._componentId).toBe(componentId)
      })

      it('is a no-op for non-instance frames', () => {
        const boxId = addChild('box')
        const rootBefore = store().root

        store().resetInstance(boxId)

        expect(store().root).toBe(rootBefore)
      })
    })

    describe('propagateComponent', () => {
      it('updates all instances when master changes', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        // Insert a second instance
        const instance2Id = store().insertInstance(componentId, store().root.id)!

        // Both instances should exist
        expect(findInTree(store().root, boxId)!._componentId).toBe(componentId)
        expect(findInTree(store().root, instance2Id)!._componentId).toBe(componentId)

        // Propagate (even without master change, should not crash)
        store().propagateComponent(componentId)

        // Instances should still exist and be linked
        expect(findInTree(store().root, boxId)!._componentId).toBe(componentId)
        expect(findInTree(store().root, instance2Id)!._componentId).toBe(componentId)
      })

      it('is a no-op when component page does not exist', () => {
        // Should not throw
        store().propagateComponent('nonexistent')
      })

      it('is a no-op when no instances exist', () => {
        const boxId = addChild('box')
        const componentId = store().createComponent(boxId)!

        // Detach the only instance
        store().detachInstance(boxId)

        // Should not throw
        store().propagateComponent(componentId)
      })
    })

    describe('removePage protects components page', () => {
      it('cannot remove the components page', () => {
        store().ensureComponentPage()
        const pagesBefore = store().pages.length

        store().removePage(COMPONENT_PAGE_ID)
        expect(store().pages.length).toBe(pagesBefore)
      })
    })

    describe('addPage excludes component page from numbering', () => {
      it('names new pages based on regular page count only', () => {
        store().ensureComponentPage()
        store().addPage()
        const newPage = store().pages.find((p) => p.name === 'Page 2')
        expect(newPage).toBeDefined()
      })
    })
  })
})

describe('findTopLevelAncestor', () => {
  beforeEach(() => {
    resetStore()
  })

  it('returns direct child of root when given that child', () => {
    const childId = addChild('box')
    expect(findTopLevelAncestor(store().root, childId)).toBe(childId)
  })

  it('returns top-level ancestor for deeply nested frame', () => {
    const topId = addChild('box')
    const midId = addChild('box', topId)
    const deepId = addChild('box', midId)

    expect(findTopLevelAncestor(store().root, deepId)).toBe(topId)
    expect(findTopLevelAncestor(store().root, midId)).toBe(topId)
  })

  it('returns null for root id', () => {
    expect(findTopLevelAncestor(store().root, store().root.id)).toBeNull()
  })

  it('returns null for non-existent id', () => {
    expect(findTopLevelAncestor(store().root, 'nonexistent')).toBeNull()
  })
})

describe('resolveToDirectChild', () => {
  beforeEach(() => {
    resetStore()
  })

  it('returns direct child when given that child', () => {
    const parentId = addChild('box')
    const childId = addChild('box', parentId)
    expect(resolveToDirectChild(store().root, parentId, childId)).toBe(childId)
  })

  it('returns direct child for deeply nested descendant', () => {
    const parentId = addChild('box')
    const midId = addChild('box', parentId)
    const deepId = addChild('box', midId)
    expect(resolveToDirectChild(store().root, parentId, deepId)).toBe(midId)
  })

  it('returns null when descendant is not inside ancestor', () => {
    const a = addChild('box')
    const b = addChild('box')
    expect(resolveToDirectChild(store().root, a, b)).toBeNull()
  })

  it('returns null when ancestor equals descendant', () => {
    const id = addChild('box')
    expect(resolveToDirectChild(store().root, id, id)).toBeNull()
  })

  it('returns null for non-box ancestor', () => {
    const textId = addChild('text')
    expect(resolveToDirectChild(store().root, textId, 'any')).toBeNull()
  })

  it('works with root as ancestor', () => {
    const topId = addChild('box')
    const childId = addChild('box', topId)
    expect(resolveToDirectChild(store().root, store().root.id, childId)).toBe(topId)
  })

  it('resolves deep descendant through multiple levels', () => {
    const a = addChild('box')
    const b = addChild('box', a)
    const c = addChild('box', b)
    const d = addChild('box', c)
    expect(resolveToDirectChild(store().root, store().root.id, d)).toBe(a)
  })

  it('resolves to correct child when multiple children exist', () => {
    const a = addChild('box')
    const a1 = addChild('box', a)
    const b = addChild('box')
    const b1 = addChild('box', b)
    const b2 = addChild('box', b1)
    expect(resolveToDirectChild(store().root, store().root.id, b2)).toBe(b)
    expect(resolveToDirectChild(store().root, store().root.id, a1)).toBe(a)
  })
})

describe('drill-down click resolution', () => {
  beforeEach(() => {
    resetStore()
  })

  it('context is root when nothing selected — resolves to top-level', () => {
    const top = addChild('box')
    const mid = addChild('box', top)
    const deep = addChild('box', mid)
    // When nothing is selected, context = root. resolveToDirectChild from root returns the top-level child.
    const resolved = resolveToDirectChild(store().root, store().root.id, deep)
    expect(resolved).toBe(top)
  })

  it('context is parent of selected — resolves to sibling', () => {
    const parent = addChild('box')
    const childA = addChild('box', parent)
    const childB = addChild('box', parent)
    const deepB = addChild('box', childB)
    // If childA is selected, context = parent. Clicking deep inside childB resolves to childB (sibling).
    const resolved = resolveToDirectChild(store().root, parent, deepB)
    expect(resolved).toBe(childB)
    // And resolving childA itself from parent returns childA directly
    expect(resolveToDirectChild(store().root, parent, childA)).toBe(childA)
  })

  it('clicking outside context falls back to top-level', () => {
    const branchA = addChild('box')
    addChild('box', branchA)
    const branchB = addChild('box')
    const b1 = addChild('box', branchB)
    // Context is branchA (user drilled into it). Clicking b1 which is inside branchB — not a descendant of branchA.
    const resolved = resolveToDirectChild(store().root, branchA, b1)
    expect(resolved).toBeNull()
    // Fallback: findTopLevelAncestor returns the top-level branch
    const fallback = findTopLevelAncestor(store().root, b1)
    expect(fallback).toBe(branchB)
  })
})

// ── Shared drill-down helpers (getDrillContext + resolveToContextLevel) ──

describe('getDrillContext', () => {
  beforeEach(() => { resetStore() })

  it('returns root when nothing is selected', () => {
    expect(getDrillContext(store().root, null)).toBe(store().root.id)
  })

  it('returns root when root is selected', () => {
    expect(getDrillContext(store().root, store().root.id)).toBe(store().root.id)
  })

  it('returns parent of selected non-root frame', () => {
    const parent = addChild('box')
    const child = addChild('box', parent)
    expect(getDrillContext(store().root, child)).toBe(parent)
  })

  it('returns root when a top-level child is selected', () => {
    const topLevel = addChild('box')
    expect(getDrillContext(store().root, topLevel)).toBe(store().root.id)
  })
})

describe('resolveToContextLevel', () => {
  beforeEach(() => { resetStore() })

  it('returns null when target is the context (hovering background)', () => {
    const ctx = addChild('box')
    expect(resolveToContextLevel(store().root, ctx, ctx)).toBeNull()
  })

  it('resolves direct child of context', () => {
    const ctx = addChild('box')
    const child = addChild('box', ctx)
    expect(resolveToContextLevel(store().root, ctx, child)).toBe(child)
  })

  it('resolves deeply nested to direct child of context', () => {
    const ctx = addChild('box')
    const mid = addChild('box', ctx)
    const deep = addChild('box', mid)
    expect(resolveToContextLevel(store().root, ctx, deep)).toBe(mid)
  })

  it('falls back to top-level ancestor when target is outside context', () => {
    const branchA = addChild('box')
    const branchB = addChild('box')
    const b1 = addChild('box', branchB)
    expect(resolveToContextLevel(store().root, branchA, b1)).toBe(branchB)
  })

  it('returns the target itself if not found anywhere (safety fallback)', () => {
    const ctx = addChild('box')
    expect(resolveToContextLevel(store().root, ctx, 'nonexistent')).toBe('nonexistent')
  })
})

// ── Hover source tracking ──

describe('hover with isTreeHover (hoverStore)', () => {
  const hoverState = () => useHoverStore.getState()

  // hover() is rAF-throttled — flush pending callbacks between calls
  const flushRAF = () => { vi.advanceTimersByTime(16) }

  beforeEach(() => {
    vi.useFakeTimers()
    // rAF polyfill for Node — maps to setTimeout so fake timers can flush it
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(cb, 0)) as typeof requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame
    useHoverStore.setState(useHoverStore.getInitialState())
  })
  afterEach(() => { vi.useRealTimers() })

  it('hover without source sets isTreeHover to false', () => {
    hoverState().hover('some-id')
    flushRAF()
    expect(hoverState().hoveredId).toBe('some-id')
    expect(hoverState().isTreeHover).toBe(false)
  })

  it('hover with tree source sets isTreeHover to true', () => {
    hoverState().hover('some-id', 'tree')
    flushRAF()
    expect(hoverState().hoveredId).toBe('some-id')
    expect(hoverState().isTreeHover).toBe(true)
  })

  it('canvas hover after tree hover resets isTreeHover', () => {
    hoverState().hover('tree-id', 'tree')
    flushRAF()
    expect(hoverState().isTreeHover).toBe(true)
    hoverState().hover('canvas-id')
    flushRAF()
    expect(hoverState().isTreeHover).toBe(false)
    expect(hoverState().hoveredId).toBe('canvas-id')
  })

  it('clearing hover with tree source preserves isTreeHover', () => {
    hoverState().hover(null, 'tree')
    flushRAF()
    expect(hoverState().hoveredId).toBeNull()
    expect(hoverState().isTreeHover).toBe(true)
  })

  it('rapid hovers are coalesced to last value', () => {
    hoverState().hover('a', 'tree')
    hoverState().hover('b', 'tree')
    hoverState().hover('c')
    flushRAF()
    // Only the last hover should have been applied
    expect(hoverState().hoveredId).toBe('c')
    expect(hoverState().isTreeHover).toBe(false)
  })
})

// ── Margin overlay store state ──

describe('showMarginOverlay', () => {
  beforeEach(() => { storage.clear(); useFrameStore.setState(useFrameStore.getInitialState()) })

  it('defaults to false', () => {
    expect(store().showMarginOverlay).toBe(false)
  })

  it('setShowMarginOverlay toggles the value', () => {
    store().setShowMarginOverlay(true)
    expect(store().showMarginOverlay).toBe(true)
    store().setShowMarginOverlay(false)
    expect(store().showMarginOverlay).toBe(false)
  })

  // ===== Auto-save subscriber =====

  describe('auto-save subscriber', () => {
    it('persists state to localStorage after debounce', async () => {
      storage.clear()
      // Trigger a state change that the auto-save subscriber listens to
      addChild('box')
      // Auto-save debounces at 500ms
      await vi.waitFor(() => {
        expect(storage.get('caja-state')).toBeDefined()
      }, { timeout: 1000 })
      const saved = JSON.parse(storage.get('caja-state')!)
      expect(saved.pages).toBeDefined()
      expect(saved.activePageId).toBeDefined()
    })

    it('overwrites previous save on rapid edits (debounce)', async () => {
      storage.clear()
      addChild('box')
      addChild('text')
      addChild('box')
      // Only one save should happen after the final edit settles
      await vi.waitFor(() => {
        expect(storage.get('caja-state')).toBeDefined()
      }, { timeout: 1000 })
      const saved = JSON.parse(storage.get('caja-state')!)
      // All 3 children should be present (latest state)
      const page = saved.pages.find((p: { id: string }) => p.id === saved.activePageId)
      expect(page.root.children.length).toBe(3)
    })
  })

  // ===== Load guard =====

  describe('load guard', () => {
    it('loadFromStorage succeeds once, fails on second call', () => {
      const pageData = { pages: store().pages, activePageId: store().activePageId }
      storage.set('caja-state', JSON.stringify(pageData))
      _resetLoadGuard()
      expect(store().loadFromStorage()).toBe(true)
      // Second call returns false — guard prevents double load
      expect(store().loadFromStorage()).toBe(false)
    })

    it('_resetLoadGuard allows loadFromStorage to succeed again', () => {
      const pageData = { pages: store().pages, activePageId: store().activePageId }
      storage.set('caja-state', JSON.stringify(pageData))
      _resetLoadGuard()
      expect(store().loadFromStorage()).toBe(true)
      _resetLoadGuard()
      expect(store().loadFromStorage()).toBe(true)
    })
  })

  // ===== clearAllResponsiveOverrides =====

  describe('clearAllResponsiveOverrides', () => {
    it('strips all xl overrides from every frame in the tree', () => {
      const boxId = addChild('box')
      const textId = addChild('text', boxId)

      // Add xl overrides to both
      store().setActiveBreakpoint('xl')
      store().updateFrame(boxId, { hidden: true })
      store().updateFrame(textId, { hidden: true })
      store().setActiveBreakpoint('base')

      expect(findInTree(root(), boxId)!.responsive?.xl?.hidden).toBe(true)
      expect(findInTree(root(), textId)!.responsive?.xl?.hidden).toBe(true)

      store().clearAllResponsiveOverrides('xl')

      expect(findInTree(root(), boxId)!.responsive?.xl).toBeUndefined()
      expect(findInTree(root(), textId)!.responsive?.xl).toBeUndefined()
    })

    it('preserves md overrides when clearing xl', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      store().clearAllResponsiveOverrides('xl')

      expect(findInTree(root(), id)!.responsive?.md?.hidden).toBe(true)
      expect(findInTree(root(), id)!.responsive?.xl).toBeUndefined()
    })

    it('is undoable', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      store().clearAllResponsiveOverrides('xl')
      expect(findInTree(root(), id)!.responsive?.xl).toBeUndefined()

      store().undo()
      expect(findInTree(root(), id)!.responsive?.xl?.hidden).toBe(true)
    })
  })

  // ===== mergeResponsiveOverrides =====

  describe('mergeResponsiveOverrides', () => {
    it('returns frame unchanged for base breakpoint', () => {
      const id = addChild('box')
      const frame = findInTree(root(), id)!
      // mergeResponsiveOverrides is only called with md|xl, but getEffectiveFrame handles base
      expect(store().getEffectiveFrame(frame)).toBe(frame)
    })

    it('applies xl overrides', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      const merged = mergeResponsiveOverrides(frame, 'xl')
      expect(merged.hidden).toBe(true)
      expect(frame.hidden).toBe(false) // original unchanged
    })

    it('xl does not inherit from md (cascade is one-way)', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      // xl should NOT inherit md overrides
      const merged = mergeResponsiveOverrides(frame, 'xl')
      expect(merged.hidden).toBe(false) // no cascade from md
    })

    it('md inherits xl overrides (desktop-first cascade)', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      // md (SM) should inherit xl (MD) overrides in desktop-first model
      const merged = mergeResponsiveOverrides(frame, 'md')
      expect(merged.hidden).toBe(true) // cascaded from xl
    })

    it('md own override wins over cascaded xl override', () => {
      const id = addChild('text')
      // Set xl to hide, md to show with different fontSize
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: true }) // md also hidden (own override, not just cascaded)
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      const mergedMd = mergeResponsiveOverrides(frame, 'md')
      expect(mergedMd.hidden).toBe(true) // md has its own override matching xl
    })

    it('md overrides apply independently', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('md')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: false })
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      const mergedMd = mergeResponsiveOverrides(frame, 'md')
      const mergedXl = mergeResponsiveOverrides(frame, 'xl')
      expect(mergedMd.hidden).toBe(true) // md has its own override
      expect(mergedXl.hidden).toBe(false) // xl has its own override (matches base, but stored)
    })
  })

  // ===== propertyHint =====

  describe('propertyHint', () => {
    it('defaults to null', () => {
      expect(store().propertyHint).toBeNull()
    })

    it('sets and clears property hint', () => {
      store().setPropertyHint('Width')
      expect(store().propertyHint).toBe('Width')
      store().setPropertyHint(null)
      expect(store().propertyHint).toBeNull()
    })
  })

  // ===== sectionReset dirty detection =====

  describe('sectionReset dirty detection', () => {
    it('layout is clean on fresh box', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      const frame = findInTree(root(), id)!
      expect(isLayoutDirty(frame)).toBe(false)
    })

    it('layout is dirty after changing padding', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      store().updateFrame(id, {
        padding: {
          top: { mode: 'custom', value: 16 },
          right: { mode: 'custom', value: 0 },
          bottom: { mode: 'custom', value: 0 },
          left: { mode: 'custom', value: 0 },
        },
      })
      const frame = findInTree(root(), id)!
      expect(isLayoutDirty(frame)).toBe(true)
    })

    it('layout reset restores to clean', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      store().updateFrame(id, {
        padding: {
          top: { mode: 'custom', value: 16 },
          right: { mode: 'custom', value: 0 },
          bottom: { mode: 'custom', value: 0 },
          left: { mode: 'custom', value: 0 },
        },
      })
      const frame = findInTree(root(), id)!
      store().updateFrame(id, layoutResetValues(frame))
      const reset = findInTree(root(), id)!
      expect(isLayoutDirty(reset)).toBe(false)
    })

    it('typography is clean on fresh text', () => {
      const id = addChild('text')
      const frame = findInTree(root(), id)!
      expect(isTypographyDirty(frame)).toBe(false)
    })

    it('typography is dirty after changing fontWeight', () => {
      const id = addChild('text')
      store().updateFrame(id, { fontWeight: { mode: 'custom', value: 700 } })
      const frame = findInTree(root(), id)!
      expect(isTypographyDirty(frame)).toBe(true)
    })

    it('typography reset restores to clean', () => {
      const id = addChild('text')
      store().updateFrame(id, { fontWeight: { mode: 'custom', value: 700 } })
      store().updateFrame(id, typographyResetValues())
      const frame = findInTree(root(), id)!
      expect(isTypographyDirty(frame)).toBe(false)
    })

    it('fill is clean on fresh frame', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isFillDirty(findInTree(root(), id)!)).toBe(false)
    })

    it('fill is dirty after setting bg color', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      store().updateFrame(id, { bg: { mode: 'custom', value: '#ff0000' } })
      expect(isFillDirty(findInTree(root(), id)!)).toBe(true)
    })

    it('border is clean on fresh frame', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isBorderDirty(findInTree(root(), id)!)).toBe(false)
    })

    it('effects is clean on fresh frame', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isEffectsDirty(findInTree(root(), id)!)).toBe(false)
    })

    it('position is clean on fresh frame (static)', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isPositionDirty(findInTree(root(), id)!)).toBe(false)
    })

    it('position is dirty when set to relative', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      store().updateFrame(id, { position: 'relative' })
      expect(isPositionDirty(findInTree(root(), id)!)).toBe(true)
    })

    it('transform is clean on fresh frame', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isTransformDirty(findInTree(root(), id)!)).toBe(false)
    })

    it('transition is clean on fresh frame', () => {
      store().setStyleNewFrames(false)
      const id = addChild('box')
      expect(isTransitionDirty(findInTree(root(), id)!)).toBe(false)
    })
  })

  // ===== viewport & breakpoint switching =====

  describe('viewport and breakpoint switching', () => {
    it('setCanvasWidth persists to view prefs', () => {
      store().setCanvasWidth(640)
      expect(store().canvasWidth).toBe(640)
    })

    it('setCanvasWidth(null) sets fluid mode', () => {
      store().setCanvasWidth(640)
      store().setCanvasWidth(null)
      expect(store().canvasWidth).toBeNull()
    })

    it('setActiveBreakpoint changes breakpoint', () => {
      store().setActiveBreakpoint('xl')
      expect(store().activeBreakpoint).toBe('xl')
      store().setActiveBreakpoint('base')
      expect(store().activeBreakpoint).toBe('base')
    })

    it('getEffectiveFrame returns merged frame at xl', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })

      // getEffectiveFrame should merge xl overrides
      const frame = findInTree(root(), id)!
      const effective = store().getEffectiveFrame(frame)
      expect(effective.hidden).toBe(true)
      store().setActiveBreakpoint('base')
    })

    it('getEffectiveFrame returns original frame at base', () => {
      const id = addChild('box')
      store().setActiveBreakpoint('xl')
      store().updateFrame(id, { hidden: true })
      store().setActiveBreakpoint('base')

      const frame = findInTree(root(), id)!
      const effective = store().getEffectiveFrame(frame)
      expect(effective.hidden).toBe(false) // base value
    })
  })

  // ===== Copy suffix =====

  describe('appendCopySuffix', () => {
    it('adds (Copy) to a plain name', () => {
      expect(appendCopySuffix('Frame')).toBe('Frame (Copy)')
    })

    it('increments (Copy) to (Copy 2)', () => {
      expect(appendCopySuffix('Frame (Copy)')).toBe('Frame (Copy 2)')
    })

    it('increments (Copy 2) to (Copy 3)', () => {
      expect(appendCopySuffix('Frame (Copy 2)')).toBe('Frame (Copy 3)')
    })

    it('handles names with spaces before (Copy)', () => {
      expect(appendCopySuffix('My Frame (Copy)')).toBe('My Frame (Copy 2)')
    })
  })

  describe('duplicateFrame adds (Copy) suffix', () => {
    it('duplicate gets (Copy) name', () => {
      const id = addChild('text')
      store().renameFrame(id, 'Header')
      store().duplicateFrame(id)
      expect(rootChildren()[1].name).toBe('Header (Copy)')
    })

    it('duplicating a copy increments suffix', () => {
      const id = addChild('text')
      store().renameFrame(id, 'Header')
      store().duplicateFrame(id)
      const copyId = rootChildren()[1].id
      store().duplicateFrame(copyId)
      expect(rootChildren()[2].name).toBe('Header (Copy 2)')
    })
  })

  describe('pasteClipboard adds (Copy) suffix', () => {
    it('pasted frame gets (Copy) name', () => {
      const id = addChild('text')
      store().renameFrame(id, 'Card')
      store().select(id)
      store().copySelected()
      store().pasteClipboard()
      expect(rootChildren()[1].name).toBe('Card (Copy)')
    })

    it('pasting multiple frames adds (Copy) to each', () => {
      const id1 = addChild('text')
      const id2 = addChild('image')
      store().renameFrame(id1, 'Title')
      store().renameFrame(id2, 'Photo')
      store().select(id1)
      store().selectMulti(id2)
      store().copySelected()
      store().pasteClipboard()
      expect(rootChildren()[2].name).toBe('Title (Copy)')
      expect(rootChildren()[3].name).toBe('Photo (Copy)')
    })
  })
})
