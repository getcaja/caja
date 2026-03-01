import { useState, useRef, useMemo, useCallback } from 'react'
import { findInTree, cloneWithNewIds, normalizeFrame } from '../../store/frameStore'
import { useFrameStore, isRootId } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { AddMenu } from './AddMenu'
import { TreeDndProvider } from './TreeDndContext'
import { TreeNode } from './TreeNode'
import { ComponentsPanel, type ComponentsPanelHandle } from './ComponentsPanel'
import { ComponentIOModal } from './ComponentIOModal'
import { PageNode } from './PageNode'
import { useContextMenu } from './hooks/useContextMenu'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { Plus, X, ChevronRight } from 'lucide-react'

function TreeSection({ label, collapsed, onToggle, children }: {
  label: string
  collapsed: boolean
  onToggle: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="py-1.5 border-b border-border">
      <div className={`px-2${collapsed ? '' : ' mb-1'}`}>
        <span
          className="inline-flex items-center gap-1 cursor-pointer select-none"
          onClick={onToggle}
        >
          <ChevronRight
            size={12}
            className={`text-text-muted transition-transform duration-150 ${collapsed ? '' : 'rotate-90'}`}
          />
          <span className="c-section-title">{label}</span>
        </span>
      </div>
      {!collapsed && children}
    </div>
  )
}

export function TreePanel() {
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
  const [pagesCollapsed, setPagesCollapsed] = useState(false)
  const [layersCollapsed, setLayersCollapsed] = useState(false)
  const addBtnRef = useRef<HTMLButtonElement>(null)

  // Components "+" menu
  const componentMenu = useContextMenu()
  const componentBtnRef = useRef<HTMLButtonElement>(null)
  const componentPanelRef = useRef<ComponentsPanelHandle>(null)

  // Component IO modal
  const [ioModal, setIoModal] = useState<{ open: boolean; mode: 'import' | 'export' }>({ open: false, mode: 'import' })

  /* ── Keyboard: Layers adapter ──────────────────────────── */
  const layersKeyboardConfig = useMemo(() => ({
    isActive: tab === 'layers' && !editingComponentId,
    getSelectedIds: () => useFrameStore.getState().selectedIds,
    getPrimaryId: () => useFrameStore.getState().selectedId,
    deleteSelected: () => {
      const s = useFrameStore.getState()
      if (s.selectedIds.size > 1) {
        s.removeSelected()
      } else if (s.selectedId && !isRootId(s.selectedId)) {
        s.removeFrame(s.selectedId)
      }
    },
    duplicateSelected: () => {
      const s = useFrameStore.getState()
      if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
    },
    copySelected: () => useFrameStore.getState().copySelected(),
    cutSelected: () => useFrameStore.getState().cutSelected(),
    pasteClipboard: () => useFrameStore.getState().pasteClipboard(),
    selectAll: () => useFrameStore.getState().selectAllSiblings(),
    reorder: (dir: 'up' | 'down', arrowKey: string) => {
      const s = useFrameStore.getState()
      if (!s.selectedId || isRootId(s.selectedId)) return
      const display = s.getParentDisplay(s.selectedId)
      const parentDir = display === 'grid' ? 'row' : s.getParentDirection(s.selectedId)
      if (parentDir === 'column' && (arrowKey === 'ArrowLeft' || arrowKey === 'ArrowRight')) return
      if (parentDir === 'row' && (arrowKey === 'ArrowUp' || arrowKey === 'ArrowDown')) return
      s.reorderFrame(s.selectedId, dir)
    },
    escape: () => useFrameStore.getState().select(null),
  }), [tab, editingComponentId])

  useTreeKeyboard(layersKeyboardConfig)

  /* ── Keyboard: Edit mode adapter ───────────────────────── */
  const editKeyboardConfig = useMemo(() => ({
    isActive: !!editingComponentId,
    getSelectedIds: () => useFrameStore.getState().selectedIds,
    getPrimaryId: () => useFrameStore.getState().selectedId,
    deleteSelected: () => {
      const s = useFrameStore.getState()
      if (s.selectedIds.size > 1) {
        s.removeSelected()
      } else if (s.selectedId && !isRootId(s.selectedId)) {
        s.removeFrame(s.selectedId)
      }
    },
    duplicateSelected: () => {
      const s = useFrameStore.getState()
      if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
    },
    copySelected: () => useFrameStore.getState().copySelected(),
    cutSelected: () => useFrameStore.getState().cutSelected(),
    pasteClipboard: () => useFrameStore.getState().pasteClipboard(),
    selectAll: () => useFrameStore.getState().selectAllSiblings(),
    reorder: (dir: 'up' | 'down', arrowKey: string) => {
      const s = useFrameStore.getState()
      if (!s.selectedId || isRootId(s.selectedId)) return
      const display = s.getParentDisplay(s.selectedId)
      const parentDir = display === 'grid' ? 'row' : s.getParentDirection(s.selectedId)
      if (parentDir === 'column' && (arrowKey === 'ArrowLeft' || arrowKey === 'ArrowRight')) return
      if (parentDir === 'row' && (arrowKey === 'ArrowUp' || arrowKey === 'ArrowDown')) return
      s.reorderFrame(s.selectedId, dir)
    },
    escape: () => useFrameStore.getState().exitComponentEditMode(),
  }), [editingComponentId])

  useTreeKeyboard(editKeyboardConfig)

  /* ── Keyboard: Components adapter ──────────────────────── */
  const componentsKeyboardConfig = useMemo(() => ({
    isActive: tab === 'components' && !editingComponentId,
    getSelectedIds: () => useCatalogStore.getState().highlightIds,
    getPrimaryId: () => useCatalogStore.getState().highlightId,
    deleteSelected: () => {
      const cs = useCatalogStore.getState()
      for (const id of cs.highlightIds) {
        if (!id.startsWith('__cat:')) cs.deleteComponent(id)
      }
    },
    duplicateSelected: () => {
      const cs = useCatalogStore.getState()
      const hl = cs.highlightId
      if (!hl || hl.startsWith('__cat:')) return
      const comp = cs.components.find((c) => c.id === hl)
      if (!comp) return
      const master = cloneWithNewIds(normalizeFrame(comp.frame))
      master.name = `${comp.name} Copy`
      useFrameStore.getState().addComponentMaster(master)
      cs.registerComponent({
        id: master.id,
        name: master.name,
        tags: [...comp.tags],
        frame: master,
        meta: {},
        createdAt: new Date().toISOString(),
      })
    },
    selectAll: () => {
      const cs = useCatalogStore.getState()
      const allIds = new Set(cs.components.map((c) => c.id))
      useCatalogStore.setState({ highlightIds: allIds })
    },
    escape: () => useCatalogStore.getState().setHighlightId(null),
  }), [tab, editingComponentId])

  useTreeKeyboard(componentsKeyboardConfig)

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
          <div
            className="flex-1 overflow-y-auto py-0.5 px-1"
            onClick={(e) => { if (e.target === e.currentTarget) useFrameStore.getState().select(null) }}
          >
            <TreeNode frame={editingMaster} depth={0} isRoot />
          </div>
        </TreeDndProvider>
      </div>
    )
  }

  return (
    <div className="h-full bg-surface-1/80 flex flex-col">
      <div className="pl-5 pr-2 py-2.5 border-b border-border flex items-center justify-between">
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
            className="c-menu-item"
            onClick={handleCreateCategory}
          >
            New Category
          </button>
          <div className="border-t border-border my-1" />
          <button
            className="c-menu-item"
            onClick={() => { setIoModal({ open: true, mode: 'import' }); componentMenu.close() }}
          >
            Import Components
          </button>
          <button
            className="c-menu-item"
            onClick={() => { setIoModal({ open: true, mode: 'export' }); componentMenu.close() }}
          >
            Export Components
          </button>
        </div>
      )}

      {tab === 'layers' && (
        <TreeDndProvider>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Pages section */}
            <TreeSection label="Pages" collapsed={pagesCollapsed} onToggle={() => setPagesCollapsed((v) => !v)}>
              <div className="pb-0.5 flex flex-col gap-0.5">
                {pages.filter((p) => !p.isComponentPage).map((page) => (
                  <PageNode key={page.id} page={page} />
                ))}
              </div>
            </TreeSection>

            {/* Layers section */}
            <TreeSection label="Layers" collapsed={layersCollapsed} onToggle={() => setLayersCollapsed((v) => !v)}>
              <div
                className="flex-1 overflow-y-auto pb-0.5"
                onClick={(e) => { if (e.target === e.currentTarget) useFrameStore.getState().select(null) }}
              >
                {activePage && (
                  <TreeNode frame={activePage.root} depth={0} isRoot />
                )}
              </div>
            </TreeSection>
          </div>
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

      <ComponentIOModal
        open={ioModal.open}
        mode={ioModal.mode}
        onOpenChange={(open) => setIoModal((prev) => ({ ...prev, open }))}
      />
    </div>
  )
}
