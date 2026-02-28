import { useState, useRef, useEffect, useCallback } from 'react'
import { Diamond, Check } from 'lucide-react'
import type { ScaleOption } from '../../data/scales'
import type { DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'

export interface EnumOption {
  value: string
  label: string
  token?: string
}

interface TokenInputBase {
  label?: string
  classPrefix?: string
  inlineLabel?: React.ReactNode
}

interface AutoOption {
  label: string
  active: boolean
  onToggle: () => void
}

interface TokenInputScale extends TokenInputBase {
  scale: ScaleOption[]
  value: DesignValue<number>
  onChange: (v: DesignValue<number>) => void
  options?: never
  min?: number
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
}

export type TokenInputProps = TokenInputScale | TokenInputEnum

function formatTokenLabel(prefix: string | undefined, token: string): string {
  if (!prefix) return token
  if (token === '' || token === 'DEFAULT') return prefix
  return `${prefix}-${token}`
}

// Normalized item for the shared dropdown
interface NormalizedItem {
  key: string
  token: string
  displayRight: string
}

export function TokenInput(props: TokenInputProps) {
  const { label, classPrefix, inlineLabel } = props
  const isScale = 'scale' in props && props.scale !== undefined
  const startPreview = useFrameStore((s) => s.startPreview)
  const endPreview = useFrameStore((s) => s.endPreview)

  // --- Shared state ---
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const originalRef = useRef<DesignValue<number> | string | null>(null)

  // --- Scale-only state ---
  const scaleProps = isScale ? (props as TokenInputScale) : null
  const scaleToken = scaleProps ? (scaleProps.value.mode === 'token' ? scaleProps.value.token : null) : null
  const hasToken = scaleToken !== null
  const scaleNumeric = scaleProps ? scaleProps.value.value : 0
  const scaleMin = scaleProps?.min ?? 0
  const scaleUnit = scaleProps?.unit ?? 'px'
  const scaleResetValue = scaleProps ? (scaleProps.defaultValue ?? scaleMin) : 0
  const scaleIsUnset = scaleProps ? (scaleProps.value.mode === 'custom' && scaleProps.value.value === scaleResetValue) : false

  const [draft, setDraft] = useState(scaleProps ? (hasToken ? '' : (scaleIsUnset ? '' : String(scaleNumeric))) : '')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // --- Enum-only derived ---
  const enumProps = !isScale ? (props as TokenInputEnum) : null
  const enumCurrentOpt = enumProps ? enumProps.options.find((o) => o.value === enumProps.value) : null
  const enumCurrentLabel = enumProps ? (enumCurrentOpt?.label ?? enumProps.value) : ''
  const enumIsInitial = enumProps ? (enumProps.initialValue !== undefined && enumProps.value === enumProps.initialValue) : false

  // Is the field in an "active" (non-default) state?
  const isActive = isScale
    ? (!scaleIsUnset || scaleToken !== null || (scaleProps?.autoOption?.active ?? false))
    : !enumIsInitial

  // --- Normalize items for dropdown ---
  const items: NormalizedItem[] = isScale
    ? scaleProps!.scale.map((s) => ({
        key: s.token,
        token: s.token,
        displayRight: s.token === 'auto' ? 'auto' : `${s.value}${scaleUnit}`,
      }))
    : enumProps!.options.map((o) => ({
        key: o.value,
        token: o.token ?? o.value,
        displayRight: o.label,
      }))

  // --- Sync draft when scale value changes externally ---
  useEffect(() => {
    if (!scaleProps || focused) return
    const unset = scaleProps.value.mode === 'custom' && scaleProps.value.value === scaleResetValue
    setDraft(hasToken ? '' : (unset ? '' : String(scaleNumeric)))
  }, [scaleNumeric, scaleToken, focused, scaleProps?.value.mode, scaleResetValue])

  // --- Scroll selected item into view ---
  useEffect(() => {
    if (!showDropdown || !dropdownRef.current || selectedIdx < 0) return
    const item = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showDropdown])

  // --- Open/close/toggle ---
  const openDropdown = useCallback(() => {
    setShowDropdown(true)
    if (isScale) {
      const idx = hasToken ? scaleProps!.scale.findIndex((s) => s.token === scaleToken) : -1
      setSelectedIdx(idx)
    } else {
      const idx = enumProps!.options.findIndex((o) => o.value === enumProps!.value)
      setSelectedIdx(idx)
    }
    startPreview()
  }, [isScale, scaleToken, scaleProps?.scale, enumProps?.value, enumProps?.options, startPreview])

  const closeDropdown = useCallback(() => {
    if (originalRef.current !== null) {
      if (isScale) {
        scaleProps!.onChange(originalRef.current as DesignValue<number>)
      } else {
        enumProps!.onChange(originalRef.current as string)
      }
      originalRef.current = null
    }
    setShowDropdown(false)
    setSelectedIdx(-1)
    endPreview(false)
  }, [isScale, scaleProps?.onChange, enumProps?.onChange, endPreview])

  const toggleDropdown = useCallback(() => {
    if (showDropdown) closeDropdown()
    else openDropdown()
  }, [showDropdown, closeDropdown, openDropdown])

  // --- Preview/commit/revert ---
  const previewAtIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length) return
    if (isScale) {
      const opt = scaleProps!.scale[idx]
      if (originalRef.current === null) originalRef.current = scaleProps!.value
      scaleProps!.onChange({ mode: 'token', token: opt.token, value: opt.value })
    } else {
      if (originalRef.current === null) originalRef.current = enumProps!.value
      enumProps!.onChange(enumProps!.options[idx].value)
    }
  }, [isScale, items.length, scaleProps?.scale, scaleProps?.value, scaleProps?.onChange, enumProps?.options, enumProps?.value, enumProps?.onChange])

  const commitAtIndex = useCallback((idx: number) => {
    endPreview(true)
    originalRef.current = null
    if (isScale) {
      const opt = scaleProps!.scale[idx]
      if (scaleProps!.autoOption?.active) scaleProps!.autoOption.onToggle()
      scaleProps!.onChange({ mode: 'token', token: opt.token, value: opt.value })
      setDraft('')
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
    } else {
      enumProps!.onChange(originalRef.current as string)
    }
    originalRef.current = null
  }, [isScale, scaleProps?.onChange, enumProps?.onChange])

  // --- Scale-only: remove token ---
  const removeToken = useCallback(() => {
    if (!scaleProps) return
    scaleProps.onChange({ mode: 'custom', value: scaleNumeric })
    setDraft(String(scaleNumeric))
    closeDropdown()
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [scaleProps?.onChange, scaleNumeric, closeDropdown])

  // --- Scale-only: commit draft ---
  const commitDraft = useCallback(() => {
    if (!scaleProps) return
    if (draft === '') {
      if (hasToken) return
      scaleProps.onChange({ mode: 'custom', value: scaleResetValue })
      setDraft('')
      return
    }
    const n = Number(draft)
    if (isNaN(n)) {
      setDraft(hasToken ? '' : String(scaleNumeric))
      return
    }
    const clamped = Math.max(scaleMin, n)
    const match = scaleProps.scale.find(s => s.value === clamped)
    if (match) {
      scaleProps.onChange({ mode: 'token', token: match.token, value: clamped })
      setDraft('')
    } else {
      scaleProps.onChange({ mode: 'custom', value: clamped })
      setDraft(String(clamped))
    }
  }, [scaleProps?.onChange, scaleProps?.scale, draft, scaleNumeric, scaleMin, scaleToken, scaleResetValue])

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
      const next = Math.min(selectedIdx + 1, maxIdx)
      setSelectedIdx(next)
      previewAtIndex(next)
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.max(selectedIdx - 1, 0)
      setSelectedIdx(next)
      previewAtIndex(next)
      return true
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && selectedIdx < items.length) {
        commitAtIndex(selectedIdx)
      }
      return true
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown()
      return true
    }
    return false
  }, [items.length, selectedIdx, previewAtIndex, commitAtIndex, closeDropdown])

  // --- Scale keydown handler ---
  const handleScaleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && handleDropdownKeyDown(e)) return

    if (e.key === 'Backspace' && draft === '' && hasToken) {
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
      setDraft(hasToken ? '' : (scaleProps!.value.mode === 'custom' && scaleProps!.value.value === scaleResetValue ? '' : String(scaleNumeric)))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp' && !hasToken) {
      e.preventDefault()
      const n = Math.max(scaleMin, scaleNumeric + 1)
      const match = scaleProps!.scale.find(s => s.value === n)
      if (match) {
        scaleProps!.onChange({ mode: 'token', token: match.token, value: n })
        setDraft('')
      } else {
        scaleProps!.onChange({ mode: 'custom', value: n })
        setDraft(String(n))
      }
    } else if (e.key === 'ArrowDown' && !hasToken) {
      e.preventDefault()
      const n = Math.max(scaleMin, scaleNumeric - 1)
      const match = scaleProps!.scale.find(s => s.value === n)
      if (match) {
        scaleProps!.onChange({ mode: 'token', token: match.token, value: n })
        setDraft('')
      } else {
        scaleProps!.onChange({ mode: 'custom', value: n })
        setDraft(String(n))
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
    setFocused(true)
    if (!hasToken) setDraft(scaleProps!.value.mode === 'custom' && scaleProps!.value.value === scaleResetValue ? '' : String(scaleNumeric))
  }

  const handleBlur = () => {
    setFocused(false)
    commitDraft()
    setShowDropdown(false)
  }

  // --- Committed value for check mark (enum) ---
  const enumCommittedValue = enumProps ? (originalRef.current as string | null) ?? enumProps.value : ''

  // --- Dropdown JSX (shared) ---
  const autoOpt = scaleProps?.autoOption
  const dropdownJSX = showDropdown && (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
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
            autoOpt.active
              ? 'bg-surface-3/60 text-text-primary'
              : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="font-medium">{autoOpt.label}</span>
            {autoOpt.active && <Check size={10} />}
          </span>
        </button>
      )}
      {items.map((item, i) => (
        <button
          key={item.key}
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
            <span className="font-medium">{formatTokenLabel(classPrefix, item.token)}</span>
            {isScale
              ? item.token === scaleToken && <Check size={10} />
              : item.key === enumCommittedValue && <Check size={10} />
            }
          </span>
          <span className="text-text-muted">{item.displayRight}</span>
        </button>
      ))}
    </div>
  )

  // --- Render ---
  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      {label && !inlineLabel && <span className="c-label">{label}</span>}
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
              {inlineLabel && (
                <span className={`w-4 shrink-0 flex items-center justify-center ${isActive ? 'text-text-secondary' : 'text-text-muted'}`}>{inlineLabel}</span>
              )}
              <span className="flex-1 min-w-0 text-[12px] text-text-secondary pl-0.5">{autoOpt.label}</span>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleDropdown()
                }}
                className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-opacity ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Diamond size={12} />
              </button>
            </div>
          ) : (
          <div
            className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
            onClick={() => inputRef.current?.focus()}
          >
            {inlineLabel && (
              <span className={`w-4 shrink-0 flex items-center justify-center ${isActive ? 'text-text-secondary' : 'text-text-muted'}`}>{inlineLabel}</span>
            )}
            {hasToken && (
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
                {scaleToken || `${scaleNumeric}${scaleUnit}`}
              </button>
            )}

            <input
              ref={inputRef}
              type="text"
              inputMode={hasToken ? undefined : 'numeric'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleScaleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={hasToken ? '' : (scaleIsUnset ? (scaleProps!.placeholder ?? String(scaleResetValue)) : undefined)}
              className={`flex-1 ${hasToken ? 'min-w-0' : 'min-w-[20px]'} text-[12px] text-text-primary`}
            />

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
          )
        ) : (
          // Enum mode trigger
          <div
            className="group c-scale-input flex items-center gap-0.5 pr-6 cursor-pointer relative"
            tabIndex={0}
            onClick={toggleDropdown}
            onKeyDown={handleEnumKeyDown}
          >
            {inlineLabel && (
              <span className={`w-4 shrink-0 flex items-center justify-center ${isActive ? 'text-text-secondary' : 'text-text-muted'}`}>{inlineLabel}</span>
            )}
            {enumIsInitial ? (
              <span className="flex-1 min-w-0 text-[12px] pl-0.5 truncate text-text-muted">
                {enumCurrentLabel}
              </span>
            ) : (
              <>
                <span className="flex items-center bg-surface-3 text-text-primary rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate">
                  {formatTokenLabel(classPrefix, enumCurrentOpt?.token ?? enumCurrentOpt?.value ?? enumProps!.value)}
                </span>
                <span className="flex-1" />
              </>
            )}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleDropdown()
              }}
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-opacity ${showDropdown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <Diamond size={12} />
            </button>
          </div>
        )}

        {dropdownJSX}
      </div>
    </div>
  )
}
