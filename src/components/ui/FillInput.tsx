import { useState, useEffect, useRef, useCallback } from 'react'
import { Diamond, Unlink, Check } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { Popover } from './Popover'
import { COLOR_SCALE, OPACITY_SCALE } from '../../data/scales'
import type { ColorScaleOption, ScaleOption } from '../../data/scales'

const VALID_HEX = /^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function stripHash(hex: string): string {
  if (!hex) return ''
  return hex.startsWith('#') ? hex.slice(1) : hex
}

export function FillInput({
  color,
  opacity,
  onColorChange,
  onOpacityChange,
  label,
}: {
  color: string
  opacity: number
  onColorChange: (v: string) => void
  onOpacityChange: (v: number) => void
  label: string
}) {
  const [showPicker, setShowPicker] = useState(false)

  // --- Color state ---
  const [hexDraft, setHexDraft] = useState(stripHash(color))
  const [hexFocused, setHexFocused] = useState(false)
  const [colorToken, setColorToken] = useState<string | null>(null)
  const [showColorTokens, setShowColorTokens] = useState(false)
  const [colorTokenIdx, setColorTokenIdx] = useState(-1)
  const hexRef = useRef<HTMLInputElement>(null)
  const colorContainerRef = useRef<HTMLDivElement>(null)
  const colorDropdownRef = useRef<HTMLDivElement>(null)

  // --- Opacity state ---
  const [opDraft, setOpDraft] = useState(String(opacity))
  const [opFocused, setOpFocused] = useState(false)
  const [opToken, setOpToken] = useState<string | null>(null)
  const [showOpTokens, setShowOpTokens] = useState(false)
  const [opTokenIdx, setOpTokenIdx] = useState(-1)
  const opRef = useRef<HTMLInputElement>(null)
  const opContainerRef = useRef<HTMLDivElement>(null)
  const opDropdownRef = useRef<HTMLDivElement>(null)

  // --- Sync drafts ---
  useEffect(() => {
    if (!hexFocused) setHexDraft(colorToken ? '' : stripHash(color))
    if (colorToken) {
      const m = COLOR_SCALE.find((s) => s.token === colorToken)
      if (m && m.value !== color) {
        setColorToken(null)
        if (!hexFocused) setHexDraft(stripHash(color))
      }
    }
  }, [color, hexFocused, colorToken])

  useEffect(() => {
    if (!opFocused) setOpDraft(opToken ? '' : String(opacity))
    if (opToken) {
      const m = OPACITY_SCALE.find((s) => s.token === opToken)
      if (m && m.value !== opacity) {
        setOpToken(null)
        if (!opFocused) setOpDraft(String(opacity))
      }
    }
  }, [opacity, opFocused, opToken])

  // --- Scroll selected into view ---
  useEffect(() => {
    if (!showColorTokens || !colorDropdownRef.current || colorTokenIdx < 0) return
    const item = colorDropdownRef.current.children[colorTokenIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [colorTokenIdx, showColorTokens])

  useEffect(() => {
    if (!showOpTokens || !opDropdownRef.current || opTokenIdx < 0) return
    const item = opDropdownRef.current.children[opTokenIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [opTokenIdx, showOpTokens])

  // --- Close dropdowns on outside click ---
  useEffect(() => {
    if (!showColorTokens && !showOpTokens) return
    const handleClick = (e: MouseEvent) => {
      if (showColorTokens && colorContainerRef.current && !colorContainerRef.current.contains(e.target as Node)) {
        setShowColorTokens(false)
      }
      if (showOpTokens && opContainerRef.current && !opContainerRef.current.contains(e.target as Node)) {
        setShowOpTokens(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showColorTokens, showOpTokens])

  const handlePickerChange = (hex: string) => {
    setColorToken(null)
    onColorChange(hex)
  }

  // --- Color commits ---
  const commitHex = () => {
    setHexFocused(false)
    if (hexDraft === '') {
      if (colorToken) return // token is active, empty draft is expected
      onColorChange('')
      return
    }
    if (VALID_HEX.test(hexDraft)) {
      setColorToken(null)
      onColorChange(`#${hexDraft}`)
    } else {
      setHexDraft(colorToken ? '' : stripHash(color))
    }
  }

  const selectColorToken = useCallback((opt: ColorScaleOption) => {
    setColorToken(opt.token)
    onColorChange(opt.value)
    setHexDraft('')
    setShowColorTokens(false)
    setColorTokenIdx(-1)
    requestAnimationFrame(() => hexRef.current?.focus())
  }, [onColorChange])

  const removeColorToken = useCallback(() => {
    setColorToken(null)
    setHexDraft(stripHash(color))
    setShowColorTokens(false)
    requestAnimationFrame(() => {
      hexRef.current?.focus()
      hexRef.current?.select()
    })
  }, [color])

  // --- Opacity commits ---
  const commitOpacity = () => {
    setOpFocused(false)
    if (opDraft === '' && opToken) return // token is active, empty draft is expected
    const n = Number(opDraft)
    if (opDraft === '' || isNaN(n)) {
      setOpDraft(String(opacity))
      return
    }
    const clamped = Math.min(100, Math.max(0, Math.round(n)))
    setOpToken(null)
    onOpacityChange(clamped)
    setOpDraft(String(clamped))
  }

  const selectOpToken = useCallback((opt: ScaleOption) => {
    setOpToken(opt.token)
    onOpacityChange(opt.value)
    setOpDraft('')
    setShowOpTokens(false)
    setOpTokenIdx(-1)
    requestAnimationFrame(() => opRef.current?.focus())
  }, [onOpacityChange])

  const removeOpToken = useCallback(() => {
    setOpToken(null)
    setOpDraft(String(opacity))
    setShowOpTokens(false)
    requestAnimationFrame(() => {
      opRef.current?.focus()
      opRef.current?.select()
    })
  }, [opacity])

  // --- Keyboard handlers ---
  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (showColorTokens) {
      const maxIdx = COLOR_SCALE.length - 1
      if (e.key === 'ArrowDown') { e.preventDefault(); setColorTokenIdx((i) => Math.min(i + 1, maxIdx)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setColorTokenIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (colorTokenIdx >= 0 && colorTokenIdx < COLOR_SCALE.length) selectColorToken(COLOR_SCALE[colorTokenIdx])
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowColorTokens(false); return }
    }
    if (e.key === 'Backspace' && hexDraft === '' && colorToken) { e.preventDefault(); removeColorToken(); return }
    if (e.key === 'Enter') commitHex()
    if (e.key === 'Escape') { setHexDraft(colorToken ? '' : stripHash(color)); hexRef.current?.blur() }
  }

  const handleOpKeyDown = (e: React.KeyboardEvent) => {
    if (showOpTokens) {
      const maxIdx = OPACITY_SCALE.length - 1
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpTokenIdx((i) => Math.min(i + 1, maxIdx)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setOpTokenIdx((i) => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (opTokenIdx >= 0 && opTokenIdx < OPACITY_SCALE.length) selectOpToken(OPACITY_SCALE[opTokenIdx])
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowOpTokens(false); return }
    }
    if (e.key === 'Backspace' && opDraft === '' && opToken) { e.preventDefault(); removeOpToken(); return }
    if (e.key === 'Enter') commitOpacity()
    if (e.key === 'Escape') { setOpDraft(opToken ? '' : String(opacity)); opRef.current?.blur() }
    if (!showOpTokens && !opToken) {
      if (e.key === 'ArrowUp') { e.preventDefault(); onOpacityChange(Math.min(100, opacity + 1)) }
      if (e.key === 'ArrowDown') { e.preventDefault(); onOpacityChange(Math.max(0, opacity - 1)) }
    }
  }

  const displayHex = hexFocused ? hexDraft : (colorToken ? '' : stripHash(color))
  const displayOp = opFocused ? opDraft : (opToken ? '' : String(opacity))

  return (
    <div className="flex items-center gap-1.5">
      <span className="c-label">{label}</span>

      <div className="flex flex-1 min-w-0 gap-1">
        {/* === Color input === */}
        <div ref={colorContainerRef} className="relative flex-1 min-w-0">
          <div
            className="c-scale-input flex items-center gap-1.5 !px-1.5 overflow-hidden cursor-text"
            onClick={(e) => { if (e.target === e.currentTarget) hexRef.current?.focus() }}
          >
            <Popover
              open={showPicker}
              onOpenChange={setShowPicker}
              trigger={
                <button
                  type="button"
                  tabIndex={-1}
                  className="w-4 h-4 rounded border border-border shrink-0 hover:border-border-accent"
                  style={{ backgroundColor: color || 'transparent' }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              }
            >
              <div className="p-2">
                <HexColorPicker
                  color={color || '#000000'}
                  onChange={handlePickerChange}
                  style={{ width: 200, height: 160 }}
                />
              </div>
            </Popover>

            {colorToken && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (showColorTokens) setShowColorTokens(false)
                  else {
                    setShowColorTokens(true)
                    setColorTokenIdx(COLOR_SCALE.findIndex((s) => s.token === colorToken))
                  }
                }}
                className="flex items-center gap-1 bg-surface-3 text-text-primary rounded px-1.5 text-[11px] leading-[18px] font-medium shrink-0 cursor-pointer hover:bg-surface-3/80"
              >
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                {colorToken}
              </button>
            )}

            <input
              ref={hexRef}
              type="text"
              value={displayHex}
              onFocus={() => { setHexFocused(true); setHexDraft(colorToken ? '' : stripHash(color)) }}
              onBlur={() => { commitHex(); setShowColorTokens(false) }}
              onChange={(e) => setHexDraft(e.target.value)}
              onKeyDown={handleHexKeyDown}
              placeholder={colorToken ? '' : 'None'}
              className="flex-1 min-w-0 text-[12px]"
            />

            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                if (colorToken) {
                  removeColorToken()
                } else {
                  setShowColorTokens(!showColorTokens)
                  if (!showColorTokens) setColorTokenIdx(-1)
                }
                hexRef.current?.focus()
              }}
              className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                colorToken
                  ? 'text-text-muted hover:text-text-primary hover:bg-surface-3/60'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {colorToken ? <Unlink size={11} /> : <Diamond size={11} />}
            </button>
          </div>

          {showColorTokens && (
            <div
              ref={colorDropdownRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
            >
              {COLOR_SCALE.map((opt, i) => (
                <button
                  key={opt.token}
                  onMouseDown={(e) => { e.preventDefault(); selectColorToken(opt) }}
                  onMouseEnter={() => setColorTokenIdx(i)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                    i === colorTokenIdx
                      ? 'bg-surface-3/60 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm border border-border shrink-0" style={{ backgroundColor: opt.value }} />
                    <span className="font-medium">{opt.token}</span>
                    {opt.token === colorToken && <Check size={10} />}
                  </span>
                  <span className="text-text-muted">{opt.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* === Opacity input === */}
        <div ref={opContainerRef} className="relative w-24 min-w-0">
          <div
            className="c-scale-input flex items-center gap-1 !px-1.5 overflow-hidden cursor-text"
            onClick={(e) => { if (e.target === e.currentTarget) opRef.current?.focus() }}
          >
            {opToken && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (showOpTokens) setShowOpTokens(false)
                  else {
                    setShowOpTokens(true)
                    setOpTokenIdx(OPACITY_SCALE.findIndex((s) => s.token === opToken))
                  }
                }}
                className="flex items-center bg-surface-3 text-text-primary rounded px-1.5 text-[11px] leading-[18px] font-medium shrink-0 cursor-pointer hover:bg-surface-3/80"
              >
                {opToken}%
              </button>
            )}

            <input
              ref={opRef}
              type="text"
              inputMode="numeric"
              value={displayOp}
              onFocus={() => { setOpFocused(true); setOpDraft(opToken ? '' : String(opacity)) }}
              onBlur={() => { commitOpacity(); setShowOpTokens(false) }}
              onChange={(e) => setOpDraft(e.target.value)}
              onKeyDown={handleOpKeyDown}
              placeholder={opToken ? '' : undefined}
              className="flex-1 min-w-0 text-[12px]"
            />
            {!opToken && <span className="text-text-muted text-[11px] shrink-0 select-none">%</span>}

            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault()
                if (opToken) {
                  removeOpToken()
                } else {
                  setShowOpTokens(!showOpTokens)
                  if (!showOpTokens) setOpTokenIdx(-1)
                }
                opRef.current?.focus()
              }}
              className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                opToken
                  ? 'text-text-muted hover:text-text-primary hover:bg-surface-3/60'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
              }`}
            >
              {opToken ? <Unlink size={11} /> : <Diamond size={11} />}
            </button>
          </div>

          {showOpTokens && (
            <div
              ref={opDropdownRef}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-surface-2 border border-border-accent rounded-lg shadow-2xl overflow-y-auto max-h-[200px] py-1"
            >
              {OPACITY_SCALE.map((opt, i) => (
                <button
                  key={opt.token}
                  onMouseDown={(e) => { e.preventDefault(); selectOpToken(opt) }}
                  onMouseEnter={() => setOpTokenIdx(i)}
                  className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                    i === opTokenIdx
                      ? 'bg-surface-3/60 text-text-primary'
                      : 'text-text-secondary hover:bg-surface-3/60 hover:text-text-primary'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{opt.token}%</span>
                    {opt.token === opToken && <Check size={10} />}
                  </span>
                  <span className="text-text-muted">{opt.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
