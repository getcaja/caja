import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
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

function TreeSection({ label, collapsed, onToggle, trailing, isLast, children }: {
  label: string
  collapsed: boolean
  onToggle: () => void
  trailing?: React.ReactNode
  isLast?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={`border-b border-border${isLast && !collapsed ? ' border-b-0' : ''}`}>
      <div className="c-section-header px-4">
        <div className="relative flex items-center group/section flex-1">
          <ChevronRight
            size={12}
            className={`absolute -left-3 top-1/2 -translate-y-1/2 fg-muted cursor-pointer opacity-0 group-hover/section:opacity-100 ${collapsed ? '' : 'rotate-90'}`}
            onClick={onToggle}
          />
          <span className="c-section-title cursor-pointer select-none" onClick={onToggle}>{label}</span>
          <span className="flex-1" />
          {trailing}
        </div>
      </div>
      {!collapsed && children}
    </div>
  )
}

export function TreePanel() {
  const root = useFrameStore((s) => s.root)
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const addChild = useFrameStore((s) => s.addChild)
  const addPage = useFrameStore((s) => s.addPage)
  const rawTab = useFrameStore((s) => s.treePanelTab)
  const tab = rawTab === 'layers' || rawTab === 'components' ? rawTab : 'layers'
  const setTab = useFrameStore((s) => s.setTreePanelTab)
  const editingComponentId = useFrameStore((s) => s.editingComponentId)
  const enterComponentEditMode = useFrameStore((s) => s.enterComponentEditMode)
  const exitComponentEditMode = useFrameStore((s) => s.exitComponentEditMode)
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const hasComponents = useCatalogStore((s) => s.components.length > 0 || s.emptyCategories.length > 0)
  const renameComponent = useCatalogStore((s) => s.renameComponent)
  const handleRenameComponent = useCallback((id: string, name: string) => {
    renameFrame(id, name)
    renameComponent(id, name)
  }, [renameFrame, renameComponent])
  const [showAdd, setShowAdd] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [pagesCollapsed, setPagesCollapsed] = useState(false)
  const [layersCollapsed, setLayersCollapsed] = useState(false)
  const [componentsCollapsed, setComponentsCollapsed] = useState(false)
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
    getPrimaryId: () => {
      const s = useFrameStore.getState()
      return s.selectedId ?? (s.pageSelected ? s.activePageId : null)
    },
    deleteSelected: () => {
      const s = useFrameStore.getState()
      // Page selected — delete the active page (if more than 1)
      if (s.pageSelected) {
        const userPages = s.pages.filter((p) => !p.isComponentPage)
        if (userPages.length > 1) s.removePage(s.activePageId)
        return
      }
      if (s.selectedIds.size > 1) {
        s.removeSelected()
      } else if (s.selectedId && !isRootId(s.selectedId)) {
        s.removeFrame(s.selectedId)
      }
    },
    duplicateSelected: () => {
      const s = useFrameStore.getState()
      if (s.pageSelected) {
        s.duplicatePage(s.activePageId)
        return
      }
      if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
    },
    copySelected: () => useFrameStore.getState().copySelected(),
    cutSelected: () => useFrameStore.getState().cutSelected(),

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
    // Escape handled globally (App.tsx) — walks up parent hierarchy
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
        if (id.startsWith('__cat:')) {
          const tag = id.slice(6)
          for (const s of cs.components) {
            if (s.tags[0] === tag) cs.updateComponentTags(s.id, s.tags.slice(1))
          }
          cs.removeEmptyCategory(tag)
        } else {
          cs.deleteComponent(id)
        }
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
    const sid = useFrameStore.getState().selectedId
    if (!sid) return root.id
    const selected = findInTree(root, sid)
    if (selected?.type === 'box') return selected.id
    return root.id
  }

  const openAddMenu = () => {
    window.dispatchEvent(new Event('close-menus'))
    if (addBtnRef.current) {
      const rect = addBtnRef.current.getBoundingClientRect()
      setMenuPos({ x: rect.left, y: rect.bottom + 4 })
    }
    setShowAdd(true)
  }

  // Close when another menu opens or window resizes
  useEffect(() => {
    const close = () => setShowAdd(false)
    window.addEventListener('close-menus', close)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('close-menus', close)
      window.removeEventListener('resize', close)
    }
  }, [])

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
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--panel-bg)' }}>
        <div className="c-section-header pl-3 pr-4 border-b border-border justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <input
              className="text-[12px] font-semibold px-1.5 py-0.5 fg-default bg-transparent min-w-0 rounded focus:bg-inset outline-none"
              value={editingMaster.name}
              onChange={(e) => handleRenameComponent(editingMaster.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            />
          </div>
          <button
            onClick={exitComponentEditMode}
            className="w-5 h-5 shrink-0 c-icon-btn"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
        {showAdd && (
          <AddMenu
            x={menuPos.x}
            y={menuPos.y}
            onAdd={handleAdd}

            onClose={() => setShowAdd(false)}
          />
        )}
        <TreeDndProvider>
          <div className="flex-1 overflow-y-auto flex flex-col">
            <TreeSection
              label="Elements"
              collapsed={layersCollapsed}
              onToggle={() => setLayersCollapsed((v) => !v)}
              trailing={
                <button
                  ref={addBtnRef}
                  className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10 opacity-0 group-hover/section:opacity-100"
                  onClick={(e) => { e.stopPropagation(); openAddMenu() }}
                  title="Add Element"
                >
                  <Plus size={12} />
                </button>
              }
            >
              <div className="flex-1 overflow-y-auto pb-0.5">
                <TreeNode frame={editingMaster} depth={0} isRoot />
              </div>
            </TreeSection>
          </div>
        </TreeDndProvider>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--panel-bg)' }}>
      <div className="c-section-header pl-3 pr-4 border-b border-border justify-between">
        <div className="flex items-center gap-1">
          <button
            className={`text-[12px] font-semibold px-1 py-0.5 rounded ${tab === 'layers' ? 'fg-default' : 'c-dimmed-i'}`}
            onClick={() => setTab('layers')}
          >
            File
          </button>
          <button
            className={`text-[12px] font-semibold px-1 py-0.5 rounded ${tab === 'components' ? 'fg-default' : 'c-dimmed-i'}`}
            onClick={handleAssetsTab}
          >
            Assets
          </button>
        </div>
      </div>

      {showAdd && (
        <AddMenu
          x={menuPos.x}
          y={menuPos.y}
          onAdd={handleAdd}
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
            <TreeSection
              label="Pages"
              collapsed={pagesCollapsed}
              onToggle={() => setPagesCollapsed((v) => !v)}
              trailing={
                <button
                  className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10 opacity-0 group-hover/section:opacity-100"
                  onClick={(e) => { e.stopPropagation(); addPage() }}
                  title="Add Page"
                >
                  <Plus size={12} />
                </button>
              }
            >
              <div className="pb-2 flex flex-col gap-0.5">
                {pages.filter((p) => !p.isComponentPage).map((page) => (
                  <PageNode key={page.id} page={page} />
                ))}
              </div>
            </TreeSection>

            {/* Elements section */}
            <TreeSection
              label="Elements"
              collapsed={layersCollapsed}
              onToggle={() => setLayersCollapsed((v) => !v)}
              isLast
              trailing={
                <button
                  ref={addBtnRef}
                  className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10 opacity-0 group-hover/section:opacity-100"
                  onClick={(e) => { e.stopPropagation(); openAddMenu() }}
                  title="Add Element"
                >
                  <Plus size={12} />
                </button>
              }
            >
              <div className="flex-1 overflow-y-auto pb-0.5">
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
          <div className={`py-3 flex flex-col${componentsCollapsed ? ' border-b border-border' : ' flex-1'}${!componentsCollapsed && hasComponents ? ' overflow-auto' : ''}`}>
            <div className={`px-4${componentsCollapsed ? '' : ' mb-2'}`}>
              <div className="relative flex items-center group/section">
                <ChevronRight
                  size={12}
                  className={`absolute -left-3 top-1/2 -translate-y-1/2 fg-muted cursor-pointer opacity-0 group-hover/section:opacity-100 ${componentsCollapsed ? '' : 'rotate-90'}`}
                  onClick={() => setComponentsCollapsed((v) => !v)}
                />
                <span className="c-section-title cursor-pointer select-none" onClick={() => setComponentsCollapsed((v) => !v)}>Components</span>
                <span className="flex-1" />
                <button
                  ref={componentBtnRef}
                  className="w-5 h-5 c-icon-btn hover:text-accent hover:bg-accent/10 opacity-0 group-hover/section:opacity-100"
                  onClick={(e) => { e.stopPropagation(); openComponentMenu() }}
                  title="Add"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            {!componentsCollapsed && (
              hasComponents ? (
                <ComponentsPanel
                  ref={componentPanelRef}
                  source={{ type: 'internal' }}
                  onEditComponent={enterComponentEditMode}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <span className="fg-subtle text-[12px]">No components yet</span>
                </div>
              )
            )}
          </div>
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
