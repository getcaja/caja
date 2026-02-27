import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { Plus, X, ChevronRight, ChevronDown, Code, Folder } from 'lucide-react'
import type { Pattern } from '../../types/pattern'
import { PatternPreview } from './PatternPreview'
import { usePatternsData } from './usePatternsData'
import { PatternContextMenu } from './PatternContextMenu'
import { createDragHandlers, getDropPos, type DropPosition } from './PatternDragDrop'

export type PatternSource =
  | { type: 'internal' }
  | { type: 'library'; libraryId: string }

export interface PatternsPanelHandle {
  createCategory: () => void
}

interface PatternsPanelProps {
  source?: PatternSource
}

export const PatternsPanel = forwardRef<PatternsPanelHandle, PatternsPanelProps>(function PatternsPanel({ source = { type: 'internal' } }, ref) {
  const {
    patterns, readOnly, sourceName, root, selectedId, insertFrame,
    highlightId, setHighlightId, emptyCategories, deletePattern,
    renamePattern, updatePatternTags, movePattern, addEmptyCategory,
    removeEmptyCategory, moveCategory,
  } = usePatternsData(source)

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

  // Pattern hover preview
  const [previewPattern, setPreviewPattern] = useState<Pattern | null>(null)
  const [previewY, setPreviewY] = useState(0)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const cancelLeave = useCallback(() => {
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null }
  }, [])

  const onPreviewEnter = useCallback((pattern: Pattern, y: number) => {
    cancelLeave()
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      setPreviewPattern(pattern)
      setPreviewY(y)
    }, 300)
  }, [cancelLeave])

  const onPreviewLeave = useCallback(() => {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    leaveTimerRef.current = setTimeout(() => {
      setPreviewPattern(null)
    }, 150)
  }, [])

  const onPreviewPopupEnter = useCallback(() => {
    cancelLeave()
  }, [cancelLeave])

  const onPreviewPopupLeave = useCallback(() => {
    leaveTimerRef.current = setTimeout(() => {
      setPreviewPattern(null)
    }, 150)
  }, [])

  function handlePreviewInsert() {
    if (!previewPattern) return
    handleInsert(previewPattern)
    cancelLeave()
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    setPreviewPattern(null)
  }

  function handlePreviewClose() {
    cancelLeave()
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    setPreviewPattern(null)
  }

  // Clear preview during drag
  useEffect(() => {
    if (dragId) onPreviewLeave()
  }, [dragId, onPreviewLeave])

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

  // DnD handlers (extracted)
  const dnd = createDragHandlers(readOnly, patterns, source, dragId, overId, setDragId, setOverId, setOverPos)

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

  const isRootOver = overId === '__root__'
  const hasContent = patterns.length > 0 || allTags.length > 0

  const panelRight = panelRef.current ? panelRef.current.getBoundingClientRect().right : 280

  return (
    <div
      ref={panelRef}
      className="h-full flex flex-col overflow-y-auto py-1 px-1"
      onDragOver={(e) => { if (dragId) e.preventDefault() }}
      onDrop={(e) => dnd.handleRootDrop(e, { uncategorized, movePattern, updatePatternTags })}
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
          dnd.endDrag()
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
              onDragStart={(e) => dnd.handleDragStart(e, s.id)}
              onDragOver={readOnly ? undefined : (e) => dnd.handleDragOver(e, s.id, false)}
              onDragLeave={readOnly ? undefined : () => dnd.handleDragLeave(s.id)}
              onDrop={readOnly ? undefined : (e) => dnd.handleDrop(e, s.id, false, { categorized, movePattern, updatePatternTags })}
              onDragEnd={dnd.endDrag}
              onInsert={() => handleInsert(s)}
              onDelete={readOnly ? undefined : () => deletePattern(s.id)}
              onPreviewEnter={onPreviewEnter}
              onPreviewLeave={onPreviewLeave}
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
                    dnd.endDrag()
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
                  onDragEnd={dnd.endDrag}
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
                    onDragStart={(e) => dnd.handleDragStart(e, s.id)}
                    onDragOver={readOnly ? undefined : (e) => dnd.handleDragOver(e, s.id, false)}
                    onDragLeave={readOnly ? undefined : () => dnd.handleDragLeave(s.id)}
                    onDrop={readOnly ? undefined : (e) => dnd.handleDrop(e, s.id, false, { categorized, movePattern, updatePatternTags })}
                    onDragEnd={dnd.endDrag}
                    onInsert={() => handleInsert(s)}
                    onDelete={readOnly ? undefined : () => deletePattern(s.id)}
                    onPreviewEnter={onPreviewEnter}
                    onPreviewLeave={onPreviewLeave}
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
      {contextMenu && <div className="fixed inset-0 z-40" onClick={closeContext} onContextMenu={(e) => { e.preventDefault(); closeContext() }} />}
      {contextMenu && (
        <PatternContextMenu
          contextMenu={contextMenu}
          readOnly={readOnly}
          onInsert={handleInsert}
          onRename={startPatternRename}
          onDelete={(id) => deletePattern(id)}
          onCategoryRename={startCategoryRename}
          onCategoryDelete={deleteCategory}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Pattern hover preview — always mounted, iframe persists */}
      <PatternPreview
        frame={previewPattern?.frame ?? null}
        name={previewPattern?.name ?? ''}
        sourceName={sourceName}
        anchorY={previewY}
        panelRight={panelRight}
        onInsert={handlePreviewInsert}
        onClose={handlePreviewClose}
        onPopupEnter={onPreviewPopupEnter}
        onPopupLeave={onPreviewPopupLeave}
      />
    </div>
  )
})

// --- Pattern row with drop indicators (mirrors TreeNode) ---
function PatternRow({
  pattern, depth, readOnly, isEditing, editValue, isDragging,
  isOver, overPosition, isHighlighted,
  onClick, onEditChange, onEditCommit, onEditCancel, onDoubleClick,
  onContextMenu, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onInsert, onDelete, onPreviewEnter, onPreviewLeave,
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
  onPreviewEnter?: (pattern: Pattern, y: number) => void
  onPreviewLeave?: () => void
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
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onPreviewEnter?.(pattern, rect.top)
      }}
      onMouseLeave={() => onPreviewLeave?.()}
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
