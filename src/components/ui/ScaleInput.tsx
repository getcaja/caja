import { useState, useRef, useEffect, useCallback } from 'react'
import { Diamond, Unlink, Check } from 'lucide-react'
import type { ScaleOption } from '../../data/scales'
import type { DesignValue } from '../../types/frame'

function formatTokenLabel(prefix: string | undefined, token: string): string {
  if (!prefix) return token
  if (token === '' || token === 'DEFAULT') return prefix
  return `${prefix}-${token}`
}

export function ScaleInput({
  scale,
  value,
  onChange,
  label,
  min = 0,
  unit = 'px',
  classPrefix,
  defaultValue,
}: {
  scale: ScaleOption[]
  value: DesignValue<number>
  onChange: (v: DesignValue<number>) => void
  label?: string
  min?: number
  unit?: string
  classPrefix?: string
  defaultValue?: number
}) {
  // Token is derived from value — no local state
  const token = value.mode === 'token' ? value.token : null
  const numericValue = value.value

  const [draft, setDraft] = useState(token ? '' : String(numericValue))
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync draft when value changes externally
  useEffect(() => {
    if (!focused) {
      setDraft(token ? '' : String(numericValue))
    }
  }, [numericValue, token, focused])

  // Scroll selected item into view
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || selectedIdx < 0) return
    const item = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showDropdown])

  const openDropdown = useCallback(() => {
    setShowDropdown(true)
    const idx = token ? scale.findIndex((s) => s.token === token) : -1
    setSelectedIdx(idx)
  }, [token, scale])

  const closeDropdown = useCallback(() => {
    setShowDropdown(false)
    setSelectedIdx(-1)
  }, [])

  const toggleDropdown = useCallback(() => {
    if (showDropdown) closeDropdown()
    else openDropdown()
  }, [showDropdown, closeDropdown, openDropdown])

  const selectToken = useCallback(
    (opt: ScaleOption) => {
      onChange({ mode: 'token', token: opt.token, value: opt.value })
      setDraft('')
      closeDropdown()
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [onChange, closeDropdown],
  )

  const removeToken = useCallback(() => {
    onChange({ mode: 'custom', value: numericValue })
    setDraft(String(numericValue))
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [numericValue, onChange, closeDropdown])

  const resetValue = defaultValue ?? min

  const commitDraft = useCallback(() => {
    if (draft === '') {
      if (token) return
      onChange({ mode: 'custom', value: resetValue })
      setDraft(String(resetValue))
      return
    }
    const n = Number(draft)
    if (isNaN(n)) {
      setDraft(token ? '' : String(numericValue))
      return
    }
    const clamped = Math.max(min, n)
    onChange({ mode: 'custom', value: clamped })
    setDraft(String(clamped))
  }, [draft, numericValue, min, onChange, token, resetValue])

  // Close dropdown on outside click
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

  // Keyboard — dropdown navigation
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    const maxIdx = scale.length - 1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, maxIdx))
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
      return true
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && selectedIdx < scale.length) {
        selectToken(scale[selectedIdx])
      }
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown()
      return true
    }
    return false
  }, [scale, selectedIdx, selectToken, closeDropdown])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && handleDropdownKeyDown(e)) return

    // Backspace on empty input removes token
    if (e.key === 'Backspace' && draft === '' && token) {
      e.preventDefault()
      removeToken()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(token ? '' : String(numericValue))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp' && !token) {
      e.preventDefault()
      const n = Math.max(min, numericValue + 1)
      onChange({ mode: 'custom', value: n })
      setDraft(String(n))
    } else if (e.key === 'ArrowDown' && !token) {
      e.preventDefault()
      const n = Math.max(min, numericValue - 1)
      onChange({ mode: 'custom', value: n })
      setDraft(String(n))
    }
  }

  const handleFocus = () => {
    setFocused(true)
    if (!token) setDraft(String(numericValue))
  }

  const handleBlur = () => {
    setFocused(false)
    commitDraft()
    setShowDropdown(false)
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      {label && <span className="c-label">{label}</span>}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        <div
          className="c-scale-input flex items-center gap-1 pr-1 overflow-hidden cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {token && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleDropdown()
              }}
              className="flex items-center bg-surface-3 text-text-primary rounded px-1.5 text-[11px] leading-[18px] font-medium shrink-0 cursor-pointer hover:bg-surface-3/80"
            >
              {formatTokenLabel(classPrefix, token)}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            inputMode={token ? undefined : 'numeric'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={token ? '' : undefined}
            className="flex-1 min-w-[20px] text-[12px] text-text-primary"
          />

          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              if (token) {
                removeToken()
              } else {
                toggleDropdown()
              }
              inputRef.current?.focus()
            }}
            className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
              token
                ? 'text-text-muted hover:text-text-primary hover:bg-surface-3/60'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
            }`}
          >
            {token ? <Unlink size={11} /> : <Diamond size={11} />}
          </button>
        </div>

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
          >
            {scale.map((opt, i) => (
              <button
                key={opt.token}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectToken(opt)
                }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                  i === selectedIdx
                    ? 'bg-surface-3/60 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{formatTokenLabel(classPrefix, opt.token)}</span>
                  {opt.token === token && <Check size={10} />}
                </span>
                <span className="text-text-muted">
                  {opt.token === 'auto' ? 'auto' : `${opt.value}${unit}`}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
