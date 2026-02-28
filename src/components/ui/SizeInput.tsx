import { useState, useRef, useEffect, useCallback } from 'react'
import { Diamond, Check } from 'lucide-react'
import type { SizeValue, DesignValue } from '../../types/frame'
import { SIZE_CONSTRAINT_SCALE, type ScaleOption } from '../../data/scales'
import { useFrameStore } from '../../store/frameStore'
import { Tooltip } from './Tooltip'

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

function formatTokenLabel(prefix: string | undefined, token: string): string {
  if (!prefix) return token
  if (token === '' || token === 'DEFAULT') return prefix
  return `${prefix}-${token}`
}

/** Map a SizeValue to a keyword key if it's not fixed, or null */
function sizeToKeyword(value: SizeValue): string | null {
  if (value.mode === 'default') return 'auto'
  if (value.mode === 'hug') return 'fit'
  if (value.mode === 'fill') return 'full'
  return null
}

/** Get the pill text for the current SizeValue */
function getPillText(value: SizeValue, classPrefix?: string): string | null {
  if (value.mode === 'hug') return 'fit'
  if (value.mode === 'fill') return 'full'
  if (value.mode === 'fixed' && value.value.mode === 'token') {
    return value.value.token
  }
  return null
}

export function SizeInput({ value, onChange, label, classPrefix, parentIsFlex, tooltip }: SizeInputProps) {
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
  const pillText = getPillText(value, classPrefix)
  const hasPill = pillText !== null

  // Build dropdown items
  const items: DropdownItem[] = buildItems(parentIsFlex, SIZE_CONSTRAINT_SCALE, classPrefix)

  // Sync draft when value changes externally
  useEffect(() => {
    if (focused) return
    if (isFixed && !fixedToken && fixedNumeric !== 0) {
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
  const openDropdown = useCallback(() => {
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
    const patch = applyItem(items[idx])
    onChange(patch)
    setDraft('')
    setShowDropdown(false)
    setSelectedIdx(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
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
      setDraft(isFixed && !fixedToken && fixedNumeric !== 0 ? String(fixedNumeric) : '')
      return
    }
    const clamped = Math.max(0, n)
    const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === clamped)
    if (match) {
      onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: clamped } })
      setDraft('')
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
        const next = Math.min(selectedIdx + 1, maxIdx)
        setSelectedIdx(next)
        previewAtIndex(next)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = Math.max(selectedIdx - 1, 0)
        setSelectedIdx(next)
        previewAtIndex(next)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIdx >= 0 && selectedIdx < items.length) commitAtIndex(selectedIdx)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
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
      setDraft(isFixed && !fixedToken && fixedNumeric !== 0 ? String(fixedNumeric) : '')
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp' && isFixed && !fixedToken) {
      e.preventDefault()
      const n = Math.max(0, fixedNumeric + 1)
      const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === n)
      if (match) {
        onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: n } })
        setDraft('')
      } else {
        onChange({ mode: 'fixed', value: { mode: 'custom', value: n } })
        setDraft(String(n))
      }
    } else if (e.key === 'ArrowDown' && isFixed && !fixedToken) {
      e.preventDefault()
      const n = Math.max(0, fixedNumeric - 1)
      const match = SIZE_CONSTRAINT_SCALE.find((s) => s.value === n)
      if (match) {
        onChange({ mode: 'fixed', value: { mode: 'token', token: match.token, value: n } })
        setDraft('')
      } else {
        onChange({ mode: 'fixed', value: { mode: 'custom', value: n } })
        setDraft(String(n))
      }
    }
  }

  const handleFocus = () => {
    setFocused(true)
    if (isFixed && !fixedToken && fixedNumeric !== 0) {
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

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div
        className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Inline label */}
        {tooltip ? (
          <Tooltip content={tooltip}>
            <span className={`w-4 shrink-0 flex items-center justify-center ${value.mode !== 'default' ? 'text-text-secondary' : 'text-text-muted'}`}>{label}</span>
          </Tooltip>
        ) : (
          <span className={`w-4 shrink-0 flex items-center justify-center ${value.mode !== 'default' ? 'text-text-secondary' : 'text-text-muted'}`}>{label}</span>
        )}

        {/* Pill for keyword or token */}
        {hasPill && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleDropdown()
            }}
            className="flex items-center bg-surface-3 text-text-primary rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate cursor-pointer hover:bg-surface-3/80"
          >
            {pillText}
          </button>
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          inputMode={hasPill ? undefined : 'numeric'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={hasPill ? '' : 'Auto'}
          className={`flex-1 ${hasPill ? 'min-w-0' : 'min-w-[20px]'} text-[12px] text-text-primary`}
        />

        {/* Diamond button */}
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => {
            e.preventDefault()
            toggleDropdown()
            inputRef.current?.focus()
          }}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-opacity ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
        >
          <Diamond size={12} />
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
          onMouseLeave={revertPreview}
        >
          {items.map((item, i) => (
            <div key={`${item.kind}-${item.key}`}>
              {i === separatorIdx && separatorIdx > 0 && (
                <div className="border-t border-border my-1" />
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
                    ? 'bg-surface-3/60 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{item.label}</span>
                  {item.key === committedKey && <Check size={10} />}
                </span>
                <span className="text-text-muted">{item.description}</span>
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
  classPrefix?: string,
): DropdownItem[] {
  const items: DropdownItem[] = []

  // Keywords
  items.push({ key: 'auto', label: 'auto', description: 'auto', kind: 'keyword' })
  if (parentIsFlex) {
    items.push({ key: 'fit', label: `${classPrefix}-fit`, description: 'fit-content', kind: 'keyword' })
    items.push({ key: 'full', label: `${classPrefix}-full`, description: '100%', kind: 'keyword' })
  }

  // Scale tokens
  for (const opt of scale) {
    items.push({
      key: opt.token,
      label: formatTokenLabel(classPrefix, opt.token),
      description: `${opt.value}px`,
      kind: 'scale',
    })
  }

  return items
}
