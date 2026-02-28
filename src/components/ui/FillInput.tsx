import { useState, useEffect, useRef } from 'react'
import { Diamond } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { Popover } from './Popover'
import { TokenInput } from './TokenInput'
import { ColorGridPicker } from './ColorGridPicker'
import { OPACITY_SCALE } from '../../data/scales'
import type { DesignValue } from '../../types/frame'

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
  colorClassPrefix,
}: {
  color: DesignValue<string>
  opacity: DesignValue<number>
  onColorChange: (v: DesignValue<string>) => void
  onOpacityChange: (v: DesignValue<number>) => void
  label: string
  colorClassPrefix?: string
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [showGrid, setShowGrid] = useState(false)

  const colorToken = color.mode === 'token' ? color.token : null
  const colorValue = color.value

  const [hexDraft, setHexDraft] = useState(stripHash(colorValue))
  const [hexFocused, setHexFocused] = useState(false)
  const hexRef = useRef<HTMLInputElement>(null)

  // Track the committed token (ignores preview changes)
  const committedTokenRef = useRef(colorToken)
  if (!showGrid) committedTokenRef.current = colorToken

  useEffect(() => {
    if (!hexFocused && !showGrid) setHexDraft(colorToken ? '' : stripHash(colorValue))
  }, [colorValue, hexFocused, colorToken, showGrid])

  const handlePickerChange = (hex: string) => {
    onColorChange({ mode: 'custom', value: hex })
  }

  const commitHex = () => {
    setHexFocused(false)
    if (hexDraft === '') {
      if (colorToken) return
      onColorChange({ mode: 'custom', value: '' })
      return
    }
    if (VALID_HEX.test(hexDraft)) {
      onColorChange({ mode: 'custom', value: `#${hexDraft}` })
    } else {
      setHexDraft(colorToken ? '' : stripHash(colorValue))
    }
  }

  const removeColorToken = () => {
    onColorChange({ mode: 'custom', value: colorValue })
    setHexDraft(stripHash(colorValue))
    requestAnimationFrame(() => {
      hexRef.current?.focus()
      hexRef.current?.select()
    })
  }

  const handleHexKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && hexDraft === '' && colorToken) { e.preventDefault(); removeColorToken(); return }
    if (e.key === 'Enter') commitHex()
    if (e.key === 'Escape') { setHexDraft(colorToken ? '' : stripHash(colorValue)); hexRef.current?.blur() }
  }

  // Use committed token for UI (pill, hex, icon) so preview doesn't cause layout shifts
  const stableToken = showGrid ? committedTokenRef.current : colorToken
  const displayHex = hexFocused ? hexDraft : (stableToken ? '' : stripHash(colorValue))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="c-label">{label}</span>
        <div className="flex-1 min-w-0">
          <div
            className="group c-scale-input flex items-center gap-1.5 !px-1.5 overflow-hidden cursor-text"
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
                  style={{ backgroundColor: colorValue || 'transparent' }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              }
            >
              <div className="p-2">
                <HexColorPicker
                  color={colorValue || '#000000'}
                  onChange={handlePickerChange}
                  style={{ width: 200, height: 160 }}
                />
              </div>
            </Popover>

            {stableToken && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowGrid(true)
                }}
                className="flex items-center gap-1 bg-surface-3 text-text-primary rounded px-1.5 text-[11px] leading-[18px] font-medium shrink-0 cursor-pointer hover:bg-surface-3/80"
              >
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: colorValue }} />
                {colorClassPrefix ? `${colorClassPrefix}-${stableToken}` : stableToken}
              </button>
            )}

            <input
              ref={hexRef}
              type="text"
              value={displayHex}
              onFocus={() => { setHexFocused(true); setHexDraft(stableToken ? '' : stripHash(colorValue)) }}
              onBlur={() => commitHex()}
              onChange={(e) => setHexDraft(e.target.value)}
              onKeyDown={handleHexKeyDown}
              placeholder={stableToken ? '' : 'None'}
              className="flex-1 min-w-0 text-[12px]"
            />

            <Popover
              open={showGrid}
              onOpenChange={setShowGrid}
              trigger={
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`w-5 h-5 flex items-center justify-center rounded shrink-0 text-text-muted hover:text-text-secondary hover:bg-surface-2 transition-opacity ${showGrid ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
                >
                  <Diamond size={12} />
                </button>
              }
              align="end"
            >
              <div className="p-2">
                <ColorGridPicker
                  value={color}
                  onChange={onColorChange}
                  onCommit={() => setShowGrid(false)}
                  classPrefix={colorClassPrefix}
                />
              </div>
            </Popover>
          </div>
        </div>
      </div>

      <TokenInput
        scale={OPACITY_SCALE}
        value={opacity}
        onChange={onOpacityChange}
        min={0}
        unit="%"
        classPrefix="opacity"
        defaultValue={100}
        label="Opacity"
      />
    </div>
  )
}
