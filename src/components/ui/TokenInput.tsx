import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { Diamond, Check } from 'lucide-react'
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

export interface EnumOption {
  value: string
  label: string
  token?: string
  group?: string
  description?: string
}

interface TokenInputBase {
  label?: string
  classPrefix?: string
  inlineLabel?: React.ReactNode
  tooltip?: string
}

interface AutoOption {
  label: string
  hint?: string
  pill?: boolean
  active: boolean
  onToggle: () => void
}

interface TokenInputScale extends TokenInputBase {
  scale: ScaleOption[]
  value: DesignValue<number>
  onChange: (v: DesignValue<number>) => void
  options?: never
  min?: number
  max?: number
  unit?: string
  defaultValue?: number
  placeholder?: string
  autoOption?: AutoOption
}

interface TokenInputEnum extends TokenInputBase {
  options: EnumOption[]
  value: string
  onChange: (v: string) => void
  scale?: never
  initialValue?: string
  autoOption?: AutoOption
}

export type TokenInputProps = TokenInputScale | TokenInputEnum

// Normalized item for the shared dropdown
interface NormalizedItem {
  key: string
  token: string
  label: string | null
  displayRight: string
  hint: string | null
  group: string | null
}

export function TokenInput(props: TokenInputProps) {
  const { label, classPrefix, inlineLabel, tooltip } = props
  const isScale = 'scale' in props && props.scale !== undefined
  const startPreview = useFrameStore((s) => s.startPreview)
  const endPreview = useFrameStore((s) => s.endPreview)
  // --- Shared state ---
  const instanceId = useId()
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<DesignValue<number> | string | null>(null)
  const originalDraftRef = useRef('')
  const dropdownOpenRef = useRef(false)
  const autoOptActiveAtOpenRef = useRef(false)

  // --- Singleton: close this dropdown when another opens ---
  const closeFromOutsideRef = useRef<() => void>(() => {})

  // --- Scale-only state ---
  const scaleProps = isScale ? (props as TokenInputScale) : null
  const scaleToken = scaleProps ? (scaleProps.value.mode === 'token' ? scaleProps.value.token : null) : null
  const hasToken = scaleToken !== null
  const scaleNumeric = scaleProps ? scaleProps.value.value : 0
  const scaleMin = scaleProps?.min ?? 0
  const scaleMax = scaleProps?.max ?? Infinity
  const scaleUnit = scaleProps?.unit ?? 'px'
  const scaleResetValue = scaleProps ? (scaleProps.defaultValue ?? scaleMin) : 0
  const scaleIsUnset = scaleProps ? (scaleProps.value.mode === 'custom' && scaleProps.value.value === scaleResetValue) : false

  const [draft, setDraft] = useState(scaleProps ? (scaleIsUnset ? '' : String(scaleNumeric)) : '')
  const draftRef = useRef(draft)
  draftRef.current = draft
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // --- Enum-only derived ---
  const enumProps = !isScale ? (props as TokenInputEnum) : null
  const enumCurrentOpt = enumProps ? enumProps.options.find((o) => o.value === enumProps.value) : null
  const enumCurrentLabel = enumProps ? (enumCurrentOpt?.label ?? enumProps.value) : ''
  const enumIsInitial = enumProps ? (enumProps.initialValue !== undefined && enumProps.value === enumProps.initialValue) : false

  // --- AutoOption (must be before callbacks that reference it) ---
  const autoOpt = scaleProps?.autoOption ?? enumProps?.autoOption

  // Is the field in an "active" (non-default) state?
  const isActive = isScale
    ? (!scaleIsUnset || scaleToken !== null)
    : !enumIsInitial

  // --- Inline label (with optional title tooltip) ---
  const inlineLabelEl = inlineLabel ? (
    <span title={tooltip} className={`w-4 shrink-0 flex items-center justify-center ${isActive ? 'text-text-secondary' : 'text-text-muted/50'}`}>{inlineLabel}</span>
  ) : null

  // --- Normalize items for dropdown ---
  const items: NormalizedItem[] = isScale
    ? scaleProps!.scale.map((s) => ({
        key: s.token,
        token: s.token,
        label: s.label ?? null,
        displayRight: s.token === 'auto' ? 'auto' : `${s.value}${scaleUnit}`,
        hint: null,
        group: s.group ?? null,
      }))
    : enumProps!.options.map((o) => ({
        key: o.value,
        token: o.token ?? o.value,
        label: null,
        displayRight: o.label,
        hint: o.description ?? null,
        group: o.group ?? null,
      }))

  // --- Sync draft when scale value changes externally ---
  useEffect(() => {
    if (!scaleProps || focused) return
    const unset = scaleProps.value.mode === 'custom' && scaleProps.value.value === scaleResetValue
    setDraft(unset ? '' : String(scaleNumeric))
  }, [scaleNumeric, scaleToken, focused, scaleProps?.value.mode, scaleResetValue])

  // --- Scroll selected item into view ---
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || selectedIdx < 0) return
    const item = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showDropdown])

  // --- Dropdown flip: open above when not enough space below ---
  const [dropAbove, setDropAbove] = useState(false)

  // --- Open/close/toggle ---
  const openDropdown = useCallback(() => {
    notifyDropdownOpen(instanceId)
    originalDraftRef.current = draft
    dropdownOpenRef.current = true
    autoOptActiveAtOpenRef.current = !!autoOpt?.active
    // Measure available space below vs above
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setDropAbove(spaceBelow < 220 && spaceAbove > spaceBelow)
    }
    setShowDropdown(true)
    if (isScale) {
      const idx = hasToken && !autoOpt?.active ? scaleProps!.scale.findIndex((s) => s.token === scaleToken) : -1
      setSelectedIdx(idx)
    } else {
      const idx = !autoOpt?.active ? enumProps!.options.findIndex((o) => o.value === enumProps!.value) : -1
      setSelectedIdx(idx)
    }
    startPreview()
  }, [isScale, scaleToken, scaleProps?.scale, enumProps?.value, enumProps?.options, startPreview, autoOpt?.active])

  const closeDropdown = useCallback(() => {
    if (originalRef.current !== null) {
      if (isScale) {
        scaleProps!.onChange(originalRef.current as DesignValue<number>)
        draftRef.current = originalDraftRef.current
        setDraft(originalDraftRef.current)
      } else {
        enumProps!.onChange(originalRef.current as string)
      }
      originalRef.current = null
    }
    // NOTE: Don't clear dropdownOpenRef here — handleBlur needs to see it's still true
    // to know it should skip commitDraft. handleBlur will clear it.
    setShowDropdown(false)
    setSelectedIdx(-1)
    endPreview(false)
  }, [isScale, scaleProps?.onChange, enumProps?.onChange, endPreview])

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

  // --- Preview/commit/revert ---
  const previewAtIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length) return
    if (isScale) {
      const opt = scaleProps!.scale[idx]
      if (originalRef.current === null) originalRef.current = scaleProps!.value
      scaleProps!.onChange({ mode: 'token', token: opt.token, value: opt.value })
      setDraft(String(opt.value))
    } else {
      if (originalRef.current === null) originalRef.current = enumProps!.value
      enumProps!.onChange(enumProps!.options[idx].value)
    }
  }, [isScale, items.length, scaleProps?.scale, scaleProps?.value, scaleProps?.onChange, enumProps?.options, enumProps?.value, enumProps?.onChange])

  const commitAtIndex = useCallback((idx: number) => {
    endPreview(true)
    originalRef.current = null
    dropdownOpenRef.current = false
    if (isScale) {
      const opt = scaleProps!.scale[idx]
      if (scaleProps!.autoOption?.active) scaleProps!.autoOption.onToggle()
      scaleProps!.onChange({ mode: 'token', token: opt.token, value: opt.value })
      setDraft(String(opt.value))
      setShowDropdown(false)
      setSelectedIdx(-1)
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      enumProps!.onChange(enumProps!.options[idx].value)
      setShowDropdown(false)
      setSelectedIdx(-1)
    }
  }, [isScale, scaleProps?.scale, scaleProps?.onChange, enumProps?.options, enumProps?.onChange, endPreview])

  const revertPreview = useCallback(() => {
    if (originalRef.current === null) return
    if (isScale) {
      scaleProps!.onChange(originalRef.current as DesignValue<number>)
      // Restore draft synchronously so commitDraft reads the correct value
      draftRef.current = originalDraftRef.current
      setDraft(originalDraftRef.current)
    } else {
      enumProps!.onChange(originalRef.current as string)
    }
    originalRef.current = null
    setSelectedIdx(-1)
  }, [isScale, scaleProps?.onChange, enumProps?.onChange])

  // --- Scale-only: commit draft ---
  // Reads from draftRef (synchronous) instead of draft (closure) to avoid
  // stale values when revertPreview/closeDropdown restore the draft.
  const commitDraft = useCallback(() => {
    if (!scaleProps) return
    const d = draftRef.current
    if (d === '') {
      scaleProps.onChange({ mode: 'custom', value: scaleResetValue })
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
      scaleProps.onChange({ mode: 'custom', value: scaleResetValue })
      setDraft('')
    } else {
      const match = scaleProps.scale.find(s => s.value === clamped)
      if (match) {
        scaleProps.onChange({ mode: 'token', token: match.token, value: clamped })
        setDraft(String(clamped))
      } else {
        scaleProps.onChange({ mode: 'custom', value: clamped })
        setDraft(String(clamped))
      }
    }
  }, [scaleProps?.onChange, scaleProps?.scale, scaleNumeric, scaleMin, scaleToken, scaleResetValue])

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

  // --- Shared dropdown keyboard nav ---
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

  // --- Scale keydown handler ---
  const handleScaleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && handleDropdownKeyDown(e)) return

    if (e.key === 'Enter') {
      e.preventDefault()
      commitDraft()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setDraft(scaleProps!.value.mode === 'custom' && scaleProps!.value.value === scaleResetValue ? '' : String(scaleNumeric))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const n = Math.min(scaleMax, Math.max(scaleMin, scaleNumeric + 1))
      if (n === scaleNumeric && scaleIsUnset) return
      if (n === scaleResetValue) {
        scaleProps!.onChange({ mode: 'custom', value: scaleResetValue })
        setDraft('')
      } else {
        const match = scaleProps!.scale.find(s => s.value === n)
        if (match) {
          scaleProps!.onChange({ mode: 'token', token: match.token, value: n })
          setDraft(String(n))
        } else {
          scaleProps!.onChange({ mode: 'custom', value: n })
          setDraft(String(n))
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const n = Math.min(scaleMax, Math.max(scaleMin, scaleNumeric - 1))
      if (n === scaleNumeric && scaleIsUnset) return
      if (n === scaleResetValue) {
        scaleProps!.onChange({ mode: 'custom', value: scaleResetValue })
        setDraft('')
      } else {
        const match = scaleProps!.scale.find(s => s.value === n)
        if (match) {
          scaleProps!.onChange({ mode: 'token', token: match.token, value: n })
          setDraft(String(n))
        } else {
          scaleProps!.onChange({ mode: 'custom', value: n })
          setDraft(String(n))
        }
      }
    }
  }

  // --- Enum keydown handler ---
  const handleEnumKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openDropdown()
      }
      return
    }
    handleDropdownKeyDown(e)
  }, [showDropdown, openDropdown, handleDropdownKeyDown])

  // --- Scale focus/blur ---
  const handleFocus = () => {
    dropdownOpenRef.current = false
    setFocused(true)
    setDraft(scaleProps!.value.mode === 'custom' && scaleProps!.value.value === scaleResetValue ? '' : String(scaleNumeric))
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
  const scaleCommittedToken = isScale
    ? (originalRef.current !== null
        ? ((originalRef.current as DesignValue<number>).mode === 'token' ? (originalRef.current as DesignValue<number>).token : null)
        : scaleToken)
    : null
  const enumCommittedValue = enumProps ? (originalRef.current as string | null) ?? enumProps.value : ''

  // --- Dropdown JSX (shared) ---
  const dropdownJSX = showDropdown && (
    <div
      ref={dropdownRef}
      className={`absolute left-0 min-w-full z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1 w-max ${dropAbove ? 'bottom-full mb-1' : 'top-full mt-1'}`}
      onMouseLeave={revertPreview}
    >
      {autoOpt && (
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            autoOpt.onToggle()
            setShowDropdown(false)
            endPreview(true)
            originalRef.current = null
          }}
          className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer border-b border-border mb-1 ${
            autoOptActiveAtOpenRef.current
              ? 'bg-surface-3/60 text-text-primary'
              : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="font-medium">{autoOpt.label}</span>
            {autoOptActiveAtOpenRef.current && <Check size={10} />}
          </span>
          {autoOpt.hint && <span className="text-text-muted">{autoOpt.hint}</span>}
        </button>
      )}
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
                ? 'bg-surface-3/60 text-text-primary'
                : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{item.label ?? item.displayRight}</span>
              {isScale
                ? !autoOptActiveAtOpenRef.current && item.token === scaleCommittedToken && <Check size={10} />
                : !autoOptActiveAtOpenRef.current && item.key === enumCommittedValue && <Check size={10} />
              }
            </span>
            {item.label && <span className="text-text-muted">{item.displayRight}</span>}
            {item.hint && <span className="text-text-muted">{item.hint}</span>}
          </button>
        </div>
      ))}
    </div>
  )

  // --- Render ---
  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      {label && !inlineLabel && <span title={tooltip || label} className="c-label">{label}</span>}
      <div ref={containerRef} className="relative flex-1 min-w-0">
        {isScale ? (
          // Scale mode trigger
          autoOpt?.active ? (
            <div
              className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-pointer relative"
              tabIndex={0}
              onClick={toggleDropdown}
              onKeyDown={(e) => {
                if (showDropdown && handleDropdownKeyDown(e)) return
                if (e.key === 'Backspace' || e.key === 'Delete') {
                  e.preventDefault()
                  autoOpt.onToggle()
                } else if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleDropdown()
                }
              }}
            >
              {inlineLabelEl}
              {autoOpt.pill ? (
                <>
                  <span className="flex items-center bg-surface-3 text-text-primary rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate">{autoOpt.label}</span>
                  <span className="flex-1" />
                </>
              ) : (
                <span className="flex-1 min-w-0 text-[12px] text-text-muted pl-0.5 truncate">{autoOpt.label}</span>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleDropdown()
                  ;(e.currentTarget.parentElement as HTMLElement)?.focus()
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Diamond size={12} />
              </button>
            </div>
          ) : (
          <div
            className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
            onClick={() => inputRef.current?.focus()}
          >
            {inlineLabelEl}

            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => { dropdownOpenRef.current = false; setDraft(e.target.value) }}
              onKeyDown={handleScaleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={scaleIsUnset ? (scaleProps!.placeholder ?? String(scaleResetValue)) : undefined}
              className={`flex-1 min-w-[20px] text-[12px] text-text-primary${showDropdown ? ' caret-transparent' : ''}`}
            />

            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                toggleDropdown()
                inputRef.current?.focus()
              }}
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
            >
              <Diamond size={12} />
            </button>
          </div>
          )
        ) : (
          // Enum mode trigger
          autoOpt?.active ? (
            <div
              className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-pointer relative"
              tabIndex={0}
              onClick={toggleDropdown}
              onKeyDown={(e) => {
                if (showDropdown && handleDropdownKeyDown(e)) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleDropdown()
                }
              }}
            >
              {inlineLabelEl}
              <span className="flex-1 min-w-0 text-[12px] text-text-muted pl-0.5 truncate">{autoOpt.label}</span>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleDropdown()
                  ;(e.currentTarget.parentElement as HTMLElement)?.focus()
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Diamond size={12} />
              </button>
            </div>
          ) : (
            <div
              className="group c-scale-input flex items-center gap-0.5 pr-6 cursor-pointer relative"
              tabIndex={0}
              onClick={toggleDropdown}
              onKeyDown={handleEnumKeyDown}
            >
              {inlineLabelEl}
              <>
                <span className="flex items-center bg-surface-3 text-text-primary rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate">
                  {enumCurrentLabel}
                </span>
                <span className="flex-1" />
              </>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleDropdown()
                  ;(e.currentTarget.parentElement as HTMLElement)?.focus()
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Diamond size={12} />
              </button>
            </div>
          )
        )}

        {dropdownJSX}
      </div>
    </div>
  )
}
