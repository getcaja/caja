import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useSnippetStore } from '../../store/snippetStore'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { Plus, X, Trash2, ChevronRight, ChevronDown, Code, Folder, Pencil } from 'lucide-react'
import type { Snippet } from '../../types/snippet'

export interface SnippetsPanelHandle {
  createCategory: () => void
}

type DropPosition = 'before' | 'after' | 'inside'

export const SnippetsPanel = forwardRef<SnippetsPanelHandle>(function SnippetsPanel(_props, ref) {
  const userSnippets = useSnippetStore((s) => s.snippets)
  const highlightId = useSnippetStore((s) => s.highlightId)
  const setHighlightId = useSnippetStore((s) => s.setHighlightId)
  const order = useSnippetStore((s) => s.order)
  const emptyCategories = useSnippetStore((s) => s.emptyCategories)
  const deleteSnippet = useSnippetStore((s) => s.deleteSnippet)
  const renameSnippet = useSnippetStore((s) => s.renameSnippet)
  const updateSnippetTags = useSnippetStore((s) => s.updateSnippetTags)
  const moveSnippet = useSnippetStore((s) => s.moveSnippet)
  const addEmptyCategory = useSnippetStore((s) => s.addEmptyCategory)
  const removeEmptyCategory = useSnippetStore((s) => s.removeEmptyCategory)
  const moveCategory = useSnippetStore((s) => s.moveCategory)

  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const insertFrame = useFrameStore((s) => s.insertFrame)

  // Use allSnippets() but memoize on deps that change
  const snippets = useMemo(() => {
    return useSnippetStore.getState().allSnippets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSnippets, order])

  const [rootCollapsed, setRootCollapsed] = useState(false)
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingCategoryTag, setEditingCategoryTag] = useState<string | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState('')
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; type: 'snippet'; snippet: Snippet }
    | { x: number; y: number; type: 'category'; tag: string }
    | null
  >(null)

  // DnD state
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPos, setOverPos] = useState<DropPosition | null>(null)

  // Group: uncategorized at root, then by first tag (preserving order)
  const { categorized, uncategorized, allTags } = useMemo(() => {
    const map = new Map<string, Snippet[]>()
    const uncat: Snippet[] = []
    const tagOrder: string[] = []
    for (const s of snippets) {
      if (s.tags.length === 0) {
        uncat.push(s)
      } else {
        const tag = s.tags[0]
        if (!map.has(tag)) { map.set(tag, []); tagOrder.push(tag) }
        map.get(tag)!.push(s)
      }
    }
    // Append empty categories (manually created, no snippets yet)
    for (const cat of emptyCategories) {
      if (!map.has(cat)) { map.set(cat, []); tagOrder.push(cat) }
    }
    return { categorized: map, uncategorized: uncat, allTags: tagOrder }
  }, [snippets, emptyCategories])

  function getInsertParent(): string {
    if (selectedId) {
      const sel = findInTree(root, selectedId)
      if (sel?.type === 'box') return sel.id
    }
    return root.id
  }

  function handleInsert(snippet: Snippet) {
    insertFrame(getInsertParent(), snippet.frame)
  }

  function toggleTag(tag: string) {
    setCollapsedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function startSnippetRename(snippet: Snippet) {
    setEditingId(snippet.id)
    setEditValue(snippet.name)
  }
  function commitSnippetRename() {
    if (editingId && editValue.trim()) renameSnippet(editingId, editValue.trim())
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
      // Create a new empty category
      if (!allTags.includes(name)) {
        addEmptyCategory(name)
      }
    } else if (editingCategoryTag && name !== editingCategoryTag) {
      // Rename existing category
      for (const s of snippets) {
        if (s.tags[0] === editingCategoryTag) {
          updateSnippetTags(s.id, [name, ...s.tags.slice(1)])
        }
      }
      // Also rename in emptyCategories if present
      if (emptyCategories.includes(editingCategoryTag)) {
        removeEmptyCategory(editingCategoryTag)
        addEmptyCategory(name)
      }
    }
    setEditingCategoryTag(null)
  }

  function deleteCategory(tag: string) {
    for (const s of snippets) {
      if (s.tags[0] === tag) {
        updateSnippetTags(s.id, s.tags.slice(1))
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

  useImperativeHandle(ref, () => ({ createCategory }))

  // Close context menu
  const closeContext = useCallback(() => setContextMenu(null), [])
  useEffect(() => {
    if (contextMenu) {
      window.addEventListener('click', closeContext)
      return () => window.removeEventListener('click', closeContext)
    }
  }, [contextMenu, closeContext])

  // --- DnD helpers ---
  function getDropPos(e: React.DragEvent, el: HTMLElement, isCategory: boolean): DropPosition {
    const rect = el.getBoundingClientRect()
    const y = e.clientY - rect.top
    const third = rect.height / 3
    if (y < third) return 'before'
    if (y > third * 2 || !isCategory) return 'after'
    return 'inside'
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', id)
    setDragId(id)

    // Set snippet drag frame + sentinel canvasDragId for cross-iframe DnD
    const snippet = snippets.find((s) => s.id === id)
    if (snippet) {
      useFrameStore.getState().setSnippetDragFrame(snippet.frame)
      // canvasDragId set lazily on first canvas dragover (not here)
    }
  }

  function handleDragOver(e: React.DragEvent, id: string, isCategory: boolean) {
    if (!dragId || dragId === id) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const pos = getDropPos(e, e.currentTarget as HTMLElement, isCategory)
    setOverId(id)
    setOverPos(pos)
  }

  function handleDragLeave(id: string) {
    if (overId === id) { setOverId(null); setOverPos(null) }
  }

  function handleDrop(e: React.DragEvent, targetId: string, isCategory: boolean) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId || dragId === targetId) { endDrag(); return }

    const pos = getDropPos(e, e.currentTarget as HTMLElement, isCategory)
    const capturedDragId = dragId
    endDrag()

    if (isCategory && pos === 'inside') {
      // Drop inside category — move snippet to this category, after last item
      const items = categorized.get(targetId)
      const lastInCategory = items && items.length > 0 ? items[items.length - 1].id : null
      if (lastInCategory) {
        moveSnippet(capturedDragId, lastInCategory, 'after')
      } else {
        // Empty category — just change tags
        updateSnippetTags(capturedDragId, [targetId])
      }
    } else if (isCategory) {
      // before/after a category header — find first/last snippet in that category
      const items = categorized.get(targetId)
      if (pos === 'before' && items && items.length > 0) {
        moveSnippet(capturedDragId, items[0].id, 'before')
      } else if (pos === 'after' && items && items.length > 0) {
        moveSnippet(capturedDragId, items[items.length - 1].id, 'after')
      }
    } else {
      // Drop before/after a snippet
      moveSnippet(capturedDragId, targetId, pos)
    }
  }

  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!dragId) return
    const capturedDragId = dragId
    endDrag()
    // Move to uncategorized, at end
    const last = uncategorized.length > 0 ? uncategorized[uncategorized.length - 1].id : null
    if (last && last !== capturedDragId) {
      moveSnippet(capturedDragId, last, 'after')
    } else {
      updateSnippetTags(capturedDragId, [])
    }
  }

  function endDrag() {
    setDragId(null); setOverId(null); setOverPos(null)
    // Clear cross-iframe snippet drag state
    const store = useFrameStore.getState()
    store.setSnippetDragFrame(null)
    store.setCanvasDrag(null)
    store.setCanvasDragOver(null)
  }

  const isRootOver = overId === '__root__'
  const hasContent = snippets.length > 0 || allTags.length > 0

  return (
    <div
      className="h-full flex flex-col overflow-y-auto py-1 px-1"
      onDragOver={(e) => { if (dragId) e.preventDefault() }}
      onDrop={handleRootDrop}
    >
      {/* Root "Snippets" node — always visible, permanent drop target (like Body in Elements) */}
      <div
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
          isRootOver
            ? 'bg-[var(--color-focus)]/10 outline outline-1 outline-[var(--color-focus)]/40'
            : highlightId === '__snippets_root__'
              ? 'tree-node-selected text-text-primary'
              : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: 4 }}
        onClick={() => { if (!dragId) setHighlightId('__snippets_root__') }}
        onDragOver={(e) => {
          if (!dragId) return
          e.preventDefault()
          e.stopPropagation()
          e.dataTransfer.dropEffect = 'move'
          setOverId('__root__')
          setOverPos('inside')
        }}
        onDragLeave={() => { if (overId === '__root__') { setOverId(null); setOverPos(null) } }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!dragId) return
          const capturedDragId = dragId
          endDrag()
          const last = uncategorized.length > 0 ? uncategorized[uncategorized.length - 1].id : null
          if (last && last !== capturedDragId) {
            moveSnippet(capturedDragId, last, 'after')
          } else {
            updateSnippetTags(capturedDragId, [])
          }
        }}
      >
        <span
          className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none cursor-pointer"
          onClick={() => setRootCollapsed((p) => !p)}
        >
          {hasContent ? (rootCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />) : null}
        </span>
        <span className="shrink-0 text-blue-400"><Folder size={12} /></span>
        <span className="flex-1 text-[12px] truncate">Snippets</span>
      </div>

      {!rootCollapsed && (
        <>
          {/* Uncategorized snippets (depth 1) */}
          {uncategorized.map((s) => (
            <SnippetRow
              key={s.id}
              snippet={s}
              depth={1}
              isEditing={editingId === s.id}
              editValue={editValue}
              isDragging={dragId === s.id}
              isOver={overId === s.id}
              overPosition={overId === s.id ? overPos : null}
              isHighlighted={highlightId === s.id}
              onClick={() => setHighlightId(s.id)}
              onEditChange={setEditValue}
              onEditCommit={commitSnippetRename}
              onEditCancel={() => setEditingId(null)}
              onDoubleClick={() => startSnippetRename(s)}
              onContextMenu={(x, y) => setContextMenu({ x, y, type: 'snippet', snippet: s })}
              onDragStart={(e) => handleDragStart(e, s.id)}
              onDragOver={(e) => handleDragOver(e, s.id, false)}
              onDragLeave={() => handleDragLeave(s.id)}
              onDrop={(e) => handleDrop(e, s.id, false)}
              onDragEnd={endDrag}
              onInsert={() => handleInsert(s)}
              onDelete={() => deleteSnippet(s.id)}
            />
          ))}

          {/* Categories (depth 1, children at depth 2) */}
          {allTags.map((tag) => {
            const items = categorized.get(tag) || []
            const isCollapsed = collapsedTags.has(tag)
            const isEditingCat = editingCategoryTag === tag
            const catId = `__cat:${tag}`
            const isCatOver = overId === catId
            const catOverPos = isCatOver ? overPos : null
            const isCatSelected = highlightId === catId
            const isDraggingCat = dragId?.startsWith('__cat:')
            const isCatDragging = dragId === catId

            return (
              <div key={tag} className="relative">
                {/* Drop indicators for category reorder */}
                {isCatOver && catOverPos === 'before' && (
                  <div className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 1 * 16 + 4 }} />
                )}
                {isCatOver && catOverPos === 'after' && (
                  <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 1 * 16 + 4 }} />
                )}

                {/* Category row */}
                <div
                  draggable={!isEditingCat}
                  className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
                    isCatOver && catOverPos === 'inside'
                      ? 'bg-[var(--color-focus)]/10 outline outline-1 outline-[var(--color-focus)]/40'
                      : isCatSelected
                        ? 'tree-node-selected text-text-primary'
                        : isCatDragging ? 'opacity-40' : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
                  }`}
                  style={{ paddingLeft: 1 * 16 + 4 }}
                  onClick={() => { if (!dragId) setHighlightId(catId) }}
                  onDragStart={(e) => {
                    e.stopPropagation()
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', catId)
                    setDragId(catId)
                  }}
                  onDragOver={(e) => {
                    if (!dragId || dragId === catId) return
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    // Dragging a category → show before/after; dragging a snippet → always inside
                    if (isDraggingCat) {
                      const pos = getDropPos(e, e.currentTarget as HTMLElement, true)
                      setOverId(catId)
                      setOverPos(pos === 'inside' ? 'inside' : pos)
                    } else {
                      setOverId(catId)
                      setOverPos('inside')
                    }
                  }}
                  onDragLeave={() => { if (overId === catId) { setOverId(null); setOverPos(null) } }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (!dragId) return
                    // Capture drag info before clearing state
                    const wasDraggingCat = isDraggingCat
                    const capturedDragId = dragId
                    const pos = getDropPos(e, e.currentTarget as HTMLElement, true)
                    // Clear DnD visual state FIRST (before store updates trigger re-renders)
                    endDrag()
                    if (wasDraggingCat) {
                      // Category-on-category: reorder
                      const dragTag = capturedDragId.slice('__cat:'.length)
                      if (pos === 'inside') {
                        moveCategory(dragTag, tag, 'after')
                      } else {
                        moveCategory(dragTag, tag, pos as 'before' | 'after')
                      }
                    } else {
                      // Snippet into this category
                      const last = items.length > 0 ? items[items.length - 1].id : null
                      if (last && last !== capturedDragId) {
                        moveSnippet(capturedDragId, last, 'after')
                      } else {
                        updateSnippetTags(capturedDragId, [tag])
                      }
                    }
                  }}
                  onDragEnd={endDrag}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'category', tag })
                  }}
                >
                  <span
                    className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleTag(tag) }}
                  >
                    {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                  </span>

                  <span className="shrink-0 text-text-muted"><Folder size={12} /></span>

                  {isEditingCat ? (
                    <input
                      autoFocus
                      value={editCategoryValue}
                      onChange={(e) => setEditCategoryValue(e.target.value)}
                      onBlur={commitCategoryRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitCategoryRename()
                        if (e.key === 'Escape') setEditingCategoryTag(null)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
                    />
                  ) : (
                    <span
                      className="flex-1 text-[12px] truncate cursor-default"
                      onDoubleClick={(e) => { e.stopPropagation(); startCategoryRename(tag) }}
                    >
                      {tag}
                    </span>
                  )}

                  {/* Delete on hover */}
                  <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                      className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
                      onClick={(e) => { e.stopPropagation(); deleteCategory(tag) }}
                      title="Delete category"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>

                {/* Children (depth 2) */}
                {!isCollapsed && items.map((s) => (
                  <SnippetRow
                    key={s.id}
                    snippet={s}
                    depth={2}
                    isEditing={editingId === s.id}
                    editValue={editValue}
                    isDragging={dragId === s.id}
                    isOver={overId === s.id}
                    overPosition={overId === s.id ? overPos : null}
                    isHighlighted={highlightId === s.id}
                    onClick={() => setHighlightId(s.id)}
                    onEditChange={setEditValue}
                    onEditCommit={commitSnippetRename}
                    onEditCancel={() => setEditingId(null)}
                    onDoubleClick={() => startSnippetRename(s)}
                    onContextMenu={(x, y) => setContextMenu({ x, y, type: 'snippet', snippet: s })}
                    onDragStart={(e) => handleDragStart(e, s.id)}
                    onDragOver={(e) => handleDragOver(e, s.id, false)}
                    onDragLeave={() => handleDragLeave(s.id)}
                    onDrop={(e) => handleDrop(e, s.id, false)}
                    onDragEnd={endDrag}
                    onInsert={() => handleInsert(s)}
                    onDelete={() => deleteSnippet(s.id)}
                  />
                ))}
              </div>
            )
          })}

          {/* New category being created */}
          {editingCategoryTag === '__new__' && (
            <div className="flex items-center gap-1.5 py-1 px-1" style={{ paddingLeft: 1 * 16 + 4 }}>
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

          {snippets.length === 0 && allTags.length === 0 && (
            <div className="px-3 py-4 text-[11px] text-text-muted text-center">
              No snippets yet. Select an element and save it as a snippet.
            </div>
          )}
        </>
      )}

      {/* Snippet context menu */}
      {contextMenu && contextMenu.type === 'snippet' && (
        <div
          className="fixed c-menu-popup min-w-[160px] z-[9999]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="c-menu-item" onClick={() => { handleInsert(contextMenu.snippet); setContextMenu(null) }}>
            <Plus size={12} /> Insert
          </button>
          <button className="c-menu-item" onClick={() => { startSnippetRename(contextMenu.snippet); setContextMenu(null) }}>
            <Pencil size={12} /> Rename
          </button>
          <div className="border-t border-border my-1" />
          <button className="c-menu-item text-destructive" onClick={() => { deleteSnippet(contextMenu.snippet.id); setContextMenu(null) }}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Category context menu */}
      {contextMenu && contextMenu.type === 'category' && (
        <div
          className="fixed c-menu-popup min-w-[140px] z-[9999]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="c-menu-item" onClick={() => { startCategoryRename(contextMenu.tag); setContextMenu(null) }}>
            <Pencil size={12} /> Rename
          </button>
          <button className="c-menu-item text-destructive" onClick={() => { deleteCategory(contextMenu.tag); setContextMenu(null) }}>
            <Trash2 size={12} /> Delete category
          </button>
        </div>
      )}
    </div>
  )
})

// --- Snippet row with drop indicators (mirrors TreeNode) ---
function SnippetRow({
  snippet, depth, isEditing, editValue, isDragging,
  isOver, overPosition, isHighlighted,
  onClick, onEditChange, onEditCommit, onEditCancel, onDoubleClick,
  onContextMenu, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onInsert, onDelete,
}: {
  snippet: Snippet
  depth: number
  isEditing: boolean
  editValue: string
  isDragging: boolean
  isOver: boolean
  overPosition: DropPosition | null
  isHighlighted: boolean
  onClick: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDoubleClick: () => void
  onContextMenu: (x: number, y: number) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onInsert: () => void
  onDelete: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isHighlighted && rowRef.current) {
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isHighlighted])

  return (
    <div
      ref={rowRef}
      className="relative"
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Drop indicators — pointer-events-none so drag events pass through */}
      {isOver && overPosition === 'before' && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: depth * 16 + 4 }} />
      )}
      {isOver && overPosition === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: depth * 16 + 4 }} />
      )}

      <div
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
          isHighlighted
            ? 'tree-node-selected text-text-primary'
            : isDragging ? 'opacity-40' : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={onClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e.clientX, e.clientY) }}
      >
        <span className="w-3.5 h-4 shrink-0" />
        <span className="shrink-0 text-text-muted"><Code size={12} /></span>

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
            className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
          />
        ) : (
          <span className="flex-1 text-[12px] truncate" onDoubleClick={onDoubleClick}>{snippet.name}</span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            className="w-4 h-4 c-icon-btn text-[10px] hover:text-accent hover:bg-accent/10"
            onClick={(e) => { e.stopPropagation(); onInsert() }}
            title="Insert"
          >
            <Plus size={12} />
          </button>
          <button
            className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="Delete"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}
