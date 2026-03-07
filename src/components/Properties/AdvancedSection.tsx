import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { X, Copy, Check, Plus } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { frameToClasses } from '../../utils/frameToClasses'
import { Section } from '../ui/Section'
import { TAILWIND_CLASSES } from '../../data/tailwindClasses'

const MAX_SUGGESTIONS = 8

function getSuggestions(draft: string, existingClasses: Set<string>): string[] {
  if (!draft) return []

  const variantMatch = draft.match(/^((?:[a-z0-9]+:)+)(.*)$/)
  const prefix = variantMatch?.[1] ?? ''
  const search = variantMatch?.[2] ?? draft

  if (!search) return []

  const searchLower = search.toLowerCase()
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
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropAbove, setDropAbove] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => { setSelectedIdx(0) }, [suggestions])
  useEffect(() => {
    const show = suggestions.length > 0 && draft.length > 0
    if (show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setDropAbove(spaceBelow < 220 && spaceAbove > spaceBelow)
    }
    setShowSuggestions(show)
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

  const selectSuggestion = useCallback((cls: string) => {
    addClasses(cls)
    setDraft('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [addClasses])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length); return }
      if (e.key === 'Enter') { e.preventDefault(); selectSuggestion(suggestions[selectedIdx]); return }
      if (e.key === 'Escape') { e.preventDefault(); setShowSuggestions(false); return }
    }
    if (e.key === 'Enter') { e.preventDefault(); addClasses(draft); setDraft('') }
    if (e.key === 'Escape') { inputRef.current?.blur() }
  }

  useEffect(() => {
    if (!showSuggestions || !suggestionsRef.current || selectedIdx < 0) return
    const container = suggestionsRef.current
    const item = container.children[selectedIdx] as HTMLElement | undefined
    if (!item) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < container.scrollTop) container.scrollTop = top
    else if (bottom > container.scrollTop + container.clientHeight) container.scrollTop = bottom - container.clientHeight
  }, [selectedIdx, showSuggestions])

  return (
    <Section title="Output" defaultCollapsed>
      <div className="flex flex-col gap-2">
        {/* Computed classes — read-only */}
        {computedClasses.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 rounded px-1.5 py-1 flex flex-wrap gap-1 min-h-[24px]" style={{ backgroundColor: 'var(--input-bg)' }}>
              {computedClasses.map((cls, i) => (
                <span key={i} className="c-pill bg-inset fg-muted">{cls}</span>
              ))}
            </div>
            <button
              onClick={copyAll}
              className={`c-slot ${copied ? 'is-active' : ''}`}
              title="Copy all classes"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        )}

        {/* Manual classes — editable */}
        {manualClasses.length > 0 && (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 rounded px-1.5 py-1 flex flex-wrap gap-1" style={{ backgroundColor: 'var(--input-bg)' }}>
              {manualClasses.map((cls, i) => (
                <span key={`${i}-${cls}`} className="c-pill bg-inset fg-muted">
                  {cls}
                  <button
                    onClick={() => removeClass(cls)}
                    className="-mr-0.5 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive text-current opacity-70 hover:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="c-slot-spacer" />
          </div>
        )}

        {/* Add input */}
        <div className="flex items-center gap-2">
          <div ref={containerRef} className="relative flex-1 min-w-0">
            <div
              className="c-scale-input flex items-center gap-1 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <span className="w-4 shrink-0 flex items-center justify-center c-dimmed">
                <Plus size={12} />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  setTimeout(() => {
                    if (draft.trim()) { addClasses(draft); setDraft('') }
                    setShowSuggestions(false)
                  }, 150)
                }}
                onFocus={() => { if (suggestions.length > 0 && draft.length > 0) setShowSuggestions(true) }}
                placeholder="New Tailwind Class"
                className="flex-1 min-w-[20px] text-[12px] fg-default"
              />
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className={`absolute left-0 right-0 c-menu-popup overflow-y-auto max-h-[200px] ${dropAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}
              >
                {suggestions.map((cls, i) => (
                  <button
                    key={cls}
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(cls) }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full text-left px-3 py-1.5 text-[12px] cursor-pointer ${
                      i === selectedIdx
                        ? 'bg-inset fg-default'
                        : 'fg-muted hover:bg-inset hover:fg-default'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="c-slot-spacer" />
        </div>
      </div>
    </Section>
  )
}
