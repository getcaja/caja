import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { Plus, X, ChevronRight, ChevronDown, Code, Folder } from 'lucide-react'
import type { Pattern } from '../../types/pattern'
import { PatternPreview } from './PatternPreview'
import { usePatternsData } from './usePatternsData'
import { PatternContextMenu } from './PatternContextMenu'
import { useWorkspaceDnd } from './WorkspaceDndContext'
import type { DropPosition } from './dndUtils'

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

  const { activeId: dragId } = useWorkspaceDnd()

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
  const { uncategorized, allTags, categorized } = useMemo(() => {
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
      if (!allTags.includes(name)) {
        addEmptyCategory(name)
      }
    } else if (editingCategoryTag && name !== editingCategoryTag) {
      for (const s of patterns) {
        if (s.tags[0] === editingCategoryTag) {
          updatePatternTags(s.id, [name, ...s.tags.slice(1)])
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

  const closeContext = useCallback(() => setContextMenu(null), [])

  const hasContent = patterns.length > 0 || allTags.length > 0

  const panelRight = panelRef.current ? panelRef.current.getBoundingClientRect().right : 280

  return (
    <div
      ref={panelRef}
      data-pattern-dnd-panel
      className="h-full flex flex-col overflow-y-auto py-1 px-1"
    >
      {/* Root "Patterns" node — visible only when there's content */}
      {hasContent && (
        <RootDroppable
          readOnly={readOnly}
          isHighlighted={highlightId === '__patterns_root__'}
          isCollapsed={rootCollapsed}
          hasContent={hasContent}
          onToggle={() => setRootCollapsed((p) => !p)}
          onClick={() => setHighlightId('__patterns_root__')}
        />
      )}

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
              isHighlighted={highlightId === s.id}
              onClick={() => setHighlightId(s.id)}
              onEditChange={setEditValue}
              onEditCommit={commitPatternRename}
              onEditCancel={() => setEditingId(null)}
              onDoubleClick={() => { if (!readOnly) startPatternRename(s) }}
              onContextMenu={(x, y) => setContextMenu({ x, y, type: 'pattern', pattern: s })}
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

            return (
              <CategoryRow
                key={tag}
                tag={tag}
                items={items}
                readOnly={readOnly}
                isCollapsed={isCollapsed}
                isEditingCat={isEditingCat}
                editCategoryValue={editCategoryValue}
                isHighlighted={highlightId === `__cat:${tag}`}
                onToggle={() => toggleTag(tag)}
                onClick={() => setHighlightId(`__cat:${tag}`)}
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
                  <PatternRow
                    key={s.id}
                    pattern={s}
                    depth={2}
                    readOnly={readOnly}
                    isEditing={!readOnly && editingId === s.id}
                    editValue={editValue}
                    isHighlighted={highlightId === s.id}
                    onClick={() => setHighlightId(s.id)}
                    onEditChange={setEditValue}
                    onEditCommit={commitPatternRename}
                    onEditCancel={() => setEditingId(null)}
                    onDoubleClick={() => { if (!readOnly) startPatternRename(s) }}
                    onContextMenu={(x, y) => setContextMenu({ x, y, type: 'pattern', pattern: s })}
                    onInsert={() => handleInsert(s)}
                    onDelete={readOnly ? undefined : () => deletePattern(s.id)}
                    onPreviewEnter={onPreviewEnter}
                    onPreviewLeave={onPreviewLeave}
                  />
                ))}
              </CategoryRow>
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

/* ── Root droppable node ─────────────────────────────────── */

function RootDroppable({
  readOnly, isHighlighted, isCollapsed, hasContent, onToggle, onClick,
}: {
  readOnly: boolean
  isHighlighted: boolean
  isCollapsed: boolean
  hasContent: boolean
  onToggle: () => void
  onClick: () => void
}) {
  const { activeId, overId, overPosition } = useWorkspaceDnd()

  const { setNodeRef } = useDroppable({
    id: '__patterns_root__',
    disabled: readOnly || !!activeId?.startsWith('__cat:'),
    data: { type: 'root', isBox: true },
  })

  const isOver = overId === '__patterns_root__' && overPosition === 'inside'

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
        isOver
          ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
          : isHighlighted
            ? 'tree-node-selected text-text-primary'
            : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
      }`}
      style={{ paddingLeft: 4 }}
      onClick={onClick}
    >
      <span
        className="w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onToggle() }}
      >
        {hasContent ? (isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />) : null}
      </span>
      <span className="shrink-0"><Folder size={12} /></span>
      <span className="flex-1 text-[12px] truncate">Patterns</span>
    </div>
  )
}

/* ── Category row with DnD ───────────────────────────────── */

function CategoryRow({
  tag, items, readOnly, isCollapsed, isEditingCat, editCategoryValue,
  isHighlighted, onToggle, onClick, onEditChange, onEditCommit, onEditCancel,
  onDoubleClick, onDeleteCategory, onContextMenu, children,
}: {
  tag: string
  items: Pattern[]
  readOnly: boolean
  isCollapsed: boolean
  isEditingCat: boolean
  editCategoryValue: string
  isHighlighted: boolean
  onToggle: () => void
  onClick: () => void
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
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 1 * 16 + 4 }} />
      )}
      {isCatOver && catOverPos === 'after' && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none" style={{ marginLeft: 1 * 16 + 4 }} />
      )}

      {/* Category row */}
      <div
        ref={mergedRef}
        {...dragListeners}
        {...dragAttrs}
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
          isCatOver && catOverPos === 'inside'
            ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
            : isHighlighted
              ? 'tree-node-selected text-text-primary'
              : isDragging ? 'opacity-40' : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
        }`}
        style={{ paddingLeft: 1 * 16 + 4 }}
        onClick={() => { if (!activeId) onClick() }}
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

        {/* Delete on hover */}
        {!readOnly && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
              onClick={(e) => { e.stopPropagation(); onDeleteCategory() }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Delete category"
            >
              <X size={10} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {children}
    </div>
  )
}

/* ── Pattern row with @dnd-kit hooks ─────────────────────── */

function PatternRow({
  pattern, depth, readOnly, isEditing, editValue,
  isHighlighted,
  onClick, onEditChange, onEditCommit, onEditCancel, onDoubleClick,
  onContextMenu, onInsert, onDelete, onPreviewEnter, onPreviewLeave,
}: {
  pattern: Pattern
  depth: number
  readOnly?: boolean
  isEditing: boolean
  editValue: string
  isHighlighted: boolean
  onClick: () => void
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onDoubleClick: () => void
  onContextMenu: (x: number, y: number) => void
  onInsert: () => void
  onDelete?: () => void
  onPreviewEnter?: (pattern: Pattern, y: number) => void
  onPreviewLeave?: () => void
}) {
  const { activeId, overId, overPosition } = useWorkspaceDnd()

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: pattern.id,
    disabled: isEditing,
    data: { type: 'pattern' },
  })

  const { setNodeRef: setDropRef } = useDroppable({
    id: pattern.id,
    disabled: !!readOnly,
    data: { type: 'pattern', tag: pattern.tags[0] ?? null },
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

  const isOver = overId === pattern.id
  const pos = isOver ? overPosition : null

  return (
    <div
      ref={mergedRef}
      {...listeners}
      {...attributes}
      className="relative"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onPreviewEnter?.(pattern, rect.top)
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
        className={`flex items-center gap-1.5 py-1 px-1 rounded-md group transition-all ${
          isHighlighted
            ? 'tree-node-selected text-text-primary'
            : isDragging ? 'opacity-40' : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
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
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 bg-surface-0 border border-accent/50 rounded-md px-1.5 py-0.5 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors"
          />
        ) : (
          <span className="flex-1 text-[12px] truncate" onDoubleClick={onDoubleClick}>{pattern.name}</span>
        )}

        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            className="w-4 h-4 c-icon-btn text-[10px] hover:text-accent hover:bg-accent/10"
            onClick={(e) => { e.stopPropagation(); onInsert() }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Insert"
          >
            <Plus size={12} />
          </button>
          {!readOnly && onDelete && (
            <button
              className="w-4 h-4 c-icon-btn text-[10px] hover:text-text-secondary hover:bg-surface-2/60"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              onPointerDown={(e) => e.stopPropagation()}
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
