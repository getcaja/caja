import { useState } from 'react'
import { Scan, SquareArrowUpLeft, SquareArrowUpRight, SquareArrowDownLeft, SquareArrowDownRight, Squircle } from 'lucide-react'
import type { BorderRadius, DesignValue } from '../../types/frame'
import { TokenInput } from './TokenInput'
import { BORDER_RADIUS_SCALE } from '../../data/scales'

function dvSame(a: DesignValue<number>, b: DesignValue<number>): boolean {
  return a.mode === b.mode && a.value === b.value && a.token === b.token
}

export function BorderRadiusControl({
  value,
  onChange,
}: {
  value: BorderRadius
  onChange: (v: Partial<BorderRadius>) => void
}) {
  const allEqual = dvSame(value.topLeft, value.topRight)
    && dvSame(value.topRight, value.bottomRight)
    && dvSame(value.bottomRight, value.bottomLeft)
  const [expanded, setExpanded] = useState(!allEqual)

  const toggle = () => {
    if (expanded) {
      setExpanded(false)
      const v = value.topLeft
      onChange({ topLeft: v, topRight: { ...v }, bottomRight: { ...v }, bottomLeft: { ...v } })
    } else {
      setExpanded(true)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {expanded ? (
          <>
            <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topLeft} onChange={(v) => onChange({ topLeft: v })} min={0} classPrefix="rounded-tl" inlineLabel={<SquareArrowUpLeft size={12} />} />
            <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topRight} onChange={(v) => onChange({ topRight: v })} min={0} classPrefix="rounded-tr" inlineLabel={<SquareArrowUpRight size={12} />} />
          </>
        ) : (
          <TokenInput
            scale={BORDER_RADIUS_SCALE}
            value={value.topLeft}
            onChange={(v) => onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })}
            min={0}
            classPrefix="rounded"
            inlineLabel={<Squircle size={12} />}
          />
        )}
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
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomLeft} onChange={(v) => onChange({ bottomLeft: v })} min={0} classPrefix="rounded-bl" inlineLabel={<SquareArrowDownLeft size={12} />} />
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomRight} onChange={(v) => onChange({ bottomRight: v })} min={0} classPrefix="rounded-br" inlineLabel={<SquareArrowDownRight size={12} />} />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </div>
  )
}
