import { useState, useRef, useEffect } from 'react'
import { findInTree } from '../../store/frameStore'
import { useFrameStore } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { TreeNode } from './TreeNode'
import { PatternsPanel, type PatternsPanelHandle, type PatternSource } from './PatternsPanel'
import { ManageLibrariesModal } from './ManageLibrariesModal'
import { importLibrary, saveLibraryIndex } from '../../lib/libraryOps'
import { PageNode } from './PageNode'
import { Select } from '../ui/Select'
import { useContextMenu } from './hooks/useContextMenu'
import { Plus, FolderPlus, Code, Download, Settings, ArrowLeft } from 'lucide-react'

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
  const activeLibraryId = useCatalogStore((s) => s.activeLibraryId)
  const libraryIndex = useCatalogStore((s) => s.libraryIndex)
  const setActiveLibraryId = useCatalogStore((s) => s.setActiveLibraryId)
  const hasComponentPage = useFrameStore((s) => s.pages.some((p) => p.isComponentPage))
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const enterComponentEditMode = useFrameStore((s) => s.enterComponentEditMode)
  const exitComponentEditMode = useFrameStore((s) => s.exitComponentEditMode)
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // Patterns "+" menu
  const patternMenu = useContextMenu()
  const patternBtnRef = useRef<HTMLButtonElement>(null)
  const patternPanelRef = useRef<PatternsPanelHandle>(null)

  // Modal state
  const [showManageLibraries, setShowManageLibraries] = useState(false)

  // Escape key exits component edit mode
  useEffect(() => {
    if (!editingComponentId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        exitComponentEditMode()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingComponentId, exitComponentEditMode])

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
    useFrameStore.getState().createComponent(selectedId)
    patternMenu.close()
  }

  const handleCreateCategory = () => {
    patternPanelRef.current?.createCategory()
    patternMenu.close()
  }

  const handlePatternsTab = () => {
    setTab('components')
  }

  const handleLibrariesTab = () => {
    // Auto-select first library if none selected
    if (activeLibraryId === null && libraryIndex.length > 0) {
      setActiveLibraryId(libraryIndex[0].id)
    }
    setTab('libraries')
  }

  // Component edit mode: isolated panel — no tabs, just back bar + tree
  if (editingComponentId) {
    const editingMaster = findInTree(root, editingComponentId)

    return (
      <div className="h-full bg-surface-1/80 flex flex-col">
        <div className="px-2 py-2.5 border-b border-border flex items-center gap-1.5">
          <button
            onClick={exitComponentEditMode}
            className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="text-[12px] font-semibold truncate text-text-primary">
            {editingMaster?.name ?? 'Component'}
          </span>
        </div>
        <TreeDndProvider>
          <div
            className="flex-1 overflow-y-auto py-0.5 px-1"
            onClick={(e) => { if (e.target === e.currentTarget) useFrameStore.getState().select(null) }}
          >
            {editingMaster && (
              <TreeNode frame={editingMaster} depth={0} isRoot />
            )}
          </div>
        </TreeDndProvider>
      </div>
    )
  }

  return (
    <div className="h-full bg-surface-1/80 flex flex-col">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'layers' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={() => setTab('layers')}
          >
            Layers
          </button>
          <button
            className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'components' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={handlePatternsTab}
          >
            Components
          </button>
          <button
            className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'libraries' ? 'text-text-primary bg-surface-2' : 'text-text-muted hover:text-text-secondary'}`}
            onClick={handleLibrariesTab}
          >
            Libraries
          </button>
        </div>
        {tab === 'layers' && (
          <button
            ref={addBtnRef}
            className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
            onClick={openAddMenu}
            title="Add element"
          >
            <Plus size={14} />
          </button>
        )}
        {tab === 'components' && (
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
                  setActiveLibraryId(result.meta.id)
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
          onAddPage={addPage}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Patterns "+" menu */}
      {patternMenu.backdrop}
      {patternMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[180px] z-50"
          style={{ left: patternMenu.menu.x, top: patternMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`c-menu-item ${!selectedId ? 'opacity-40 cursor-default' : ''}`}
            disabled={!selectedId}
            onClick={handleSaveSelectedAsPattern}
          >
            <Code size={12} /> Save selected as component
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

      {tab === 'layers' && (
        <TreeDndProvider>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Page list */}
            <div className="px-1 pt-1 pb-0.5 flex flex-col gap-0.5">
              {pages.filter((p) => !p.isComponentPage).map((page) => (
                <PageNode key={page.id} page={page} />
              ))}
            </div>

            {/* Separator */}
            <div className="border-t border-border my-1" />

            {/* Active page tree — click empty space to deselect */}
            <div
              className="flex-1 overflow-y-auto py-0.5 px-1"
              onClick={(e) => { if (e.target === e.currentTarget) useFrameStore.getState().select(null) }}
            >
              {activePage && (
                <TreeNode frame={activePage.root} depth={0} isRoot />
              )}
            </div>
          </div>
        </TreeDndProvider>
      )}

      {tab === 'components' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <PatternsPanel
            ref={patternPanelRef}
            source={{ type: 'internal' }}
            onEditComponent={enterComponentEditMode}
          />
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
                    value={libraryIndex.some((l) => l.id === activeLibraryId) ? activeLibraryId! : libraryIndex[0].id}
                    options={libraryIndex.map((lib) => ({ value: lib.id, label: lib.name }))}
                    onChange={setActiveLibraryId}
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
              <PatternsPanel source={{ type: 'library', libraryId: (libraryIndex.some((l) => l.id === activeLibraryId) ? activeLibraryId! : libraryIndex[0].id) }} />
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <ManageLibrariesModal open={showManageLibraries} onOpenChange={setShowManageLibraries} />
    </div>
  )
}
