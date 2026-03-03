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
  if (a.mode !== b.mode || a.value !== b.value) return false
  if (a.mode === 'token' && b.mode === 'token') return a.token === b.token
  return true
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

const MODE_CYCLE: SpacingMode[] = ['all', 'axis', 'sides']

function validDV(v: unknown): v is DesignValue<number> {
  return !!v && typeof v === 'object' && 'mode' in (v as Record<string, unknown>)
}

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
    top: validDV(rawValue?.top) ? rawValue.top : ZERO,
    right: validDV(rawValue?.right) ? rawValue.right : ZERO,
    bottom: validDV(rawValue?.bottom) ? rawValue.bottom : ZERO,
    left: validDV(rawValue?.left) ? rawValue.left : ZERO,
  }
  const [mode, setMode] = useState<SpacingMode>(() => detectMode(value))

  const toggle = () => {
    const idx = MODE_CYCLE.indexOf(mode)
    const next = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length]
    // Sync values when collapsing
    if (next === 'all') {
      onChange({ top: { ...value.top }, right: { ...value.top }, bottom: { ...value.top }, left: { ...value.top } })
    } else if (next === 'axis') {
      onChange({ right: { ...value.left }, bottom: { ...value.top } })
    }
    setMode(next)
  }

  const P = (labelPrefix ?? classPrefix).toUpperCase()
  const txtLbl = (suffix: string) => <span className="text-[12px]">{P}{suffix}</span>
  const tooltipMap: Record<string, string> = {
    '': `${label} All Sides`,
    x: `${label} Left & Right`,
    y: `${label} Top & Bottom`,
    l: `${label} Left`,
    t: `${label} Top`,
    r: `${label} Right`,
    b: `${label} Bottom`,
  }

  const modeTitle = mode === 'all' ? 'All Sides' : mode === 'axis' ? 'Horizontal / Vertical' : 'Individual Sides'
  const isActive = mode !== 'all'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {mode === 'all' ? (
          <TokenInput
            scale={scale}
            value={value.top}
            onChange={(v) => onChange({ top: v, right: { ...v }, bottom: { ...v }, left: { ...v } })}
            min={0}
            classPrefix={classPrefix}
            inlineLabel={txtLbl('')}
            tooltip={tooltipMap['']}
          />
        ) : (
          <>
            <TokenInput
              scale={scale}
              value={value.left}
              onChange={(v) => mode === 'axis' ? onChange({ left: v, right: { ...v } }) : onChange({ left: v })}
              min={0}
              classPrefix={mode === 'axis' ? `${classPrefix}x` : `${classPrefix}l`}
              inlineLabel={txtLbl(mode === 'axis' ? 'x' : 'l')}
              tooltip={tooltipMap[mode === 'axis' ? 'x' : 'l']}
            />
            <TokenInput
              scale={scale}
              value={value.top}
              onChange={(v) => mode === 'axis' ? onChange({ top: v, bottom: { ...v } }) : onChange({ top: v })}
              min={0}
              classPrefix={mode === 'axis' ? `${classPrefix}y` : `${classPrefix}t`}
              inlineLabel={txtLbl(mode === 'axis' ? 'y' : 't')}
              tooltip={tooltipMap[mode === 'axis' ? 'y' : 't']}
            />
          </>
        )}
        <button
          type="button"
          title={modeTitle}
          className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
            isActive
              ? 'text-blue-400 bg-blue-400/10'
              : 'fg-icon-subtle hover:fg-icon-muted hover:bg-inset'
          }`}
          onClick={toggle}
        >
          <Scan size={12} />
        </button>
      </div>
      {mode === 'sides' && (
        <div className="flex items-center gap-2">
          <TokenInput scale={scale} value={value.right} onChange={(v) => onChange({ right: v })} min={0} classPrefix={`${classPrefix}r`} inlineLabel={txtLbl('r')} tooltip={tooltipMap.r} />
          <TokenInput scale={scale} value={value.bottom} onChange={(v) => onChange({ bottom: v })} min={0} classPrefix={`${classPrefix}b`} inlineLabel={txtLbl('b')} tooltip={tooltipMap.b} />
          <div className="w-5 shrink-0" />
        </div>
      )}
    </div>
  )
}
