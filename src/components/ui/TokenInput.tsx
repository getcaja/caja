import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { Diamond, Check, Unlink } from 'lucide-react'
import type { ScaleOption } from '../../data/scales'
import type { DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'

// --- Singleton dropdown: only one open at a time ---
// Preserve Set across HMR — module re-evaluates but component instances keep old effect refs
let closeListeners: Set<(openId: string) => void>
if (import.meta.hot) {
  closeListeners = import.meta.hot.data.closeListeners ??= new Set()
} else {
  closeListeners = new Set()
}
function notifyDropdownOpen(id: string) {
  closeListeners.forEach(cb => cb(id))
}

interface TokenInputProps {
  scale: ScaleOption[]
  value: DesignValue<number>
  onChange: (v: DesignValue<number>) => void
  min?: number
  max?: number
  unit?: string
  defaultValue?: number
  placeholder?: string
  label?: string
  classPrefix?: string
  inlineLabel?: React.ReactNode
  tooltip?: string
  autoFocus?: boolean
  /** Open the dropdown immediately on mount. */
  initialOpen?: boolean
}

// Normalized item for the shared dropdown
interface NormalizedItem {
  key: string
  token: string
  label: string | null
  displayRight: string
  group: string | null
}

export function TokenInput(props: TokenInputProps) {
  const { scale, value, onChange, label, inlineLabel, tooltip } = props
  const startPreview = useFrameStore((s) => s.startPreview)
  const endPreview = useFrameStore((s) => s.endPreview)
  // --- Shared state ---
  const instanceId = useId()
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<DesignValue<number> | null>(null)
  const originalDraftRef = useRef('')
  const dropdownOpenRef = useRef(false)
  // --- Singleton: close this dropdown when another opens ---
  const closeFromOutsideRef = useRef<() => void>(() => {})

  // --- Derived state ---
  const scaleToken = value.mode === 'token' ? value.token : null
  const hasToken = scaleToken !== null
  const scaleNumeric = value.value
  const scaleMin = props.min ?? 0
  const scaleMax = props.max ?? Infinity
  const scaleUnit = props.unit ?? 'px'
  const scaleResetValue = props.defaultValue ?? scaleMin
  const scaleIsUnset = value.mode === 'custom' && value.value === scaleResetValue
  const isActive = !scaleIsUnset || hasToken

  const [draft, setDraft] = useState(scaleIsUnset ? '' : String(scaleNumeric))
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingFocusRef = useRef(false)

  // --- Auto-focus input after detaching token ---
  useEffect(() => {
    if (pendingFocusRef.current && !hasToken) {
      pendingFocusRef.current = false
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [hasToken])

  // --- Inline label (with optional title tooltip) ---
  const inlineLabelEl = inlineLabel ? (
    <span title={tooltip} className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${isActive ? 'is-active' : ''}`}>{inlineLabel}</span>
  ) : null

  // --- Normalize items for dropdown ---
  const items: NormalizedItem[] = scale.map((s) => ({
    key: s.token,
    token: s.token,
    label: s.label ?? null,
    displayRight: s.token === 'auto' ? '' : `${s.value}${scaleUnit}`,
    group: s.group ?? null,
  }))

  // --- Sync draft when value changes externally ---
  useEffect(() => {
    if (focused) return
    const unset = value.mode === 'custom' && value.value === scaleResetValue
    setDraft(unset ? '' : String(scaleNumeric))
  }, [scaleNumeric, scaleToken, focused, value.mode, scaleResetValue])

  // --- Scroll selected item into view (within dropdown only, not parent panels) ---
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || selectedIdx < 0) return
    const container = dropdownRef.current
    const item = container.children[selectedIdx] as HTMLElement | undefined
    if (!item) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < container.scrollTop) {
      container.scrollTop = top
    } else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight
    }
  }, [selectedIdx, showDropdown])

  // --- Dropdown position (fixed, via portal) ---
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number; above: boolean } | null>(null)

  const measureDropPos = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const above = spaceBelow < 220 && spaceAbove > spaceBelow
    setDropPos({
      top: above ? rect.top : rect.bottom,
      left: rect.left,
      width: rect.width,
      above,
    })
  }, [])

  // --- Open/close/toggle ---
  const openDropdown = useCallback(() => {
    notifyDropdownOpen(instanceId)
    originalDraftRef.current = draft
    dropdownOpenRef.current = true
    measureDropPos()
    setShowDropdown(true)
    const idx = hasToken ? scale.findIndex((s) => s.token === scaleToken) : -1
    setSelectedIdx(idx)
    startPreview()
  }, [scaleToken, scale, startPreview, measureDropPos])

  const closeDropdown = useCallback(() => {
    if (originalRef.current !== null) {
      onChange(originalRef.current)
      draftRef.current = originalDraftRef.current
      setDraft(originalDraftRef.current)
      originalRef.current = null
    }
    // NOTE: Don't clear dropdownOpenRef here — handleBlur needs to see it's still true
    // to know it should skip commitDraft. handleBlur will clear it.
    setShowDropdown(false)
    setSelectedIdx(-1)
    endPreview(false)
  }, [onChange, endPreview])

  const toggleDropdown = useCallback(() => {
    if (showDropdown) closeDropdown()
    else openDropdown()
  }, [showDropdown, closeDropdown, openDropdown])

  // Wire up singleton listener (after closeDropdown is defined)
  closeFromOutsideRef.current = closeDropdown
  useEffect(() => {
    const handler = (openId: string) => {
      if (openId !== instanceId) closeFromOutsideRef.current()
    }
    closeListeners.add(handler)
    return () => { closeListeners.delete(handler) }
  }, [instanceId])

  // --- Initial open ---
  const didInitialOpen = useRef(false)
  useEffect(() => {
    if (props.initialOpen && !didInitialOpen.current) {
      didInitialOpen.current = true
      requestAnimationFrame(() => openDropdown())
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- Preview/commit/revert ---
  const previewAtIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length) return
    const opt = scale[idx]
    if (originalRef.current === null) originalRef.current = value
    onChange({ mode: 'token', token: opt.token, value: opt.value })
    setDraft(String(opt.value))
  }, [items.length, scale, value, onChange])

  const commitAtIndex = useCallback((idx: number) => {
    endPreview(true)
    originalRef.current = null
    dropdownOpenRef.current = false
    const opt = scale[idx]
    onChange({ mode: 'token', token: opt.token, value: opt.value })
    setDraft(String(opt.value))
    setShowDropdown(false)
    setSelectedIdx(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [scale, onChange, endPreview])

  const revertPreview = useCallback(() => {
    if (originalRef.current === null) return
    onChange(originalRef.current)
    // Restore draft synchronously so commitDraft reads the correct value
    draftRef.current = originalDraftRef.current
    setDraft(originalDraftRef.current)
    originalRef.current = null
    setSelectedIdx(-1)
  }, [onChange])

  // --- Commit draft ---
  // Reads from draftRef (synchronous) instead of draft (closure) to avoid
  // stale values when revertPreview/closeDropdown restore the draft.
  const commitDraft = useCallback(() => {
    const d = draftRef.current
    if (d === '') {
      onChange({ mode: 'custom', value: scaleResetValue })
      setDraft('')
      return
    }
    const n = Number(d)
    if (isNaN(n)) {
      setDraft(String(scaleNumeric))
      return
    }
    const clamped = Math.min(scaleMax, Math.max(scaleMin, n))
    if (clamped === scaleResetValue) {
      onChange({ mode: 'custom', value: scaleResetValue })
      setDraft('')
    } else {
      const match = scale.find(s => s.value === clamped)
      if (match) {
        onChange({ mode: 'token', token: match.token, value: clamped })
        setDraft(String(clamped))
      } else {
        onChange({ mode: 'custom', value: clamped })
        setDraft(String(clamped))
      }
    }
  }, [onChange, scale, scaleNumeric, scaleMin, scaleToken, scaleResetValue])

  // --- Close on outside click ---
  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown, closeDropdown])

  // --- Dropdown keyboard nav ---
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
    const maxIdx = items.length - 1
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      const next = Math.min(selectedIdx + 1, maxIdx)
      setSelectedIdx(next)
      previewAtIndex(next)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      const next = Math.max(selectedIdx - 1, 0)
      setSelectedIdx(next)
      previewAtIndex(next)
      return true
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (selectedIdx >= 0 && selectedIdx < items.length) {
        commitAtIndex(selectedIdx)
      }
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      closeDropdown()
      return true
    }
    return false
  }, [items.length, selectedIdx, previewAtIndex, commitAtIndex, closeDropdown])

  // --- Keydown handler ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && handleDropdownKeyDown(e)) return

    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(value.mode === 'custom' && value.value === scaleResetValue ? '' : String(scaleNumeric))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const n = Math.min(scaleMax, Math.max(scaleMin, scaleNumeric + 1))
      if (n === scaleNumeric && scaleIsUnset) return
      if (n === scaleResetValue) {
        onChange({ mode: 'custom', value: scaleResetValue })
        setDraft('')
      } else {
        const match = scale.find(s => s.value === n)
        if (match) {
          onChange({ mode: 'token', token: match.token, value: n })
          setDraft(String(n))
        } else {
          onChange({ mode: 'custom', value: n })
          setDraft(String(n))
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const n = Math.min(scaleMax, Math.max(scaleMin, scaleNumeric - 1))
      if (n === scaleNumeric && scaleIsUnset) return
      if (n === scaleResetValue) {
        onChange({ mode: 'custom', value: scaleResetValue })
        setDraft('')
      } else {
        const match = scale.find(s => s.value === n)
        if (match) {
          onChange({ mode: 'token', token: match.token, value: n })
          setDraft(String(n))
        } else {
          onChange({ mode: 'custom', value: n })
          setDraft(String(n))
        }
      }
    }
  }

  // --- Focus/blur ---
  const handleFocus = () => {
    dropdownOpenRef.current = false
    setFocused(true)
    setDraft(value.mode === 'custom' && value.value === scaleResetValue ? '' : String(scaleNumeric))
  }

  const handleBlur = () => {
    setFocused(false)
    if (dropdownOpenRef.current) {
      // Dropdown was open — close and revert (handles iframe clicks where
      // document mousedown never fires). Safe to double-call if closeDropdown
      // already ran from mousedown — endPreview is idempotent.
      closeDropdown()
    } else {
      commitDraft()
    }
    dropdownOpenRef.current = false
    setShowDropdown(false)
  }

  // --- Committed value for check mark (stays on original during preview) ---
  const committedToken = originalRef.current !== null
    ? (() => { const dv = originalRef.current as DesignValue<number>; return dv.mode === 'token' ? dv.token : null })()
    : scaleToken

  // --- Dropdown JSX (rendered via portal to avoid scroll-container issues) ---
  const dropdownJSX = showDropdown && dropPos && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        left: dropPos.left,
        ...(dropPos.above
          ? { bottom: window.innerHeight - dropPos.top + 4 }
          : { top: dropPos.top + 4 }),
        minWidth: dropPos.width,
        zIndex: 9999,
      }}
      className="c-menu-popup overflow-y-auto max-h-[200px] w-max"
      onMouseLeave={revertPreview}
    >
      {items.map((item, i) => (
        <div key={item.key}>
          {item.group && i > 0 && <div className="border-t border-border my-1" />}
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
            <span className="flex items-center gap-2">
              <span className="font-medium">{item.label ?? item.displayRight}</span>
              {item.token === committedToken && <Check size={10} />}
            </span>
            {item.label && <span className="fg-subtle">{item.displayRight}</span>}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )

  // --- Render ---
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {label && !inlineLabel && <span title={tooltip || label} className="c-label">{label}</span>}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        {hasToken ? (
          // Tokenized state — pill, click opens dropdown, button detaches
          <div
            className="group c-scale-input flex items-center pr-6 overflow-hidden cursor-pointer relative"
            tabIndex={0}
            onClick={toggleDropdown}
            onKeyDown={(e) => {
              if (showDropdown && handleDropdownKeyDown(e)) return
              if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault()
                // Detach: keep value, remove token
                pendingFocusRef.current = true
                onChange({ mode: 'custom', value: scaleNumeric })
                setDraft(scaleNumeric === scaleResetValue ? '' : String(scaleNumeric))
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleDropdown()
              }
            }}
          >
            {inlineLabelEl}
            <span className="c-pill">
              {scaleToken === 'auto' ? scale.find(s => s.token === 'auto')?.label ?? 'Auto' : `${scaleNumeric}${scaleUnit}`}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Detach: keep value, remove token
                pendingFocusRef.current = true
                onChange({ mode: 'custom', value: scaleNumeric })
                setDraft(scaleNumeric === scaleResetValue ? '' : String(scaleNumeric))
              }}
              className={`c-input-btn ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Unlink size={12} />
            </button>
          </div>
        ) : (
          // Editable state — input + diamond to open token picker
          <div
            className="group c-scale-input flex items-center pr-6 overflow-hidden cursor-text relative"
            onClick={() => inputRef.current?.focus()}
          >
            {inlineLabelEl}

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => { dropdownOpenRef.current = false; setDraft(e.target.value) }}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoFocus={props.autoFocus}
              placeholder={scaleIsUnset ? (props.placeholder ?? String(scaleResetValue)) : undefined}
              className={`flex-1 min-w-[20px] text-[12px] fg-default${showDropdown ? ' caret-transparent' : ''}`}
            />

            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                toggleDropdown()
                inputRef.current?.focus()
              }}
              className={`c-input-btn ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
            >
              <Diamond size={12} />
            </button>
          </div>
        )}

      </div>
      {dropdownJSX}
    </div>
  )
}
