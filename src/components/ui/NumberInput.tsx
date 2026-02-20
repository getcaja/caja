import { useState, useEffect } from 'react'

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  label,
  compact,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  compact?: boolean
}) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value))
  }, [value, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value))
      return
    }
    const clamped = max !== undefined ? Math.min(max, Math.max(min, n)) : Math.max(min, n)
    onChange(clamped)
    setDraft(String(clamped))
  }

  return (
    <div className="flex items-center gap-1.5">
      {label && <span className={compact ? 'c-label-sm' : 'c-label'}>{label}</span>}
      <input
        type="text"
        inputMode="numeric"
        value={focused ? draft : String(value)}
        onFocus={() => { setFocused(true); setDraft(String(value)) }}
        onBlur={commit}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'ArrowUp') { e.preventDefault(); const v = Math.max(min, value + step); onChange(v); setDraft(String(v)) }
          if (e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(min, value - step); onChange(v); setDraft(String(v)) }
        }}
        className="w-full c-input"
      />
      {!compact && <div className="w-5 shrink-0" />}
    </div>
  )
}
