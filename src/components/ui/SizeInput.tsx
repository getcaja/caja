import { useState, useRef, useEffect, useCallback } from 'react'
import { Diamond, Check, Unlink } from 'lucide-react'
import type { SizeValue } from '../../types/frame'
import { SIZE_CONSTRAINT_SCALE, type ScaleOption } from '../../data/scales'
import { useFrameStore } from '../../store/frameStore'

interface SizeInputProps {
  value: SizeValue
  onChange: (v: Partial<SizeValue>) => void
  label: string           // "W" or "H"
  classPrefix?: string    // "w" or "h"
  parentIsFlex?: boolean  // show fit/full keywords
  tooltip?: string        // tooltip for inline label
}

interface DropdownItem {
  key: string
  label: string        // left column
  description: string  // right column (dimmed)
  kind: 'keyword' | 'scale'
}

/** Map a SizeValue to a keyword key if it's not fixed, or null */
function sizeToKeyword(value: SizeValue): string | null {
  if (value.mode === 'default') return 'auto'
  if (value.mode === 'hug') return 'fit'
  if (value.mode === 'fill') return 'full'
  return null
}

export function SizeInput({ value, onChange, label, classPrefix: _classPrefix, parentIsFlex, tooltip }: SizeInputProps) {
  const startPreview = useFrameStore((s) => s.startPreview)
  const endPreview = useFrameStore((s) => s.endPreview)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const originalRef = useRef<SizeValue | null>(null)

  // Derive current state
  const keyword = sizeToKeyword(value)
  const isFixed = value.mode === 'fixed'
  const fixedToken = isFixed && value.value.mode === 'token' ? value.value.token : null
  const fixedNumeric = isFixed ? value.value.value : 0

  // Pill: only non-default keywords (Hug/Fill) — Auto is the default, shown as placeholder
  let pillText: string | null = null
  if (value.mode === 'hug') pillText = 'Hug'
  else if (value.mode === 'fill') pillText = 'Fill'
  const hasPill = pillText !== null
  const isDefault = value.mode === 'default'

  // Build dropdown items
  const items: DropdownItem[] = buildItems(parentIsFlex, SIZE_CONSTRAINT_SCALE)

  // Sync draft when value changes externally
  useEffect(() => {
    if (focused) return
    if (isFixed && !hasPill && fixedNumeric !== 0) {
      setDraft(String(fixedNumeric))
    } else {
      setDraft('')
    }
  }, [isFixed, fixedToken, fixedNumeric, focused])

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || selectedIdx < 0) return
    const item = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showDropdown])

  // Resolve current index in dropdown
  const findCurrentIdx = useCallback((): number => {
    if (keyword) return items.findIndex((it) => it.kind === 'keyword' && it.key === keyword)
    if (fixedToken) return items.findIndex((it) => it.kind === 'scale' && it.key === fixedToken)
    return -1
  }, [keyword, fixedToken, items])

  // --- Open/close ---
  // --- Dropdown flip: open above when not enough space below ---
  const [dropAbove, setDropAbove] = useState(false)

  const openDropdown = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setDropAbove(spaceBelow < 220 && spaceAbove > spaceBelow)
    }
    setShowDropdown(true)
    setSelectedIdx(findCurrentIdx())
    startPreview()
  }, [findCurrentIdx, startPreview])

  const closeDropdown = useCallback(() => {
    if (originalRef.current !== null) {
      onChange(originalRef.current)
      originalRef.current = null
    }
    setShowDropdown(false)
    setSelectedIdx(-1)
    endPreview(false)
  }, [onChange, endPreview])

  const toggleDropdown = useCallback(() => {
    if (showDropdown) closeDropdown()
    else openDropdown()
  }, [showDropdown, closeDropdown, openDropdown])

  // --- Preview/commit/revert ---
  const applyItem = useCallback((item: DropdownItem): Partial<SizeValue> => {
    if (item.kind === 'keyword') {
      if (item.key === 'auto') return { mode: 'default' }
      if (item.key === 'fit') return { mode: 'hug' }
      if (item.key === 'full') return { mode: 'fill' }
    }
    // scale item
    const opt = SIZE_CONSTRAINT_SCALE.find((s) => s.token === item.key)!
    return { mode: 'fixed', value: { mode: 'token', token: opt.token, value: opt.value } }
  }, [])

  const previewAtIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length) return
    if (originalRef.current === null) originalRef.current = { ...value }
    onChange(applyItem(items[idx]))
  }, [items, value, onChange, applyItem])

  const commitAtIndex = useCallback((idx: number) => {
    endPreview(true)
    originalRef.current = null
    const item = items[idx]
    const patch = applyItem(item)
    onChange(patch)
    if (item.kind === 'scale') {
      const opt = SIZE_CONSTRAINT_SCALE.find((s) => s.token === item.key)!
      setDraft(String(opt.value))
    } else {
      setDraft('')
    }
    setShowDropdown(false)
    setSelectedIdx(-1)
  }, [items, onChange, applyItem, endPreview])

  const revertPreview = useCallback(() => {
    if (originalRef.current === null) return
    onChange(originalRef.current)
    originalRef.current = null
  }, [onChange])

  // --- Remove pill (Backspace) ---
  const removePill = useCallback(() => {
    if (keyword) {
      // keyword pill → go to default
      onChange({ mode: 'default' })
      setDraft('')
    } else if (fixedToken) {
      // numeric token pill → switch to custom, show value
      onChange({ mode: 'fixed', value: { mode: 'custom', value: fixedNumeric } })
      setDraft(String(fixedNumeric))
    }
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [keyword, fixedToken, fixedNumeric, onChange, closeDropdown])

  // --- Commit typed draft ---
  const commitDraft = useCallback(() => {
    if (draft === '') {
      // Empty → default mode (auto)
      if (!hasPill) {
        onChange({ mode: 'default' })
      }
      return
    }
    const n = Number(draft)
    if (isNaN(n)) {
      // Invalid → restore
      setDraft(isFixed && !hasPill && fixedNumeric !== 0 ? String(fixedNumeric) : '')
      return
    }
    const clamped = Math.max(0, n)
    const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === clamped)
    if (match) {
      onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: clamped } })
      setDraft(String(clamped))
    } else {
      onChange({ mode: 'fixed', value: { mode: 'custom', value: clamped } })
      setDraft(String(clamped))
    }
  }, [draft, hasPill, isFixed, fixedToken, fixedNumeric, onChange])

  // --- Keyboard ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown) {
      const maxIdx = items.length - 1
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        const next = Math.min(selectedIdx + 1, maxIdx)
        setSelectedIdx(next)
        previewAtIndex(next)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        const next = Math.max(selectedIdx - 1, 0)
        setSelectedIdx(next)
        previewAtIndex(next)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        if (selectedIdx >= 0 && selectedIdx < items.length) commitAtIndex(selectedIdx)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeDropdown()
        return
      }
    }

    // Backspace on empty input with pill → remove pill
    if (e.key === 'Backspace' && draft === '' && hasPill) {
      e.preventDefault()
      removePill()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(isFixed && !hasPill && fixedNumeric !== 0 ? String(fixedNumeric) : '')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp' && isFixed && !hasPill) {
      e.preventDefault()
      const n = Math.max(0, fixedNumeric + 1)
      const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === n)
      if (match) {
        onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: n } })
        setDraft(String(n))
      } else {
        onChange({ mode: 'fixed', value: { mode: 'custom', value: n } })
        setDraft(String(n))
      }
    } else if (e.key === 'ArrowDown' && isFixed && !hasPill) {
      e.preventDefault()
      const n = Math.max(0, fixedNumeric - 1)
      const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === n)
      if (match) {
        onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: n } })
        setDraft(String(n))
      } else {
        onChange({ mode: 'fixed', value: { mode: 'custom', value: n } })
        setDraft(String(n))
      }
    }
  }

  const handleFocus = () => {
    setFocused(true)
    if (isFixed && !hasPill && fixedNumeric !== 0) {
      setDraft(String(fixedNumeric))
    }
  }

  const handleBlur = () => {
    setFocused(false)
    commitDraft()
    setShowDropdown(false)
  }

  // --- Close on outside click ---
  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown, closeDropdown])

  // Check mark: which item is committed (ignoring preview)
  const committedKey = (() => {
    const committed = originalRef.current ?? value
    const kw = sizeToKeyword(committed)
    if (kw) return kw
    if (committed.mode === 'fixed' && committed.value.mode === 'token') return committed.value.token
    return null
  })()

  // Separator index: first scale item
  const separatorIdx = items.findIndex((it) => it.kind === 'scale')

  const hasFixedToken = isFixed && fixedToken !== null

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      {hasFixedToken ? (
        // Fixed + token: pill (non-editable) + Unlink
        <div
          className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-pointer relative"
          tabIndex={0}
          onClick={toggleDropdown}
          onKeyDown={(e) => {
            if (showDropdown) {
              handleKeyDown(e)
              return
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault()
              // Detach: keep value, remove token
              onChange({ mode: 'fixed', value: { mode: 'custom', value: fixedNumeric } })
              setDraft(String(fixedNumeric))
              requestAnimationFrame(() => inputRef.current?.focus())
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleDropdown()
            }
          }}
        >
          <span title={tooltip} className="w-4 shrink-0 flex items-center justify-center fg-muted">{label}</span>
          <span className="flex items-center bg-emphasis fg-default rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate">
            {SIZE_CONSTRAINT_SCALE.find(s => s.token === fixedToken)?.label ?? `${fixedNumeric}px`}
          </span>
          <span className="flex-1" />
          {/* Hidden input for focus management */}
          <input ref={inputRef} type="text" className="sr-only" tabIndex={-1} />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onChange({ mode: 'fixed', value: { mode: 'custom', value: fixedNumeric } })
              setDraft(String(fixedNumeric))
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <Unlink size={12} />
          </button>
        </div>
      ) : hasPill ? (
        // Keyword pill (Hug/Fill) — non-editable, click opens dropdown, right button detaches
        <div
          className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-pointer relative"
          tabIndex={0}
          onClick={toggleDropdown}
          onKeyDown={(e) => {
            if (showDropdown) {
              handleKeyDown(e)
              return
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault()
              removePill()
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleDropdown()
            }
          }}
        >
          <span title={tooltip} className="w-4 shrink-0 flex items-center justify-center fg-muted">{label}</span>
          <span className="flex items-center bg-emphasis fg-default rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate">
            {pillText}
          </span>
          <span className="flex-1" />
          {/* Hidden input for focus management */}
          <input ref={inputRef} type="text" className="sr-only" tabIndex={-1} />
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              removePill()
            }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <Unlink size={12} />
          </button>
        </div>
      ) : (
        // Editable input (default/fixed custom)
        <div
          className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
          onClick={() => inputRef.current?.focus()}
        >
          <span title={tooltip} className={`w-4 shrink-0 flex items-center justify-center ${isDefault ? 'fg-subtle' : 'fg-muted'}`}>{label}</span>

          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Auto"
            className="flex-1 min-w-[20px] text-[12px] fg-default"
          />

          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              toggleDropdown()
              inputRef.current?.focus()
            }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
          >
            <Diamond size={12} />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 right-0 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1 ${dropAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          onMouseLeave={revertPreview}
        >
          {items.map((item, i) => (
            <div key={`${item.kind}-${item.key}`}>
              {i === separatorIdx && separatorIdx > 0 && (
                <>
                  <div className="border-t border-border my-1" />
                  <div className="px-3 py-1 text-[11px] fg-subtle font-medium">Fixed</div>
                </>
              )}
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  commitAtIndex(i)
                }}
                onMouseEnter={() => {
                  setSelectedIdx(i)
                  previewAtIndex(i)
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                  i === selectedIdx
                    ? 'c-menu-item-active'
                    : 'fg-muted hover:bg-inset hover:fg-default'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{item.label}</span>
                  {item.key === committedKey && <Check size={10} />}
                </span>
                {item.description && <span className="fg-subtle">{item.description}</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function buildItems(
  parentIsFlex: boolean | undefined,
  scale: ScaleOption[],
): DropdownItem[] {
  const items: DropdownItem[] = []

  // Keywords
  if (parentIsFlex) {
    items.push({ key: 'fit', label: 'Hug', description: 'Hug content', kind: 'keyword' })
    items.push({ key: 'full', label: 'Fill', description: '100%', kind: 'keyword' })
  } else {
    items.push({ key: 'auto', label: 'Auto', description: '', kind: 'keyword' })
  }

  // Scale tokens
  for (const opt of scale) {
    items.push({
      key: opt.token,
      label: `${opt.value}px`,
      description: '',
      kind: 'scale',
    })
  }

  return items
}
