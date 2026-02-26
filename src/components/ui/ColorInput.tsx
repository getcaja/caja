import { useState, useEffect, useRef } from 'react'
import { Diamond } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { Popover } from './Popover'
import { ColorGridPicker } from './ColorGridPicker'
import type { DesignValue } from '../../types/frame'

const VALID_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function ColorInput({
  value,
  onChange,
  label,
  classPrefix,
}: {
  value: DesignValue<string>
  onChange: (v: DesignValue<string>) => void
  label: string
  classPrefix?: string
}) {
  const token = value.mode === 'token' ? value.token : null
  const colorValue = value.value

  const [showPicker, setShowPicker] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [draft, setDraft] = useState(token ? '' : colorValue)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Track committed token (ignores preview changes)
  const committedTokenRef = useRef(token)
  if (!showGrid) committedTokenRef.current = token

  useEffect(() => {
    if (!focused && !showGrid) setDraft(token ? '' : colorValue)
  }, [colorValue, focused, token, showGrid])

  const commitDraft = () => {
    setFocused(false)
    if (draft === '') {
      if (token) return
      onChange({ mode: 'custom', value: '' })
      return
    }
    if (VALID_HEX.test(draft)) {
      onChange({ mode: 'custom', value: draft })
    } else {
      setDraft(token ? '' : colorValue)
    }
  }

  const handlePickerChange = (hex: string) => {
    onChange({ mode: 'custom', value: hex })
  }

  const removeToken = () => {
    onChange({ mode: 'custom', value: colorValue })
    setDraft(colorValue)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && draft === '' && token) { e.preventDefault(); removeToken(); return }
    if (e.key === 'Enter') commitDraft()
    if (e.key === 'Escape') { setDraft(token ? '' : colorValue); inputRef.current?.blur() }
  }

  const stableToken = showGrid ? committedTokenRef.current : token
  const displayValue = focused ? draft : (stableToken ? '' : colorValue)

  return (
    <div className="flex items-center gap-1.5">
      <span className="c-label">{label}</span>
      <div className="relative flex-1 min-w-0">
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
              {classPrefix ? `${classPrefix}-${stableToken}` : stableToken}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onFocus={() => { setFocused(true); setDraft(stableToken ? '' : colorValue) }}
            onBlur={() => commitDraft()}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stableToken ? '' : 'transparent'}
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
                className="w-5 h-5 flex items-center justify-center rounded shrink-0 text-text-muted hover:text-text-secondary hover:bg-surface-2"
              >
                <Diamond size={11} />
              </button>
            }
            align="end"
          >
            <div className="p-2">
              <ColorGridPicker
                value={value}
                onChange={onChange}
                onCommit={() => setShowGrid(false)}
                classPrefix={classPrefix}
              />
            </div>
          </Popover>
        </div>
      </div>
    </div>
  )
}
