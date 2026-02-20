import { useState, useEffect } from 'react'
import type { SizeValue } from '../../types/frame'
import { ToggleGroup } from './ToggleGroup'

export function InlineSizeControl({
  value,
  onChange,
  label,
}: {
  value: SizeValue
  onChange: (v: Partial<SizeValue>) => void
  label: string
}) {
  const [draft, setDraft] = useState(String(value.value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value.value))
  }, [value.value, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value.value))
      return
    }
    const clamped = Math.max(0, n)
    onChange({ value: clamped })
    setDraft(String(clamped))
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="c-label">{label}</span>
      <ToggleGroup
        value={value.mode}
        options={[
          { value: 'default', label: 'Auto' },
          { value: 'hug', label: 'Hug' },
          { value: 'fill', label: 'Fill' },
          { value: 'fixed', label: 'Fixed' },
        ]}
        onChange={(mode) => onChange({ mode: mode as SizeValue['mode'] })}
        className="flex-1"
      />
      {value.mode === 'fixed' && (
        <input
          type="text"
          inputMode="numeric"
          value={focused ? draft : String(value.value)}
          onFocus={() => { setFocused(true); setDraft(String(value.value)) }}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') { e.preventDefault(); const v = value.value + 1; onChange({ value: v }); setDraft(String(v)) }
            if (e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, value.value - 1); onChange({ value: v }); setDraft(String(v)) }
          }}
          className="w-14 c-input px-1.5 py-0.5"
        />
      )}
    </div>
  )
}
