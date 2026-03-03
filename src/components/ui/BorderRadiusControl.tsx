import { useState } from 'react'
import { Scan } from 'lucide-react'
import type { BorderRadius, DesignValue } from '../../types/frame'
import { TokenInput } from './TokenInput'
import { BORDER_RADIUS_SCALE } from '../../data/scales'

function dvSame(a: DesignValue<number>, b: DesignValue<number>): boolean {
  if (a.mode !== b.mode || a.value !== b.value) return false
  if (a.mode === 'token' && b.mode === 'token') return a.token === b.token
  return true
}

const txtLbl = (s: string) => <span className="text-[12px]">{s}</span>

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
            <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topLeft} onChange={(v) => onChange({ topLeft: v })} min={0} classPrefix="rounded-tl" inlineLabel={txtLbl('TL')} tooltip="Top Left Radius" />
            <TokenInput scale={BORDER_RADIUS_SCALE} value={value.topRight} onChange={(v) => onChange({ topRight: v })} min={0} classPrefix="rounded-tr" inlineLabel={txtLbl('TR')} tooltip="Top Right Radius" />
          </>
        ) : (
          <TokenInput
            scale={BORDER_RADIUS_SCALE}
            value={value.topLeft}
            onChange={(v) => onChange({ topLeft: v, topRight: v, bottomRight: v, bottomLeft: v })}
            min={0}
            classPrefix="rounded"
            inlineLabel={<Scan size={12} />}
            tooltip="Border Radius"
          />
        )}
        <button
          type="button"
          title={expanded ? 'Collapse Corners' : 'Expand Corners'}
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
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomLeft} onChange={(v) => onChange({ bottomLeft: v })} min={0} classPrefix="rounded-bl" inlineLabel={txtLbl('BL')} tooltip="Bottom Left Radius" />
          <TokenInput scale={BORDER_RADIUS_SCALE} value={value.bottomRight} onChange={(v) => onChange({ bottomRight: v })} min={0} classPrefix="rounded-br" inlineLabel={txtLbl('BR')} tooltip="Bottom Right Radius" />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </div>
  )
}
