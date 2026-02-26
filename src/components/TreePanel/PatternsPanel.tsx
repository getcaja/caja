import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { Plus, X, Trash2, ChevronRight, ChevronDown, Code, Folder, Pencil } from 'lucide-react'
import type { Pattern } from '../../types/pattern'

export type PatternSource =
  | { type: 'internal' }
  | { type: 'library'; libraryId: string }

export interface PatternsPanelHandle {
  createCategory: () => void
}

interface PatternsPanelProps {
  source?: PatternSource
}

type DropPosition = 'before' | 'after' | 'inside'

export const PatternsPanel = forwardRef<PatternsPanelHandle, PatternsPanelProps>(function PatternsPanel({ source = { type: 'internal' } }, ref) {
  const userPatterns = useCatalogStore((s) => s.patterns)
  const highlightId = useCatalogStore((s) => s.highlightId)
  const setHighlightId = useCatalogStore((s) => s.setHighlightId)
  const order = useCatalogStore((s) => s.order)
  const emptyCategories = useCatalogStore((s) => s.emptyCategories)
  const deletePattern = useCatalogStore((s) => s.deletePattern)
  const renamePattern = useCatalogStore((s) => s.renamePattern)
  const updatePatternTags = useCatalogStore((s) => s.updatePatternTags)
  const movePattern = useCatalogStore((s) => s.movePattern)
  const addEmptyCategory = useCatalogStore((s) => s.addEmptyCategory)
  const removeEmptyCategory = useCatalogStore((s) => s.removeEmptyCategory)
  const moveCategory = useCatalogStore((s) => s.moveCategory)
  const libraries = useCatalogStore((s) => s.libraries)

  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const insertFrame = useFrameStore((s) => s.insertFrame)

  const readOnly = source.type === 'library'

  const patterns = useMemo(() => {
    if (source.type === 'library') {
      return useCatalogStore.getState().getLibraryPatterns(source.libraryId)
    }
    return useCatalogStore.getState().allPatterns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.type, source.type === 'library' ? source.libraryId : null, userPatterns, order, libraries])

  const [rootCollapsed, setRootCollapsed] = useState(false)
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingCategoryTag, setEditingCategoryTag] = useState<string | null>(null)
  const [editCategoryValue, setEditCategoryValue] = useState('')
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; type: 'pattern'; pattern: Pattern }
    | { x: number; y: number; type: 'category'; tag: string }
    | null
  >(null)

  // DnD state
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overPos, setOverPos] = useState<DropPosition | null>(null)

  // Group: uncategorized at root, then by first tag (preserving order)
  const { categorized, uncategorized, allTags } = useMemo(() => {
    const map = new Map<string, Pattern[]>()
    const uncat: Pattern[] = []
    const tagOrder: string[] = []
    for (const s of patterns) {
      if (s.tags.length === 0) {
        uncat.push(s)
      } else {
        const tag = s.tags[0]
        if (!map.has(tag)) { map.set(tag, []); tagOrder.push(tag) }
        map.get(tag)!.push(s)
      }
    }
    // Append empty categories (manually created, no patterns yet)
    for (const cat of emptyCategories) {
      if (!map.has(cat)) { map.set(cat, []); tagOrder.push(cat) }
    }
    return { categorized: map, uncategorized: uncat, allTags: tagOrder }
  }, [patterns, emptyCategories])

  function getInsertParent(): string {
    if (selectedId) {
      const sel = findInTree(root, selectedId)
      if (sel?.type === 'box') return sel.id
    }
    return root.id
  }

  function handleInsert(pattern: Pattern) {
    const origin = { libraryId: source.type === 'library' ? source.libraryId : 'internal', patternId: pattern.id }
    insertFrame(getInsertParent(), pattern.frame, origin)
  }

  function toggleTag(tag: string) {
    setCollapsedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function startPatternRename(pattern: Pattern) {
    setEditingId(pattern.id)
    setEditValue(pattern.name)
  }
  function commitPatternRename() {
    if (editingId && editValue.trim()) renamePattern(editingId, editValue.trim())
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
      for (const s of patterns) {
        if (s.tags[0] === editingCategoryTag) {
          updatePatternTags(s.id, [name, ...s.tags.slice(1)])
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
    for (const s of patterns) {
      if (s.tags[0] === tag) {
        updatePatternTags(s.id, s.tags.slice(1))
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
    e.dataTransfer.effectAllowed = readOnly ? 'copy' : 'copyMove'
    e.dataTransfer.setData('text/plain', id)
    if (!readOnly) setDragId(id)

    // Set pattern drag frame + origin + sentinel canvasDragId for cross-iframe DnD
    const pattern = patterns.find((s) => s.id === id)
    if (pattern) {
      const origin = { libraryId: source.type === 'library' ? source.libraryId : 'internal', patternId: pattern.id }
      useFrameStore.getState().setPatternDragFrame(pattern.frame, origin)
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
      // Drop inside category — move pattern to this category, after last item
      const items = categorized.get(targetId)
      const lastInCategory = items && items.length > 0 ? items[items.length - 1].id : null
      if (lastInCategory) {
        movePattern(capturedDragId, lastInCategory, 'after')
      } else {
        // Empty category — just change tags
        updatePatternTags(capturedDragId, [targetId])
      }
    } else if (isCategory) {
      // before/after a category header — find first/last pattern in that category
      const items = categorized.get(targetId)
      if (pos === 'before' && items && items.length > 0) {
        movePattern(capturedDragId, items[0].id, 'before')
      } else if (pos === 'after' && items && items.length > 0) {
        movePattern(capturedDragId, items[items.length - 1].id, 'after')
      }
    } else {
      // Drop before/after a pattern
      movePattern(capturedDragId, targetId, pos)
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
      movePattern(capturedDragId, last, 'after')
    } else {
      updatePatternTags(capturedDragId, [])
    }
  }

  function endDrag() {
    setDragId(null); setOverId(null); setOverPos(null)
    // Clear cross-iframe pattern drag state
    const store = useFrameStore.getState()
    store.setPatternDragFrame(null)
    store.setCanvasDrag(null)
    store.setCanvasDragOver(null)
  }

  const isRootOver = overId === '__root__'
  const hasContent = patterns.length > 0 || allTags.length > 0

  return (
    <div
      className="h-full flex flex-col overflow-y-auto py-1 px-1"
      onDragOver={(e) => { if (dragId) e.preventDefault() }}
      onDrop={handleRootDrop}
    >
      {/* Root "Patterns" node — visible only when there's content */}
      {hasContent && <div
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
          isRootOver
            ? 'bg-[var(--color-focus)]/10 outline outline-1 outline-[var(--color-focus)]/40'
            : highlightId === '__patterns_root__'
              ? 'tree-node-selected text-text-primary'
              : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: 4 }}
        onClick={() => { if (!dragId) setHighlightId('__patterns_root__') }}
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
            movePattern(capturedDragId, last, 'after')
          } else {
            updatePatternTags(capturedDragId, [])
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
        <span className="flex-1 text-[12px] truncate">Patterns</span>
      </div>}

      {hasContent && !rootCollapsed && (
        <>
          {/* Uncategorized patterns (depth 1) */}
          {uncategorized.map((s) => (
            <PatternRow
              key={s.id}
              pattern={s}
              depth={1}
              readOnly={readOnly}
              isEditing={!readOnly && editingId === s.id}
              editValue={editValue}
              isDragging={dragId === s.id}
              isOver={overId === s.id}
              overPosition={overId === s.id ? overPos : null}
              isHighlighted={highlightId === s.id}
              onClick={() => setHighlightId(s.id)}
              onEditChange={setEditValue}
              onEditCommit={commitPatternRename}
              onEditCancel={() => setEditingId(null)}
              onDoubleClick={() => { if (!readOnly) startPatternRename(s) }}
              onContextMenu={(x, y) => setContextMenu({ x, y, type: 'pattern', pattern: s })}
              onDragStart={(e) => handleDragStart(e, s.id)}
              onDragOver={readOnly ? undefined : (e) => handleDragOver(e, s.id, false)}
              onDragLeave={readOnly ? undefined : () => handleDragLeave(s.id)}
              onDrop={readOnly ? undefined : (e) => handleDrop(e, s.id, false)}
              onDragEnd={endDrag}
              onInsert={() => handleInsert(s)}
              onDelete={readOnly ? undefined : () => deletePattern(s.id)}
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
                  draggable={!readOnly && !isEditingCat}
                  className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
                    isCatOver && catOverPos === 'inside'
                      ? 'bg-[var(--color-focus)]/10 outline outline-1 outline-[var(--color-focus)]/40'
                      : isCatSelected
                        ? 'tree-node-selected text-text-primary'
                        : isCatDragging ? 'opacity-40' : 'hover:bg-[var(--color-focus)]/8 text-text-secondary hover:text-text-primary'
                  }`}
                  style={{ paddingLeft: 1 * 16 + 4 }}
                  onClick={() => { if (!dragId) setHighlightId(catId) }}
                  onDragStart={readOnly ? undefined : (e) => {
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
                    // Dragging a category → show before/after; dragging a pattern → always inside
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
                      // Pattern into this category
                      const last = items.length > 0 ? items[items.length - 1].id : null
                      if (last && last !== capturedDragId) {
                        movePattern(capturedDragId, last, 'after')
                      } else {
                        updatePatternTags(capturedDragId, [tag])
                      }
                    }
                  }}
                  onDragEnd={endDrag}
                  onContextMenu={readOnly ? undefined : (e) => {
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
                      onDoubleClick={readOnly ? undefined : (e) => { e.stopPropagation(); startCategoryRename(tag) }}
                    >
                      {tag}
                    </span>
                  )}

                  {/* Delete on hover */}
                  {!readOnly && (
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
                        onClick={(e) => { e.stopPropagation(); deleteCategory(tag) }}
                        title="Delete category"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Children (depth 2) */}
                {!isCollapsed && items.map((s) => (
                  <PatternRow
                    key={s.id}
                    pattern={s}
                    depth={2}
                    readOnly={readOnly}
                    isEditing={!readOnly && editingId === s.id}
                    editValue={editValue}
                    isDragging={dragId === s.id}
                    isOver={overId === s.id}
                    overPosition={overId === s.id ? overPos : null}
                    isHighlighted={highlightId === s.id}
                    onClick={() => setHighlightId(s.id)}
                    onEditChange={setEditValue}
                    onEditCommit={commitPatternRename}
                    onEditCancel={() => setEditingId(null)}
                    onDoubleClick={() => { if (!readOnly) startPatternRename(s) }}
                    onContextMenu={(x, y) => setContextMenu({ x, y, type: 'pattern', pattern: s })}
                    onDragStart={(e) => handleDragStart(e, s.id)}
                    onDragOver={readOnly ? undefined : (e) => handleDragOver(e, s.id, false)}
                    onDragLeave={readOnly ? undefined : () => handleDragLeave(s.id)}
                    onDrop={readOnly ? undefined : (e) => handleDrop(e, s.id, false)}
                    onDragEnd={endDrag}
                    onInsert={() => handleInsert(s)}
                    onDelete={readOnly ? undefined : () => deletePattern(s.id)}
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

        </>
      )}

      {!hasContent && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-muted text-[12px]">
            {readOnly ? 'This library has no patterns.' : 'No patterns yet'}
          </span>
        </div>
      )}

      {/* Pattern context menu */}
      {contextMenu && contextMenu.type === 'pattern' && (
        <div
          className="fixed c-menu-popup min-w-[160px] z-[9999]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="c-menu-item" onClick={() => { handleInsert(contextMenu.pattern); setContextMenu(null) }}>
            <Plus size={12} /> Insert
          </button>
          {!readOnly && (
            <>
              <button className="c-menu-item" onClick={() => { startPatternRename(contextMenu.pattern); setContextMenu(null) }}>
                <Pencil size={12} /> Rename
              </button>
              <div className="border-t border-border my-1" />
              <button className="c-menu-item text-destructive" onClick={() => { deletePattern(contextMenu.pattern.id); setContextMenu(null) }}>
                <Trash2 size={12} /> Delete
              </button>
            </>
          )}
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

// --- Pattern row with drop indicators (mirrors TreeNode) ---
function PatternRow({
  pattern, depth, readOnly, isEditing, editValue, isDragging,
  isOver, overPosition, isHighlighted,
  onClick, onEditChange, onEditCommit, onEditCancel, onDoubleClick,
  onContextMenu, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onInsert, onDelete,
}: {
  pattern: Pattern
  depth: number
  readOnly?: boolean
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
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd: () => void
  onInsert: () => void
  onDelete?: () => void
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
          <span className="flex-1 text-[12px] truncate" onDoubleClick={onDoubleClick}>{pattern.name}</span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            className="w-4 h-4 c-icon-btn text-[10px] hover:text-accent hover:bg-accent/10"
            onClick={(e) => { e.stopPropagation(); onInsert() }}
            title="Insert"
          >
            <Plus size={12} />
          </button>
          {!readOnly && onDelete && (
            <button
              className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              title="Delete"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
