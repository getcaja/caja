import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { Popover } from './Popover'

const VALID_HEX = /^#([0-9a-fA-F]{3}){1,2}$/

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
              <HexColorPicker
                color={value || '#000000'}
                onChange={onChange}
                style={{ width: 200, height: 140 }}
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
          placeholder="#000"
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
