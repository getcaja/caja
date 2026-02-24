import { useState, useRef } from 'react'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { useSnippetStore } from '../../store/snippetStore'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { TreeNode } from './TreeNode'
import { SnippetsPanel, type SnippetsPanelHandle } from './SnippetsPanel'
import { PageNode } from './PageNode'
import { useContextMenu } from './hooks/useContextMenu'
import { Plus, FolderPlus, Code } from 'lucide-react'

export function TreePanel() {
  const root = useFrameStore((s) => s.root)
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const selectedId = useFrameStore((s) => s.selectedId)
  const addChild = useFrameStore((s) => s.addChild)
  const addPage = useFrameStore((s) => s.addPage)
  const tab = useFrameStore((s) => s.treePanelTab)
  const setTab = useFrameStore((s) => s.setTreePanelTab)
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // Snippets "+" menu
  const snippetMenu = useContextMenu()
  const snippetBtnRef = useRef<HTMLButtonElement>(null)
  const snippetPanelRef = useRef<SnippetsPanelHandle>(null)

  const activePage = pages.find((p) => p.id === activePageId)

  function getTargetParentId(): string {
    if (!selectedId) return root.id
    function find(frame: import('../../types/frame').Frame): import('../../types/frame').Frame | null {
      if (frame.id === selectedId) return frame
      if (frame.type === 'box') {
        for (const child of frame.children) {
          const f = find(child)
          if (f) return f
        }
      }
      return null
    }
    const selected = find(root)
    if (selected?.type === 'box') return selected.id
    return root.id
  }

  const openAddMenu = () => {
    if (addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setShowAdd(true)
  }

  const handleAdd = (type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link') => {
    addChild(getTargetParentId(), type)
    setShowAdd(false)
  }

  const openSnippetMenu = () => {
    if (snippetBtnRef.current) {
      const rect = snippetBtnRef.current.getBoundingClientRect()
      snippetMenu.openAt(rect.left, rect.bottom + 4)
    }
  }

  const handleSaveSelectedAsSnippet = () => {
    if (!selectedId) return
    const frame = findInTree(root, selectedId)
    if (!frame) return
    useSnippetStore.getState().saveSnippet(frame.name || 'Snippet', [], frame)
    setTab('snippets')
    snippetMenu.close()
  }

  const handleCreateCategory = () => {
    snippetPanelRef.current?.createCategory()
    snippetMenu.close()
  }

  return (
    <TreeDndProvider>
      <div className="h-full bg-surface-1 flex flex-col">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'elements' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setTab('elements')}
            >
              Elements
            </button>
            <button
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'snippets' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setTab('snippets')}
            >
              Snippets
            </button>
          </div>
          {tab === 'elements' ? (
            <button
              ref={addBtnRef}
              className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
              onClick={openAddMenu}
              title="Add element"
            >
              <Plus size={14} />
            </button>
          ) : (
            <button
              ref={snippetBtnRef}
              className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
              onClick={openSnippetMenu}
              title="Add"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        {showAdd && (
          <AddMenu
            x={menuPos.x}
            y={menuPos.y}
            onAdd={handleAdd}
            onClose={() => setShowAdd(false)}
          />
        )}

        {/* Snippets "+" menu */}
        {snippetMenu.menu && (
          <div
            className="fixed c-menu-popup min-w-[180px] z-[9999]"
            style={{ left: snippetMenu.menu.x, top: snippetMenu.menu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`c-menu-item ${!selectedId ? 'opacity-40 cursor-default' : ''}`}
              disabled={!selectedId}
              onClick={handleSaveSelectedAsSnippet}
            >
              <Code size={12} /> Save selected as snippet
            </button>
            <button
              className="c-menu-item"
              onClick={handleCreateCategory}
            >
              <FolderPlus size={12} /> New category
            </button>
          </div>
        )}

        {tab === 'elements' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Page list */}
            <div className="px-1 pt-1 pb-0.5 flex flex-col gap-0.5">
              <div className="flex items-center justify-between px-1.5 pb-0.5">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Pages</span>
                <button
                  className="w-4 h-4 c-icon-btn hover:text-accent hover:bg-accent/10"
                  onClick={() => addPage()}
                  title="Add page"
                >
                  <Plus size={12} />
                </button>
              </div>
              {pages.map((page) => (
                <PageNode key={page.id} page={page} />
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-border mx-2 my-1" />

            {/* Active page tree */}
            <div className="flex-1 overflow-y-auto py-0.5 px-1">
              {activePage && (
                <TreeNode frame={activePage.root} depth={0} isRoot />
              )}
            </div>
          </div>
        ) : (
          <SnippetsPanel ref={snippetPanelRef} />
        )}
      </div>
    </TreeDndProvider>
  )
}
