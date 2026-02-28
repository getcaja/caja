import { useState } from 'react'
import { Scan } from 'lucide-react'
import type { Spacing, DesignValue } from '../../types/frame'
import type { ScaleOption } from '../../data/scales'
import { TokenInput } from './TokenInput'
import { SPACING_SCALE } from '../../data/scales'

type SpacingMode = 'all' | 'axis' | 'sides'

function dvSame(a: DesignValue<number> | undefined, b: DesignValue<number> | undefined): boolean {
  if (!a || !b) return a === b
  if (!('mode' in a) || !('mode' in b)) return false
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

const ZERO: DesignValue<number> = { mode: 'custom', value: 0 }

export function SpacingControl({
  value: rawValue,
  onChange,
  label,
  classPrefix,
  labelPrefix,
  scale = SPACING_SCALE,
}: {
  value: Spacing
  onChange: (v: Partial<Spacing>) => void
  label: string
  classPrefix: string
  labelPrefix?: string
  scale?: ScaleOption[]
}) {
  const value: Spacing = {
    top: rawValue?.top || ZERO,
    right: rawValue?.right || ZERO,
    bottom: rawValue?.bottom || ZERO,
    left: rawValue?.left || ZERO,
  }
  const [expanded, setExpanded] = useState(() => detectMode(value) === 'sides')

  const toggle = () => {
    if (expanded) {
      // Collapsing → sync to axis pairs
      onChange({ right: { ...value.left }, bottom: { ...value.top } })
    }
    setExpanded(!expanded)
  }

  const P = (labelPrefix ?? classPrefix).toUpperCase()
  const txtLbl = (suffix: string) => <span className="text-[12px]">{P}{suffix}</span>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <TokenInput
          scale={scale}
          value={value.left}
          onChange={(v) => expanded ? onChange({ left: v }) : onChange({ left: v, right: { ...v } })}
          min={0}
          classPrefix={expanded ? `${classPrefix}l` : `${classPrefix}x`}
          inlineLabel={txtLbl(expanded ? 'l' : 'x')}
        />
        <TokenInput
          scale={scale}
          value={value.top}
          onChange={(v) => expanded ? onChange({ top: v }) : onChange({ top: v, bottom: { ...v } })}
          min={0}
          classPrefix={expanded ? `${classPrefix}t` : `${classPrefix}y`}
          inlineLabel={txtLbl(expanded ? 't' : 'y')}
        />
        <button
          type="button"
          className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
            expanded
              ? 'text-blue-400 bg-blue-400/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
          }`}
          onClick={toggle}
        >
          <Scan size={12} />
        </button>
      </div>
      {expanded && (
        <div className="flex items-center gap-2">
          <TokenInput scale={scale} value={value.right} onChange={(v) => onChange({ right: v })} min={0} classPrefix={`${classPrefix}r`} inlineLabel={txtLbl('r')} />
          <TokenInput scale={scale} value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} classPrefix={`${classPrefix}b`} inlineLabel={txtLbl('b')} />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </div>
  )
}
