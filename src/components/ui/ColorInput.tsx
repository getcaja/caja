import { useState, useEffect, useRef } from 'react'
import { Diamond } from 'lucide-react'
import { Popover } from './Popover'
import { ColorGridPicker } from './ColorGridPicker'
import type { DesignValue } from '../../types/frame'

const VALID_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Capitalize token for pill display: "white" → "White", "slate-500" → "Slate 500" */
const formatToken = (t: string) => t.replace(/^[a-z]/, (c) => c.toUpperCase()).replace(/-/g, ' ')

export function ColorInput({
  value,
  onChange,
  label: _label,
  classPrefix,
  tooltip,
}: {
  value: DesignValue<string>
  onChange: (v: DesignValue<string>) => void
  label: string
  classPrefix?: string
  tooltip?: string
}) {
  const token = value.mode === 'token' ? value.token : null
  const colorValue = value.value

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
  const isEmpty = !stableToken && colorValue === ''
  const emptyPlaceholder = 'None'

  return (
    <div className="relative flex-1 min-w-0">
      <div
        className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-text relative"
        onClick={(e) => { if (e.target === e.currentTarget) inputRef.current?.focus() }}
      >
        <span title={tooltip} className="w-4 shrink-0 flex items-center justify-center">
          {isEmpty ? (
            <span
              className="w-3 h-3 rounded-full border overflow-hidden"
              style={{
                borderColor: 'var(--fg-subtle)',
                backgroundImage: 'repeating-conic-gradient(var(--surface-3) 0% 25%, transparent 0% 50%)',
                backgroundSize: '6px 6px',
              }}
            />
          ) : (
            <span
              className="w-3 h-3 rounded-full border"
              style={{ borderColor: 'var(--fg-subtle)', backgroundColor: colorValue || 'transparent' }}
            />
          )}
        </span>

        {stableToken && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowGrid(true)
            }}
            className="flex items-center bg-inset fg-muted rounded px-1 text-[11px] leading-[18px] font-medium min-w-0 truncate cursor-pointer hover:bg-inset"
          >
            {formatToken(stableToken)}
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
          placeholder={stableToken ? '' : emptyPlaceholder}
          className={`flex-1 ${stableToken ? 'min-w-0' : 'min-w-[20px]'} text-[12px]`}
        />

        <Popover
          open={showGrid}
          onOpenChange={setShowGrid}
          trigger={
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.stopPropagation()}
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted ${showGrid ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}
            >
              <Diamond size={12} />
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
  )
}
