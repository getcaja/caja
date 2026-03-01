import { useState, useRef, useEffect, useCallback } from 'react'
import { findInTree } from '../../store/frameStore'
import { useFrameStore } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { TreeNode, TreeMergeProvider } from './TreeNode'
import { ComponentsPanel, type ComponentsPanelHandle } from './ComponentsPanel'
import { PageNode } from './PageNode'
import { useContextMenu } from './hooks/useContextMenu'
import { Plus, FolderPlus, Diamond, Download, X } from 'lucide-react'

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
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const enterComponentEditMode = useFrameStore((s) => s.enterComponentEditMode)
  const exitComponentEditMode = useFrameStore((s) => s.exitComponentEditMode)
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const renameComponent = useCatalogStore((s) => s.renameComponent)
  const handleRenameComponent = useCallback((id: string, name: string) => {
    renameFrame(id, name)
    renameComponent(id, name)
  }, [renameFrame, renameComponent])
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // Components "+" menu
  const componentMenu = useContextMenu()
  const componentBtnRef = useRef<HTMLButtonElement>(null)
  const componentPanelRef = useRef<ComponentsPanelHandle>(null)

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

  const openComponentMenu = () => {
    if (componentBtnRef.current) {
      const rect = componentBtnRef.current.getBoundingClientRect()
      componentMenu.openAt(rect.left, rect.bottom + 4)
    }
  }

  const handleSaveSelectedAsComponent = () => {
    if (!selectedId) return
    useFrameStore.getState().createComponent(selectedId)
    componentMenu.close()
  }

  const handleCreateCategory = () => {
    componentPanelRef.current?.createCategory()
    componentMenu.close()
  }

  const handleAssetsTab = () => {
    setTab('components')
  }

  const editingMaster = editingComponentId ? findInTree(root, editingComponentId) : null

  if (editingMaster) {
    return (
      <div className="h-full bg-surface-1/80 flex flex-col">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[12px] font-semibold px-1.5 py-0.5 text-text-muted shrink-0">Edit</span>
            <input
              className="text-[12px] font-semibold px-1.5 py-0.5 text-text-primary bg-transparent min-w-0 rounded focus:bg-surface-2 outline-none"
              value={editingMaster.name}
              onChange={(e) => handleRenameComponent(editingMaster.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
          </div>
          <button
            onClick={exitComponentEditMode}
            className="w-5 h-5 shrink-0 c-icon-btn hover:text-text-primary hover:bg-surface-2"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        <TreeDndProvider>
          <TreeMergeProvider>
            <div
              className="flex-1 overflow-y-auto py-0.5 px-1"
              onClick={(e) => { if (e.target === e.currentTarget) useFrameStore.getState().select(null) }}
            >
              <TreeNode frame={editingMaster} depth={0} isRoot />
            </div>
          </TreeMergeProvider>
        </TreeDndProvider>
      </div>
    )
  }

  return (
    <div className="h-full bg-surface-1/80 flex flex-col">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'layers' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'}`}
            onClick={() => setTab('layers')}
          >
            File
          </button>
          <button
            className={`text-[12px] font-semibold px-1.5 py-0.5 rounded transition-colors ${tab === 'components' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'}`}
            onClick={handleAssetsTab}
          >
            Assets
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
            ref={componentBtnRef}
            className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10"
            onClick={openComponentMenu}
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
          onAddPage={addPage}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Components "+" menu */}
      {componentMenu.backdrop}
      {componentMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[180px] z-50"
          style={{ left: componentMenu.menu.x, top: componentMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`c-menu-item ${!selectedId ? 'opacity-40 cursor-default' : ''}`}
            disabled={!selectedId}
            onClick={handleSaveSelectedAsComponent}
          >
            <Diamond size={12} /> Save selected as component
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
            onClick={() => { onExportLibrary(); componentMenu.close() }}
          >
            <Download size={12} /> Export as Library...
          </button>
        </div>
      )}

      {tab === 'layers' && (
        <TreeDndProvider>
          <TreeMergeProvider>
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
          </TreeMergeProvider>
        </TreeDndProvider>
      )}

      {tab === 'components' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ComponentsPanel
            ref={componentPanelRef}
            source={{ type: 'internal' }}
            onEditComponent={enterComponentEditMode}
          />
        </div>
      )}

    </div>
  )
}
