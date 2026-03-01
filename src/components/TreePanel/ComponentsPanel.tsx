import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useFrameStore, findInTree, cloneWithNewIds, normalizeFrame } from '../../store/frameStore'
import { useCatalogStore } from '../../store/catalogStore'
import { ChevronRight, ChevronDown, Diamond, Folder } from 'lucide-react'
import type { Component } from '../../types/component'
import { ComponentPreview } from './ComponentPreview'
import { useComponentsData } from './useComponentsData'
import { ComponentContextMenu } from './ComponentContextMenu'
import { useWorkspaceDnd } from './WorkspaceDndContext'
import type { DropPosition } from './dndUtils'

export type ComponentSource =
  | { type: 'internal' }
  | { type: 'library'; libraryId: string }

export interface ComponentsPanelHandle {
  createCategory: () => void
}

interface ComponentsPanelProps {
  source?: ComponentSource
  onEditComponent?: (componentId: string) => void
}

export const ComponentsPanel = forwardRef<ComponentsPanelHandle, ComponentsPanelProps>(function ComponentsPanel({ source = { type: 'internal' }, onEditComponent }, ref) {
  const {
    components, readOnly, sourceName, root, selectedId, insertFrame,
    highlightId, highlightIds, setHighlightId, highlightMulti, highlightRange,
    emptyCategories, deleteComponent,
    renameComponent, updateComponentTags, moveComponent, addEmptyCategory,
    removeEmptyCategory, moveCategory,
  } = useComponentsData(source)

  const { activeId: dragId } = useWorkspaceDnd()

  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingCategoryTag, setEditingCategoryTag] = useState<string | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState('')
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; type: 'component'; component: Component }
    | { x: number; y: number; type: 'category'; tag: string }
    | null
  >(null)

  // Component hover preview
  const [previewComponent, setPreviewComponent] = useState<Component | null>(null)
  const [previewY, setPreviewY] = useState(0)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const cancelLeave = useCallback(() => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
  }, [])

  const onPreviewEnter = useCallback((component: Component, y: number) => {
    cancelLeave()
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      setPreviewComponent(component)
      setPreviewY(y)
    }, 300)
  }, [cancelLeave])

  const onPreviewLeave = useCallback(() => {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    leaveTimerRef.current = setTimeout(() => {
      setPreviewComponent(null)
    }, 150)
  }, [])

  const onPreviewPopupEnter = useCallback(() => {
    cancelLeave()
  }, [cancelLeave])

  const onPreviewPopupLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setPreviewComponent(null)
    }, 150)
  }, [])

  function handlePreviewInsert() {
    if (!previewComponent) return
    handleInsert(previewComponent)
    cancelLeave()
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    setPreviewComponent(null)
  }

  function handlePreviewEdit() {
    if (!previewComponent || !onEditComponent) return
    onEditComponent(previewComponent.id)
    cancelLeave()
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    setPreviewComponent(null)
  }

  // Clear preview during drag
  useEffect(() => {
    if (dragId) onPreviewLeave()
  }, [dragId, onPreviewLeave])

  // Group: uncategorized at root, then by first tag (preserving order)
  const { uncategorized, allTags, categorized } = useMemo(() => {
    const map = new Map<string, Component[]>()
    const uncat: Component[] = []
    const tagOrder: string[] = []
    for (const s of components) {
      if (s.tags.length === 0) {
        uncat.push(s)
      } else {
        const tag = s.tags[0]
        if (!map.has(tag)) { map.set(tag, []); tagOrder.push(tag) }
        map.get(tag)!.push(s)
      }
    }
    for (const cat of emptyCategories) {
      if (!map.has(cat)) { map.set(cat, []); tagOrder.push(cat) }
    }
    return { categorized: map, uncategorized: uncat, allTags: tagOrder }
  }, [components, emptyCategories])

  function getInsertParent(): string {
    if (selectedId) {
      const sel = findInTree(root, selectedId)
      if (sel?.type === 'box') return sel.id
    }
    return root.id
  }

  function handleInsert(component: Component) {
    const origin = { libraryId: source.type === 'library' ? source.libraryId : 'internal', componentId: component.id }
    insertFrame(getInsertParent(), component.frame, origin)
  }

  function handleDuplicate(component: Component) {
    const master = cloneWithNewIds(normalizeFrame(component.frame))
    master.name = `${component.name} Copy`
    useFrameStore.getState().addComponentMaster(master)
    useCatalogStore.getState().registerComponent({
      id: master.id,
      name: master.name,
      tags: [...component.tags],
      frame: master,
      meta: {},
      createdAt: new Date().toISOString(),
    })
  }

  function toggleTag(tag: string) {
    setCollapsedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function startComponentRename(component: Component) {
    setEditingId(component.id)
    setEditValue(component.name)
  }
  function commitComponentRename() {
    if (editingId && editValue.trim()) renameComponent(editingId, editValue.trim())
    setEditingId(null)
  }

  function startCategoryRename(tag: string) {
    setEditingCategoryTag(tag)
    setEditCategoryValue(tag)
  }
  function commitCategoryRename() {
    const name = editCategoryValue.trim()
    if (!name) { setEditingCategoryTag(null); return }

    if (editingCategoryTag === '__new__') {
      if (!allTags.includes(name)) {
        addEmptyCategory(name)
      }
    } else if (editingCategoryTag && name !== editingCategoryTag) {
      for (const s of components) {
        if (s.tags[0] === editingCategoryTag) {
          updateComponentTags(s.id, [name, ...s.tags.slice(1)])
        }
      }
      if (emptyCategories.includes(editingCategoryTag)) {
        removeEmptyCategory(editingCategoryTag)
        addEmptyCategory(name)
      }
    }
    setEditingCategoryTag(null)
  }

  function deleteCategory(tag: string) {
    for (const s of components) {
      if (s.tags[0] === tag) {
        updateComponentTags(s.id, s.tags.slice(1))
      }
    }
    removeEmptyCategory(tag)
  }

  function createCategory() {
    let name = 'New Category'
    let i = 1
    while (allTags.includes(name)) { name = `New Category ${++i}` }
    setEditingCategoryTag('__new__')
    setEditCategoryValue(name)
  }

  function handleGroup() {
    const ids = [...highlightIds].filter((id) => !id.startsWith('__cat:'))
    if (ids.length === 0) return
    let name = 'Group 1'
    let i = 1
    while (allTags.includes(name)) { name = `Group ${++i}` }
    useCatalogStore.getState().groupComponents(ids, name)
  }

  useImperativeHandle(ref, () => ({ createCategory }))

  const closeContext = useCallback(() => setContextMenu(null), [])

  const hasContent = components.length > 0 || allTags.length > 0

  // Compute visible order for shift+click range selection + merge styling
  const visibleOrder = useMemo(() => {
    const order: string[] = []
    for (const s of uncategorized) order.push(s.id)
    for (const tag of allTags) {
      order.push(`__cat:${tag}`)
      if (!collapsedTags.has(tag)) {
        const items = categorized.get(tag) || []
        for (const s of items) order.push(s.id)
      }
    }
    return order
  }, [uncategorized, allTags, categorized, collapsedTags])

  const { mergeTop, mergeBottom } = useMemo(() => {
    if (highlightIds.size <= 1) return { mergeTop: new Set<string>(), mergeBottom: new Set<string>() }
    const mt = new Set<string>()
    const mb = new Set<string>()
    for (let i = 0; i < visibleOrder.length; i++) {
      if (!highlightIds.has(visibleOrder[i])) continue
      if (i > 0 && highlightIds.has(visibleOrder[i - 1])) mt.add(visibleOrder[i])
      if (i < visibleOrder.length - 1 && highlightIds.has(visibleOrder[i + 1])) mb.add(visibleOrder[i])
    }
    return { mergeTop: mt, mergeBottom: mb }
  }, [visibleOrder, highlightIds])

  const handleClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey) highlightRange(id, visibleOrder)
    else if (e.metaKey) highlightMulti(id)
    else setHighlightId(id)
  }, [visibleOrder, highlightRange, highlightMulti, setHighlightId])

  const panelRight = panelRef.current ? panelRef.current.getBoundingClientRect().right : 280

  return (
    <div
      ref={panelRef}
      data-component-dnd-panel
      className="h-full flex flex-col overflow-y-auto py-1 px-1"
      onClick={(e) => { if (e.target === e.currentTarget) setHighlightId(null) }}
    >
      {hasContent && (
        <>
          {/* Uncategorized items */}
          {uncategorized.map((s) => (
            <ComponentRow
              key={s.id}
              component={s}
              depth={0}
              readOnly={readOnly}
              isEditing={!readOnly && editingId === s.id}
              editValue={editValue}
              isHighlighted={highlightIds.has(s.id)}
              isMulti={highlightIds.size > 1}
              mergeTop={mergeTop.has(s.id)}
              mergeBottom={mergeBottom.has(s.id)}
              onClick={(e) => handleClick(s.id, e)}
              onEditChange={setEditValue}
              onEditCommit={commitComponentRename}
              onEditCancel={() => setEditingId(null)}
              onDoubleClick={() => {
                if (onEditComponent) { onEditComponent(s.id); return }
                if (!readOnly) startComponentRename(s)
              }}
              onContextMenu={(x, y) => setContextMenu({ x, y, type: 'component', component: s })}
              onPreviewEnter={onPreviewEnter}
              onPreviewLeave={onPreviewLeave}
            />
          ))}

          {/* Categories (depth 1, children at depth 2) */}
          {allTags.map((tag) => {
            const items = categorized.get(tag) || []
            const isCollapsed = collapsedTags.has(tag)
            const isEditingCat = editingCategoryTag === tag

            return (
              <CategoryRow
                key={tag}
                tag={tag}
                items={items}
                readOnly={readOnly}
                isCollapsed={isCollapsed}
                isEditingCat={isEditingCat}
                editCategoryValue={editCategoryValue}
                isHighlighted={highlightIds.has(`__cat:${tag}`)}
                isMulti={highlightIds.size > 1}
                mergeTop={mergeTop.has(`__cat:${tag}`)}
                mergeBottom={mergeBottom.has(`__cat:${tag}`)}
                onToggle={() => toggleTag(tag)}
                onClick={(e) => handleClick(`__cat:${tag}`, e)}
                onEditChange={setEditCategoryValue}
                onEditCommit={commitCategoryRename}
                onEditCancel={() => setEditingCategoryTag(null)}
                onDoubleClick={() => { if (!readOnly) startCategoryRename(tag) }}
                onDeleteCategory={() => deleteCategory(tag)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ x: e.clientX, y: e.clientY, type: 'category', tag })
                }}
              >
                {!isCollapsed && items.map((s) => (
                  <ComponentRow
                    key={s.id}
                    component={s}
                    depth={1}
                    readOnly={readOnly}
                    isEditing={!readOnly && editingId === s.id}
                    editValue={editValue}
                    isHighlighted={highlightIds.has(s.id)}
                    isMulti={highlightIds.size > 1}
                    mergeTop={mergeTop.has(s.id)}
                    mergeBottom={mergeBottom.has(s.id)}
                    onClick={(e) => handleClick(s.id, e)}
                    onEditChange={setEditValue}
                    onEditCommit={commitComponentRename}
                    onEditCancel={() => setEditingId(null)}
                    onDoubleClick={() => {
                      if (onEditComponent) { onEditComponent(s.id); return }
                      if (!readOnly) startComponentRename(s)
                    }}
                    onContextMenu={(x, y) => setContextMenu({ x, y, type: 'component', component: s })}
                    onPreviewEnter={onPreviewEnter}
                    onPreviewLeave={onPreviewLeave}
                  />
                ))}
              </CategoryRow>
            )
          })}

          {/* New category being created */}
          {editingCategoryTag === '__new__' && (
            <div className="flex items-center gap-1.5 py-1 px-1" style={{ paddingLeft: 4 }}>
              <span className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted">
                <ChevronDown size={10} />
              </span>
              <span className="shrink-0 text-text-muted"><Folder size={12} /></span>
              <input
                autoFocus
                value={editCategoryValue}
                onChange={(e) => setEditCategoryValue(e.target.value)}
                onBlur={commitCategoryRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitCategoryRename()
                  if (e.key === 'Escape') setEditingCategoryTag(null)
                }}
                className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
              />
            </div>
          )}
        </>
      )}

      {!hasContent && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-muted text-[12px]">
            {readOnly ? 'This library is empty.' : 'No components yet'}
          </span>
        </div>
      )}

      {/* Component context menu */}
      {contextMenu && <div className="fixed inset-0 z-40" onClick={closeContext} onContextMenu={(e) => { e.preventDefault(); closeContext() }} />}
      {contextMenu && (
        <ComponentContextMenu
          contextMenu={contextMenu}
          readOnly={readOnly}
          multiCount={highlightIds.size}
          onEdit={onEditComponent}
          onInsert={handleInsert}
          onDuplicate={readOnly ? undefined : handleDuplicate}
          onRename={startComponentRename}
          onDelete={(id) => deleteComponent(id)}
          onGroup={!readOnly ? handleGroup : undefined}
          onCategoryRename={startCategoryRename}
          onCategoryDelete={deleteCategory}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Component hover preview — always mounted, iframe persists */}
      <ComponentPreview
        frame={previewComponent?.frame ?? null}
        name={previewComponent?.name ?? ''}
        sourceName={sourceName}
        anchorY={previewY}
        panelRight={panelRight}
        onInsert={handlePreviewInsert}
        onEdit={onEditComponent ? handlePreviewEdit : undefined}
        onPopupEnter={onPreviewPopupEnter}
        onPopupLeave={onPreviewPopupLeave}
      />
    </div>
  )
})

/* ── Category row with DnD ───────────────────────────────── */

function CategoryRow({
  tag, items, readOnly, isCollapsed, isEditingCat, editCategoryValue,
  isHighlighted, isMulti, mergeTop: mt, mergeBottom: mb,
  onToggle, onClick, onEditChange, onEditCommit, onEditCancel,
  onDoubleClick, onDeleteCategory, onContextMenu, children,
}: {
  tag: string
  items: Component[]
  readOnly: boolean
  isCollapsed: boolean
  isEditingCat: boolean
  editCategoryValue: string
  isHighlighted: boolean
  isMulti?: boolean
  mergeTop?: boolean
  mergeBottom?: boolean
  onToggle: () => void
  onClick: (e: React.MouseEvent) => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDoubleClick: () => void
  onDeleteCategory: () => void
  onContextMenu: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  const catId = `__cat:${tag}`
  const { activeId, overId, overPosition } = useWorkspaceDnd()

  const { attributes: dragAttrs, listeners: dragListeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: catId,
    disabled: readOnly || isEditingCat,
    data: { type: 'category', tag },
  })

  const { setNodeRef: setDropRef } = useDroppable({
    id: catId,
    disabled: readOnly,
    data: { type: 'category', tag, isBox: true, hasExpandedChildren: !isCollapsed && items.length > 0 },
  })

  const isCatOver = overId === catId
  const catOverPos = isCatOver ? overPosition : null

  // Merge refs
  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }, [setDragRef, setDropRef])

  return (
    <div className="relative">
      {/* Drop indicators for category reorder */}
      {isCatOver && catOverPos === 'before' && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 4 }} />
      )}
      {isCatOver && catOverPos === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 4 }} />
      )}

      {/* Category row */}
      <div
        ref={mergedRef}
        {...dragListeners}
        {...dragAttrs}
        className={`flex items-center gap-1.5 py-1 px-1 ${
          !isHighlighted ? 'rounded-md' : !isMulti ? 'rounded-md' : mt && mb ? '' : mt ? 'rounded-b-md' : mb ? 'rounded-t-md' : 'rounded-md'
        } group transition-all ${
          isCatOver && catOverPos === 'inside'
            ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
            : isHighlighted
              ? `${isMulti ? 'tree-node-multi-selected' : 'tree-node-selected'} text-text-primary`
              : isDragging ? 'opacity-40' : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: 4 }}
        onClick={(e) => { if (!activeId) onClick(e) }}
        onContextMenu={readOnly ? undefined : onContextMenu}
      >
        <span
          className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggle() }}
        >
          {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        </span>

        <span className="shrink-0 text-text-muted"><Folder size={12} /></span>

        {isEditingCat ? (
          <input
            autoFocus
            value={editCategoryValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditCommit()
              if (e.key === 'Escape') onEditCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
          />
        ) : (
          <span
            className="flex-1 text-[12px] truncate cursor-default"
            onDoubleClick={readOnly ? undefined : (e) => { e.stopPropagation(); onDoubleClick() }}
          >
            {tag}
          </span>
        )}

        <div className="w-5 shrink-0" />
      </div>

      {/* Children */}
      {children}
    </div>
  )
}

/* ── Component row with @dnd-kit hooks ─────────────────────── */

function ComponentRow({
  component, depth, readOnly, isEditing, editValue,
  isHighlighted, isMulti, mergeTop: mt, mergeBottom: mb,
  onClick, onEditChange, onEditCommit, onEditCancel, onDoubleClick,
  onContextMenu, onPreviewEnter, onPreviewLeave,
}: {
  component: Component
  depth: number
  readOnly?: boolean
  isEditing: boolean
  editValue: string
  isHighlighted: boolean
  isMulti?: boolean
  mergeTop?: boolean
  mergeBottom?: boolean
  onClick: (e: React.MouseEvent) => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDoubleClick: () => void
  onContextMenu: (x: number, y: number) => void
  onPreviewEnter?: (component: Component, y: number) => void
  onPreviewLeave?: () => void
}) {
  const { activeId, overId, overPosition, multiDragCount } = useWorkspaceDnd()
  const highlightIdsForDrag = useCatalogStore((s) => s.highlightIds)

  const { attributes, listeners, setNodeRef: setDragRef, isDragging: isDraggingSelf } = useDraggable({
    id: component.id,
    disabled: isEditing,
    data: { type: 'component' },
  })

  const { setNodeRef: setDropRef } = useDroppable({
    id: component.id,
    disabled: !!readOnly,
    data: { type: 'component', tag: component.tags[0] ?? null },
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  // Merge refs
  const mergedRef = useCallback((node: HTMLDivElement | null) => {
    setDragRef(node)
    setDropRef(node)
    ;(scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }, [setDragRef, setDropRef])

  useEffect(() => {
    if (isHighlighted && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isHighlighted])

  const isOver = overId === component.id
  const pos = isOver ? overPosition : null
  const isDragging = isDraggingSelf || (activeId !== null && multiDragCount > 1 && highlightIdsForDrag.has(component.id))

  return (
    <div
      ref={mergedRef}
      {...listeners}
      {...attributes}
      className="relative"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onPreviewEnter?.(component, rect.top)
      }}
      onMouseLeave={() => onPreviewLeave?.()}
    >
      {/* Drop indicators */}
      {isOver && pos === 'before' && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: depth * 16 + 4 }} />
      )}
      {isOver && pos === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: depth * 16 + 4 }} />
      )}

      <div
        className={`flex items-center gap-1.5 py-1 px-1 ${
          !isHighlighted ? 'rounded-md' : !isMulti ? 'rounded-md' : mt && mb ? '' : mt ? 'rounded-b-md' : mb ? 'rounded-t-md' : 'rounded-md'
        } group transition-all ${
          isHighlighted
            ? `${isMulti ? 'tree-node-multi-selected' : 'tree-node-selected'} text-text-primary`
            : isDragging ? 'opacity-40' : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={onClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e.clientX, e.clientY) }}
      >
        <span className="shrink-0 text-accent"><Diamond size={12} /></span>

        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditCommit()
              if (e.key === 'Escape') onEditCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
          />
        ) : (
          <span className="flex-1 text-[12px] truncate" onDoubleClick={onDoubleClick}>{component.name}</span>
        )}

        <div className="w-5 shrink-0" />
      </div>
    </div>
  )
}
