import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { frameToClasses } from '../../utils/frameToClasses'
import { Section } from '../ui/Section'
import { TAILWIND_CLASSES } from '../../data/tailwindClasses'

const MAX_SUGGESTIONS = 8

function ClassPill({
  label,
  computed,
  onRemove,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  label: string
  computed?: boolean
  onRemove?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragOver?: boolean
}) {
  return (
    <span
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`c-pill ${
        computed
          ? 'bg-surface-2 text-text-muted'
          : 'bg-surface-3 text-text-primary'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragOver ? 'ring-1 ring-text-muted' : ''
      }`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive text-current opacity-70 hover:opacity-100"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

function getSuggestions(draft: string, existingClasses: Set<string>): string[] {
  if (!draft) return []

  // Parse variant prefix (e.g., "hover:" or "hover:focus:")
  const variantMatch = draft.match(/^((?:[a-z0-9]+:)+)(.*)$/)
  const prefix = variantMatch?.[1] ?? ''
  const search = variantMatch?.[2] ?? draft

  // If they just typed a variant prefix with no search yet, show all classes with that prefix
  // But still need a search term to avoid showing 280 items
  if (!search) return []

  const searchLower = search.toLowerCase()

  // Partition into prefix matches and substring matches
  const prefixMatches: string[] = []
  const substringMatches: string[] = []

  for (const cls of TAILWIND_CLASSES) {
    const full = prefix + cls
    if (existingClasses.has(full)) continue

    if (cls.startsWith(searchLower)) {
      prefixMatches.push(full)
    } else if (cls.includes(searchLower)) {
      substringMatches.push(full)
    }
  }

  return [...prefixMatches, ...substringMatches].slice(0, MAX_SUGGESTIONS)
}

export function AdvancedSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const manualClasses = frame.tailwindClasses.split(' ').filter(Boolean)
  const manualSet = useMemo(() => new Set(manualClasses), [manualClasses.join(' ')])
  const computedClasses = frameToClasses(frame).split(' ').filter(Boolean).filter((c) => !manualSet.has(c))
  const allText = [...computedClasses, ...manualClasses].join(' ')

  const existingSet = useMemo(
    () => new Set([...computedClasses, ...manualClasses]),
    [computedClasses.join(' '), manualClasses.join(' ')],
  )

  const suggestions = useMemo(
    () => getSuggestions(draft, existingSet),
    [draft, existingSet],
  )

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIdx(0)
  }, [suggestions])

  // Show suggestions when there are results and draft is non-empty
  useEffect(() => {
    setShowSuggestions(suggestions.length > 0 && draft.length > 0)
  }, [suggestions, draft])

  const copyAll = () => {
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const addClasses = useCallback((raw: string) => {
    const newCls = raw.split(/\s+/).filter(Boolean)
    if (newCls.length === 0) return
    const existing = new Set(manualClasses)
    const toAdd = newCls.filter((c) => !existing.has(c))
    if (toAdd.length === 0) return
    updateFrame(frame.id, { tailwindClasses: [...manualClasses, ...toAdd].join(' ') })
  }, [manualClasses, updateFrame, frame.id])

  const removeClass = (cls: string) => {
    updateFrame(frame.id, { tailwindClasses: manualClasses.filter((c) => c !== cls).join(' ') })
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const arr = [...manualClasses]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    updateFrame(frame.id, { tailwindClasses: arr.join(' ') })
  }

  const selectSuggestion = useCallback((cls: string) => {
    addClasses(cls)
    setDraft('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [addClasses])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectSuggestion(suggestions[selectedIdx])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      addClasses(draft)
      setDraft('')
    }
    if (e.key === 'Backspace' && draft === '' && manualClasses.length > 0) {
      removeClass(manualClasses[manualClasses.length - 1])
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur()
    }
  }

  // Scroll selected suggestion into view
  useEffect(() => {
    if (!showSuggestions || !suggestionsRef.current) return
    const item = suggestionsRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showSuggestions])

  return (
    <Section title="Classes" defaultCollapsed>
      <div className="flex flex-col gap-2">
        <div className="relative">
          <div
            className="c-input px-1.5 py-1.5 flex flex-wrap gap-1 min-h-[32px] cursor-text"
            onClick={() => inputRef.current?.focus()}
            onDragOver={(e) => e.preventDefault()}
          >
            {computedClasses.map((cls, i) => (
              <ClassPill key={`c-${i}`} label={cls} computed />
            ))}
            {manualClasses.map((cls, i) => (
              <ClassPill
                key={`m-${i}-${cls}`}
                label={cls}
                onRemove={() => removeClass(cls)}
                draggable
                isDragOver={overIdx === i && dragIdx !== i}
                onDragStart={(e) => {
                  setDragIdx(i)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOverIdx(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (dragIdx !== null) reorder(dragIdx, i)
                  setDragIdx(null)
                  setOverIdx(null)
                }}
              />
            ))}
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Delay to allow click on suggestion before blur fires
                setTimeout(() => {
                  if (draft.trim()) { addClasses(draft); setDraft('') }
                  setShowSuggestions(false)
                }, 150)
              }}
              onFocus={() => {
                if (suggestions.length > 0 && draft.length > 0) setShowSuggestions(true)
              }}
              placeholder={manualClasses.length === 0 && computedClasses.length === 0 ? 'Add classes...' : ''}
              className="flex-1 min-w-[60px] bg-transparent text-[11px] text-text-primary placeholder:text-text-muted outline-none py-0.5"
            />
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
            >
              {suggestions.map((cls, i) => (
                <button
                  key={cls}
                  onMouseDown={(e) => {
                    e.preventDefault() // prevent blur
                    selectSuggestion(cls)
                  }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] cursor-pointer ${
                    i === selectedIdx
                      ? 'bg-surface-3/60 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}
        </div>

        {allText && (
          <button
            onClick={copyAll}
            className="self-start flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text-primary rounded hover:bg-surface-2"
          >
            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
          </button>
        )}
      </div>
    </Section>
  )
}
