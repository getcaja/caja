import { useState } from 'react'
import { Scan, Link } from 'lucide-react'
import type { BorderRadius } from '../../types/frame'
import { TokenInput } from './TokenInput'
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[12px]">Radius</span>
        <button
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
          onClick={() => {
            if (!uniform) {
              setUniform(true)
              const v = value.topLeft
              onChange({ topLeft: v, topRight: { ...v }, bottomRight: { ...v }, bottomLeft: { ...v } })
            } else {
              setUniform(false)
            }
          }}
          title={uniform ? 'Per corner' : 'Link corners'}
        >
          {uniform ? <Scan size={12} /> : <Link size={12} />}
        </button>
      </div>
      {uniform ? (
        <TokenInput
          scale={BORDER_RADIUS_SCALE}
          value={value.topLeft}
          onChange={(v) => onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })}
          min={0}
          classPrefix="rounded"
        />
      ) : (
        <div className="grid grid-cols-2 gap-1">
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topLeft} onChange={(v) => onChange({ topLeft: v })} min={0} label="TL" classPrefix="rounded-tl" />
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topRight} onChange={(v) => onChange({ topRight: v })} min={0} label="TR" classPrefix="rounded-tr" />
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomLeft} onChange={(v) => onChange({ bottomLeft: v })} min={0} label="BL" classPrefix="rounded-bl" />
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomRight} onChange={(v) => onChange({ bottomRight: v })} min={0} label="BR" classPrefix="rounded-br" />
        </div>
      )}
    </div>
  )
}
