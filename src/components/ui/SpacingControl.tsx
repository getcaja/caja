import { useState } from 'react'
import { Scan } from 'lucide-react'
import type { Spacing, DesignValue } from '../../types/frame'
import type { ScaleOption } from '../../data/scales'
import { TokenInput } from './TokenInput'
import { SPACING_SCALE } from '../../data/scales'

type SpacingMode = 'all' | 'axis' | 'sides'

function dvSame(a: DesignValue<number> | undefined, b: DesignValue<number> | undefined): boolean {
  if (!a || !b) return a === b
  return a.mode === b.mode && a.value === b.value && a.token === b.token
}

function detectMode(v: Spacing): SpacingMode {
  if (!v?.top || !v?.right || !v?.bottom || !v?.left) return 'all'
  const allSame = dvSame(v.top, v.bottom) && dvSame(v.left, v.right) && dvSame(v.top, v.left)
  if (allSame) return 'all'
  const axisSame = dvSame(v.top, v.bottom) && dvSame(v.left, v.right)
  if (axisSame) return 'axis'
  return 'sides'
}

const NEXT: Record<SpacingMode, SpacingMode> = {
  all: 'axis',
  axis: 'sides',
  sides: 'all',
}

const ZERO: DesignValue<number> = { mode: 'custom', value: 0 }

export function SpacingControl({
  value: rawValue,
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
  // Defensive: fill in missing sides from malformed frame data
  const value: Spacing = {
    top: rawValue?.top || ZERO,
    right: rawValue?.right || ZERO,
    bottom: rawValue?.bottom || ZERO,
    left: rawValue?.left || ZERO,
  }
  const [mode, setMode] = useState<SpacingMode>(() => detectMode(value))

  const cycle = () => {
    const next = NEXT[mode]
    setMode(next)
    if (next === 'all') {
      // Sync all sides to top value
      const v = value.top
      onChange({ top: v, right: { ...v }, bottom: { ...v }, left: { ...v } })
    } else if (next === 'axis') {
      // Sync H/V pairs
      onChange({ right: { ...value.left }, bottom: { ...value.top } })
    }
    // 'sides' — no sync needed, just expand
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-[12px]">{label}</span>
        <button
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all shrink-0"
          onClick={cycle}
          title={mode === 'all' ? 'Split H / V' : mode === 'axis' ? 'Split per side' : 'Uniform'}
        >
          <Scan size={12} />
        </button>
      </div>
      {mode === 'all' ? (
        <TokenInput
          scale={scale}
          value={value.top}
          onChange={(v) => onChange({ top: v, right: { ...v }, bottom: { ...v }, left: { ...v } })}
          min={0}
          classPrefix={classPrefix}
        />
      ) : mode === 'axis' ? (
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
      ) : (
        <div className="grid grid-cols-2 gap-1">
          <TokenInput scale={scale} value={value.top} onChange={(v) => onChange({ top: v })} min={0} label="Top" classPrefix={`${classPrefix}t`} />
          <TokenInput scale={scale} value={value.right} onChange={(v) => onChange({ right: v })} min={0} label="Right" classPrefix={`${classPrefix}r`} />
          <TokenInput scale={scale} value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} label="Bottom" classPrefix={`${classPrefix}b`} />
          <TokenInput scale={scale} value={value.left} onChange={(v) => onChange({ left: v })} min={0} label="Left" classPrefix={`${classPrefix}l`} />
        </div>
      )}
    </div>
  )
}
