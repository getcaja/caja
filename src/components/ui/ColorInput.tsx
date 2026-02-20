import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { HexAlphaColorPicker } from 'react-colorful'
import { Popover } from './Popover'

// Accepts #RGB, #RRGGBB, #RRGGBBAA
const VALID_HEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

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

  useEffect(() => {
    if (!focused) setDraft(value)
  }, [value, focused])

  const commitDraft = () => {
    setFocused(false)
    if (draft === '') {
      onChange('')
      return
    }
    if (VALID_HEX.test(draft)) {
      onChange(draft)
    } else {
      setDraft(value)
    }
  }

  // Strip trailing "ff" alpha from the picker output for cleaner values
  const handlePickerChange = (hex: string) => {
    if (hex.length === 9 && hex.endsWith('ff')) {
      onChange(hex.slice(0, 7))
    } else {
      onChange(hex)
    }
  }

  return (
    <div>
      <div className="flex gap-1.5 items-center">
        <div className="w-14 shrink-0 flex items-center gap-1.5">
          <span className="text-text-muted text-[12px]">{label}</span>
          <Popover
            open={showPicker}
            onOpenChange={setShowPicker}
            trigger={
              <button
                className="w-4 h-4 rounded border border-border shrink-0 transition-all hover:border-border-accent"
                style={{ backgroundColor: value || 'transparent' }}
              />
            }
          >
            <div className="p-2 rounded-lg overflow-hidden">
              <HexAlphaColorPicker
                color={value || '#000000'}
                onChange={handlePickerChange}
                style={{ width: 200, height: 160 }}
              />
            </div>
          </Popover>
        </div>
        <input
          type="text"
          value={focused ? draft : value}
          onFocus={() => { setFocused(true); setDraft(value) }}
          onBlur={commitDraft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitDraft() }}
          placeholder="transparent"
          className="flex-1 c-input font-mono px-1.5"
        />
        <div className="w-5 h-5 shrink-0 flex items-center justify-center">
          {value && (
            <button
              className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-destructive rounded hover:bg-destructive/10 transition-all"
              onClick={() => onChange('')}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
