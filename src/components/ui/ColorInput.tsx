import { useState, useEffect, useRef, useCallback } from 'react'
import { Diamond, Unlink, Check } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { Popover } from './Popover'
import { COLOR_SCALE } from '../../data/scales'
import type { ColorScaleOption } from '../../data/scales'

// Accepts #RGB, #RRGGBB, #RRGGBBAA
const VALID_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [showTokens, setShowTokens] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focused) setDraft(token ? '' : value)
    if (token) {
      const m = COLOR_SCALE.find((s) => s.token === token)
      if (m && m.value !== value) {
        setToken(null)
        if (!focused) setDraft(value)
      }
    }
  }, [value, focused, token])

  useEffect(() => {
    if (!showTokens || !dropdownRef.current || selectedIdx < 0) return
    const item = dropdownRef.current.children[selectedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx, showTokens])

  useEffect(() => {
    if (!showTokens) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTokens(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTokens])

  const commitDraft = () => {
    setFocused(false)
    if (draft === '') {
      if (token) return // token is active, empty draft is expected
      onChange('')
      return
    }
    if (VALID_HEX.test(draft)) {
      setToken(null)
      onChange(draft)
    } else {
      setDraft(token ? '' : value)
    }
  }

  const handlePickerChange = (hex: string) => {
    setToken(null)
    onChange(hex)
  }

  const selectToken = useCallback((opt: ColorScaleOption) => {
    setToken(opt.token)
    onChange(opt.value)
    setDraft('')
    setShowTokens(false)
    setSelectedIdx(-1)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [onChange])

  const removeToken = useCallback(() => {
    setToken(null)
    setDraft(value)
    setShowTokens(false)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showTokens) {
      const maxIdx = COLOR_SCALE.length - 1
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, maxIdx)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIdx >= 0 && selectedIdx < COLOR_SCALE.length) selectToken(COLOR_SCALE[selectedIdx])
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowTokens(false); return }
    }
    if (e.key === 'Backspace' && draft === '' && token) { e.preventDefault(); removeToken(); return }
    if (e.key === 'Enter') commitDraft()
    if (e.key === 'Escape') { setDraft(token ? '' : value); inputRef.current?.blur() }
  }

  const displayValue = focused ? draft : (token ? '' : value)

  return (
    <div className="flex items-center gap-1.5">
      <span className="c-label">{label}</span>
      <div ref={containerRef} className="relative flex-1 min-w-0">
        <div
          className="c-scale-input flex items-center gap-1.5 !px-1.5 overflow-hidden cursor-text"
          onClick={(e) => { if (e.target === e.currentTarget) inputRef.current?.focus() }}
        >
          <Popover
            open={showPicker}
            onOpenChange={setShowPicker}
            trigger={
              <button
                type="button"
                tabIndex={-1}
                className="w-4 h-4 rounded border border-border shrink-0 hover:border-border-accent"
                style={{ backgroundColor: value || 'transparent' }}
                onMouseDown={(e) => e.stopPropagation()}
              />
            }
          >
            <div className="p-2">
              <HexColorPicker
                color={value || '#000000'}
                onChange={handlePickerChange}
                style={{ width: 200, height: 160 }}
              />
            </div>
          </Popover>

          {token && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (showTokens) setShowTokens(false)
                else {
                  setShowTokens(true)
                  setSelectedIdx(COLOR_SCALE.findIndex((s) => s.token === token))
                }
              }}
              className="flex items-center gap-1 bg-surface-3 text-text-primary rounded px-1.5 text-[11px] leading-[18px] font-medium shrink-0 cursor-pointer hover:bg-surface-3/80"
            >
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: value }} />
              {token}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={() => { setFocused(true); setDraft(token ? '' : value) }}
            onBlur={() => { commitDraft(); setShowTokens(false) }}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={token ? '' : 'transparent'}
            className="flex-1 min-w-0 text-[12px]"
          />

          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              if (token) {
                removeToken()
              } else {
                setShowTokens(!showTokens)
                if (!showTokens) setSelectedIdx(-1)
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

        {showTokens && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
          >
            {COLOR_SCALE.map((opt, i) => (
              <button
                key={opt.token}
                onMouseDown={(e) => { e.preventDefault(); selectToken(opt) }}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                  i === selectedIdx
                    ? 'bg-surface-3/60 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm border border-border shrink-0" style={{ backgroundColor: opt.value }} />
                  <span className="font-medium">{opt.token}</span>
                  {opt.token === token && <Check size={10} />}
                </span>
                <span className="text-text-muted">{opt.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
