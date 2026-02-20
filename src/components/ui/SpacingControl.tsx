import { useState, useEffect } from 'react'
import { Scan } from 'lucide-react'
import type { Spacing } from '../../types/frame'
import { NumberInput } from './NumberInput'

export function SpacingControl({
  value,
  onChange,
  label,
}: {
  value: Spacing
  onChange: (v: Partial<Spacing>) => void
  label: string
}) {
  const isUniform = value.top === value.right && value.right === value.bottom && value.bottom === value.left
  const [uniform, setUniform] = useState(isUniform)

  const [draft, setDraft] = useState(String(value.top))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value.top))
  }, [value.top, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value.top))
      return
    }
    const clamped = Math.max(0, n)
    onChange({ top: clamped, right: clamped, bottom: clamped, left: clamped })
    setDraft(String(clamped))
  }

  if (uniform) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="c-label">{label}</span>
        <input
          type="text"
          inputMode="numeric"
          value={focused ? draft : String(value.top)}
          onFocus={() => { setFocused(true); setDraft(String(value.top)) }}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const v = value.top + 1
              onChange({ top: v, right: v, bottom: v, left: v })
              setDraft(String(v))
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              const v = Math.max(0, value.top - 1)
              onChange({ top: v, right: v, bottom: v, left: v })
              setDraft(String(v))
            }
          }}
          className="flex-1 c-input"
        />
        <button
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
          onClick={() => setUniform(false)}
          title="Per side"
        >
          <Scan size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[12px]">{label}</span>
        <button
          className="text-[12px] text-text-muted hover:text-accent transition-colors"
          onClick={() => {
            setUniform(true)
            onChange({ top: value.top, right: value.top, bottom: value.top, left: value.top })
          }}
        >
          Uniform
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput value={value.top} onChange={(v) => onChange({ top: v })} min={0} label="T" compact />
        <NumberInput value={value.right} onChange={(v) => onChange({ right: v })} min={0} label="R" compact />
        <NumberInput value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} label="B" compact />
        <NumberInput value={value.left} onChange={(v) => onChange({ left: v })} min={0} label="L" compact />
      </div>
    </div>
  )
}
