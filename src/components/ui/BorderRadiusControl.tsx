import { useState } from 'react'
import { Scan } from 'lucide-react'
import type { BorderRadius, DesignValue } from '../../types/frame'
import { ScaleInput } from './ScaleInput'
import { BORDER_RADIUS_SCALE } from '../../data/scales'

export function BorderRadiusControl({
  value,
  onChange,
}: {
  value: BorderRadius
  onChange: (v: Partial<BorderRadius>) => void
}) {
  const allEqual = value.topLeft.value === value.topRight.value
    && value.topRight.value === value.bottomRight.value
    && value.bottomRight.value === value.bottomLeft.value
    && value.topLeft.mode === value.topRight.mode
    && value.topRight.mode === value.bottomRight.mode
    && value.bottomRight.mode === value.bottomLeft.mode
  const [uniform, setUniform] = useState(allEqual)

  if (uniform) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="c-label">Radius</span>
        <ScaleInput
          scale={BORDER_RADIUS_SCALE}
          value={value.topLeft}
          onChange={(v) => onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })}
          min={0}
          classPrefix="rounded"
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
            const v = value.topLeft
            onChange({ topLeft: v, topRight: { ...v }, bottomRight: { ...v }, bottomLeft: { ...v } })
          }}
        >
          Uniform
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <ScaleInput scale={BORDER_RADIUS_SCALE} value={value.topLeft} onChange={(v) => onChange({ topLeft: v })} min={0} label="TL" classPrefix="rounded-tl" />
        <ScaleInput scale={BORDER_RADIUS_SCALE} value={value.topRight} onChange={(v) => onChange({ topRight: v })} min={0} label="TR" classPrefix="rounded-tr" />
        <ScaleInput scale={BORDER_RADIUS_SCALE} value={value.bottomLeft} onChange={(v) => onChange({ bottomLeft: v })} min={0} label="BL" classPrefix="rounded-bl" />
        <ScaleInput scale={BORDER_RADIUS_SCALE} value={value.bottomRight} onChange={(v) => onChange({ bottomRight: v })} min={0} label="BR" classPrefix="rounded-br" />
      </div>
    </div>
  )
}
