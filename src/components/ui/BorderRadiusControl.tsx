import { useState, useEffect } from 'react'
import { Scan } from 'lucide-react'
import type { BorderRadius } from '../../types/frame'
import { NumberInput } from './NumberInput'

export function BorderRadiusControl({
  value,
  onChange,
}: {
  value: BorderRadius
  onChange: (v: Partial<BorderRadius>) => void
}) {
  const allEqual = value.topLeft === value.topRight
    && value.topRight === value.bottomRight
    && value.bottomRight === value.bottomLeft
  const [uniform, setUniform] = useState(allEqual)

  const [draft, setDraft] = useState(String(value.topLeft))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(String(value.topLeft))
  }, [value.topLeft, focused])

  const commit = () => {
    setFocused(false)
    const n = Number(draft)
    if (draft === '' || isNaN(n)) {
      setDraft(String(value.topLeft))
      return
    }
    const clamped = Math.max(0, n)
    onChange({ topLeft: clamped, topRight: clamped, bottomRight: clamped, bottomLeft: clamped })
    setDraft(String(clamped))
  }

  if (uniform) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="c-label">Radius</span>
        <input
          type="text"
          inputMode="numeric"
          value={focused ? draft : String(value.topLeft)}
          onFocus={() => { setFocused(true); setDraft(String(value.topLeft)) }}
          onBlur={commit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const v = value.topLeft + 1
              onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })
              setDraft(String(v))
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              const v = Math.max(0, value.topLeft - 1)
              onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })
              setDraft(String(v))
            }
          }}
          className="flex-1 c-input"
        />
        <button
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
          onClick={() => setUniform(false)}
          title="Per corner"
        >
          <Scan size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[12px]">Radius</span>
        <button
          className="text-[12px] text-text-muted hover:text-accent transition-colors"
          onClick={() => {
            setUniform(true)
            onChange({ topLeft: value.topLeft, topRight: value.topLeft, bottomRight: value.topLeft, bottomLeft: value.topLeft })
          }}
        >
          Uniform
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <NumberInput value={value.topLeft} onChange={(v) => onChange({ topLeft: v })} min={0} label="TL" compact />
        <NumberInput value={value.topRight} onChange={(v) => onChange({ topRight: v })} min={0} label="TR" compact />
        <NumberInput value={value.bottomLeft} onChange={(v) => onChange({ bottomLeft: v })} min={0} label="BL" compact />
        <NumberInput value={value.bottomRight} onChange={(v) => onChange({ bottomRight: v })} min={0} label="BR" compact />
      </div>
    </div>
  )
}
