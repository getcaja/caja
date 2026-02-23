import { useState } from 'react'
import { Scan } from 'lucide-react'
import type { Spacing, DesignValue } from '../../types/frame'
import type { ScaleOption } from '../../data/scales'
import { TokenInput } from './TokenInput'
import { SPACING_SCALE } from '../../data/scales'

function dvSame(a: DesignValue<number>, b: DesignValue<number>): boolean {
  return a.mode === b.mode && a.value === b.value && a.token === b.token
}

export function SpacingControl({
  value,
  onChange,
  label,
  classPrefix,
  scale = SPACING_SCALE,
}: {
  value: Spacing
  onChange: (v: Partial<Spacing>) => void
  label: string
  classPrefix: string
  scale?: ScaleOption[]
}) {
  const isHV = dvSame(value.top, value.bottom) && dvSame(value.left, value.right)
  const [perSide, setPerSide] = useState(!isHV)

  if (!perSide) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-[12px]">{label}</span>
          <button
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
            onClick={() => setPerSide(true)}
            title="Per side"
          >
            <Scan size={12} />
          </button>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-1 items-center">
          <span className="text-text-muted text-[11px]">H</span>
          <TokenInput
            scale={scale}
            value={value.left}
            onChange={(v) => onChange({ left: v, right: { ...v } })}
            min={0}
            classPrefix={`${classPrefix}x`}
          />
          <span className="text-text-muted text-[11px]">V</span>
          <TokenInput
            scale={scale}
            value={value.top}
            onChange={(v) => onChange({ top: v, bottom: { ...v } })}
            min={0}
            classPrefix={`${classPrefix}y`}
          />
        </div>
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
            setPerSide(false)
            onChange({ right: { ...value.left }, bottom: { ...value.top } })
          }}
        >
          H / V
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <TokenInput scale={scale} value={value.top} onChange={(v) => onChange({ top: v })} min={0} label="Top" classPrefix={`${classPrefix}t`} />
        <TokenInput scale={scale} value={value.right} onChange={(v) => onChange({ right: v })} min={0} label="Right" classPrefix={`${classPrefix}r`} />
        <TokenInput scale={scale} value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} label="Bottom" classPrefix={`${classPrefix}b`} />
        <TokenInput scale={scale} value={value.left} onChange={(v) => onChange({ left: v })} min={0} label="Left" classPrefix={`${classPrefix}l`} />
      </div>
    </div>
  )
}
