import { useState, useRef } from 'react'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { TreeNode } from './TreeNode'
import { PatternsPanel, type PatternsPanelHandle } from './PatternsPanel'
import { ManageLibrariesModal } from './ManageLibrariesModal'
import { importLibrary, saveLibraryIndex } from '../../lib/libraryOps'
import { PageNode } from './PageNode'
import { Select } from '../ui/Select'
import { useContextMenu } from './hooks/useContextMenu'
import { Plus, FolderPlus, Code, Download, Settings } from 'lucide-react'

interface TreePanelProps {
  onExportLibrary: () => void
}

export function TreePanel({ onExportLibrary }: TreePanelProps) {
  const root = useFrameStore((s) => s.root)
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const selectedId = useFrameStore((s) => s.selectedId)
  const addChild = useFrameStore((s) => s.addChild)
  const addPage = useFrameStore((s) => s.addPage)
  const tab = useFrameStore((s) => s.treePanelTab)
  const setTab = useFrameStore((s) => s.setTreePanelTab)
  const activeSource = useCatalogStore((s) => s.activeSource)
  const libraryIndex = useCatalogStore((s) => s.libraryIndex)
  const setActiveSource = useCatalogStore((s) => s.setActiveSource)
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // Patterns "+" menu
  const patternMenu = useContextMenu()
  const patternBtnRef = useRef<HTMLButtonElement>(null)
  const patternPanelRef = useRef<PatternsPanelHandle>(null)

  // Modal state
  const [showManageLibraries, setShowManageLibraries] = useState(false)

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

  const openPatternMenu = () => {
    if (patternBtnRef.current) {
      const rect = patternBtnRef.current.getBoundingClientRect()
      patternMenu.openAt(rect.left, rect.bottom + 4)
    }
  }

  const handleSaveSelectedAsPattern = () => {
    if (!selectedId) return
    const frame = findInTree(root, selectedId)
    if (!frame) return
    useCatalogStore.getState().savePattern(frame.name || 'Pattern', [], frame)
    useCatalogStore.getState().setActiveSource('internal')
    setTab('patterns')
    patternMenu.close()
  }

  const handleCreateCategory = () => {
    patternPanelRef.current?.createCategory()
    patternMenu.close()
  }

  const handlePatternsTab = () => {
    setActiveSource('internal')
    setTab('patterns')
  }

  const handleLibrariesTab = () => {
    // If currently on internal, switch to first library (if any)
    if (activeSource === 'internal' && libraryIndex.length > 0) {
      setActiveSource(libraryIndex[0].id)
    }
    setTab('libraries')
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
              Pages
            </button>
            <button
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'patterns' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={handlePatternsTab}
            >
              Patterns
            </button>
            <button
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'libraries' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={handleLibrariesTab}
            >
              Libraries
            </button>
          </div>
          {tab === 'elements' && (
            <button
              ref={addBtnRef}
              className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
              onClick={openAddMenu}
              title="Add element"
            >
              <Plus size={14} />
            </button>
          )}
          {tab === 'patterns' && (
            <button
              ref={patternBtnRef}
              className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
              onClick={openPatternMenu}
              title="Add"
            >
              <Plus size={14} />
            </button>
          )}
          {tab === 'libraries' && (
            <button
              className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
              onClick={async () => {
                try {
                  const result = await importLibrary()
                  if (result) {
                    useCatalogStore.getState().installLibrary(result.meta, result.data)
                    await saveLibraryIndex(useCatalogStore.getState().libraryIndex)
                    setActiveSource(result.meta.id)
                  }
                } catch (err) {
                  console.error('Failed to import library:', err)
                }
              }}
              title="Import library"
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

        {/* Patterns "+" menu */}
        {patternMenu.menu && (
          <div
            className="fixed c-menu-popup min-w-[180px] z-[9999]"
            style={{ left: patternMenu.menu.x, top: patternMenu.menu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={`c-menu-item ${!selectedId ? 'opacity-40 cursor-default' : ''}`}
              disabled={!selectedId}
              onClick={handleSaveSelectedAsPattern}
            >
              <Code size={12} /> Save selected as pattern
            </button>
            <button
              className="c-menu-item"
              onClick={handleCreateCategory}
            >
              <FolderPlus size={12} /> New category
            </button>
            <div className="border-t border-border my-1" />
            <button
              className="c-menu-item"
              onClick={() => { onExportLibrary(); patternMenu.close() }}
            >
              <Download size={12} /> Export as Library...
            </button>
          </div>
        )}

        {tab === 'elements' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Page list */}
            <div className="px-1 pt-1 pb-0.5 flex flex-col gap-0.5">
              {pages.map((page) => (
                <PageNode key={page.id} page={page} />
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-border my-1" />

            {/* Active page tree */}
            <div className="flex-1 overflow-y-auto py-0.5 px-1">
              {activePage && (
                <TreeNode frame={activePage.root} depth={0} isRoot />
              )}
            </div>
          </div>
        )}

        {tab === 'patterns' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <PatternsPanel ref={patternPanelRef} />
          </div>
        )}

        {tab === 'libraries' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {libraryIndex.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-text-muted text-[12px]">No libraries installed</span>
              </div>
            ) : (
              <>
                <div className="px-2 py-1.5 flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <Select
                      value={libraryIndex.some((l) => l.id === activeSource) ? activeSource : libraryIndex[0].id}
                      options={libraryIndex.map((lib) => ({ value: lib.id, label: lib.name }))}
                      onChange={setActiveSource}
                      className="w-full"
                    />
                  </div>
                  <button
                    className="w-5 h-5 shrink-0 c-icon-btn hover:text-accent hover:bg-accent/10"
                    onClick={() => setShowManageLibraries(true)}
                    title="Manage libraries"
                  >
                    <Settings size={14} />
                  </button>
                </div>
                <PatternsPanel />
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ManageLibrariesModal open={showManageLibraries} onOpenChange={setShowManageLibraries} />
    </TreeDndProvider>
  )
}
