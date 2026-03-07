import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Scan, X } from 'lucide-react'
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

/* ---------- Mixed Pill with inline dropdown ---------- */
function MixedPill({ label, scale, onChange, onPreview, onRevert, onReset, onOpenChange, tooltip }: {
  label: React.ReactNode
  scale: ScaleOption[]
  onChange: (v: DesignValue<number>) => void
  onPreview: (v: DesignValue<number>) => void
  onRevert: () => void
  onReset: () => void
  onOpenChange?: (open: boolean) => void
  tooltip: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const pillRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null)

  const measure = useCallback(() => {
    if (!pillRef.current) return
    const rect = pillRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const above = spaceBelow < 200 && rect.top > spaceBelow
    setDropPos({ left: rect.left, top: above ? rect.top : rect.bottom, width: rect.width, above })
  }, [])

  const handleOpen = useCallback(() => {
    measure()
    setOpen(true)
    setSelectedIdx(-1)
    onOpenChange?.(true)
  }, [measure, onOpenChange])

  const committedRef = useRef(false)
  const handleClose = useCallback(() => {
    setOpen(false)
    setSelectedIdx(-1)
    if (!committedRef.current) onRevert()
    committedRef.current = false
    onOpenChange?.(false)
  }, [onRevert, onOpenChange])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (pillRef.current?.contains(e.target as Node)) return
      if (dropdownRef.current?.contains(e.target as Node)) return
      handleClose()
    }
    window.addEventListener('mousedown', onDown, true)
    return () => window.removeEventListener('mousedown', onDown, true)
  }, [open, handleClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  const items = scale.map((s) => ({
    token: s.token,
    label: s.label ?? null,
    displayRight: `${s.value}px`,
    value: s.value,
    group: s.group,
  }))

  return (
    <>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <div className="relative flex-1 min-w-0">
          <div
            ref={pillRef}
            className="group c-scale-input flex items-center gap-0.5 pr-6 overflow-hidden cursor-pointer relative"
            title={`${tooltip} — values differ, click to edit`}
            onClick={() => open ? handleClose() : handleOpen()}
          >
            <span className="w-4 shrink-0 flex items-center justify-center fg-subtle">{label}</span>
            <span className="flex items-center bg-inset fg-muted rounded px-1 text-[11px] leading-[18px] font-medium truncate">
              Mixed
            </span>
            <button
              type="button"
              tabIndex={-1}
              title="Reset"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onReset()
              }}
              className={`absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted ${open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
      {open && dropPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left: dropPos.left,
            ...(dropPos.above
              ? { bottom: window.innerHeight - dropPos.top + 4 }
              : { top: dropPos.top + 4 }),
            minWidth: dropPos.width,
            zIndex: 9999,
          }}
          className="c-menu-popup overflow-y-auto max-h-[200px] w-max"
          onMouseLeave={() => { setSelectedIdx(-1); onRevert() }}
        >
          {items.map((item, i) => (
            <div key={item.token}>
              {item.group && i > 0 && <div className="border-t border-border my-1" />}
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  committedRef.current = true
                  const dv: DesignValue<number> = { mode: 'token', token: item.token, value: item.value }
                  onChange(dv)
                  handleClose()
                }}
                onMouseEnter={() => {
                  setSelectedIdx(i)
                  onPreview({ mode: 'token', token: item.token, value: item.value })
                }}
                className={`w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between cursor-pointer ${
                  i === selectedIdx
                    ? 'c-menu-item-active'
                    : 'fg-muted hover:bg-inset hover:fg-default'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">{item.label ?? item.displayRight}</span>
                </span>
                {item.label && <span className="fg-subtle">{item.displayRight}</span>}
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
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
  const [mixedLocked, setMixedLocked] = useState(false)
  const toggle = () => {
    const idx = MODE_CYCLE.indexOf(mode)
    setMode(MODE_CYCLE[(idx + 1) % MODE_CYCLE.length])
  }

  // Detect mixed state per mode
  const allSame = dvSame(value.top, value.bottom) && dvSame(value.left, value.right) && dvSame(value.top, value.left)
  const hSame = dvSame(value.left, value.right)
  const vSame = dvSame(value.top, value.bottom)
  const isMixedAll = mode === 'all' && (!allSame || mixedLocked)
  const isMixedAxis = mode === 'axis' && (!hSame || !vSame || mixedLocked)

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

  const mixedHint = isMixedAll ? ' (mixed)' : isMixedAxis ? ' (mixed)' : ''
  const modeTitle = (mode === 'all' ? 'All Sides' : mode === 'axis' ? 'Horizontal / Vertical' : 'Individual Sides') + mixedHint
  const isActive = mode !== 'all'

  // Snapshot values for preview revert
  const snapshotRef = useRef<Partial<Spacing> | null>(null)
  const saveSnapshot = () => { snapshotRef.current = { top: { ...value.top }, right: { ...value.right }, bottom: { ...value.bottom }, left: { ...value.left } } }
  const revertSnapshot = () => { if (snapshotRef.current) { onChange(snapshotRef.current); snapshotRef.current = null } }

  const mixedPill = (suffix: string, applyChange: (v: DesignValue<number>) => void, resetChange: () => void) => (
    <MixedPill
      label={txtLbl(suffix)}
      scale={scale}
      onChange={(v) => { snapshotRef.current = null; applyChange(v) }}
      onPreview={(v) => { if (!snapshotRef.current) saveSnapshot(); applyChange(v) }}
      onRevert={revertSnapshot}
      onReset={resetChange}
      onOpenChange={setMixedLocked}
      tooltip={tooltipMap[suffix]}
    />
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {mode === 'all' ? (
          isMixedAll ? mixedPill('', (v) => onChange({ top: v, right: { ...v }, bottom: { ...v }, left: { ...v } }), () => onChange({ top: ZERO, right: { ...ZERO }, bottom: { ...ZERO }, left: { ...ZERO } })) : (
            <TokenInput
              scale={scale}
              value={value.top}
              onChange={(v) => onChange({ top: v, right: { ...v }, bottom: { ...v }, left: { ...v } })}
              min={0}
              classPrefix={classPrefix}
              inlineLabel={txtLbl('')}
              tooltip={tooltipMap['']}
            />
          )
        ) : (
          <>
            {mode === 'axis' && !hSame
              ? mixedPill('x', (v) => onChange({ left: v, right: { ...v } }), () => onChange({ left: ZERO, right: { ...ZERO } }))
              : (
              <TokenInput
                scale={scale}
                value={value.left}
                onChange={(v) => mode === 'axis' ? onChange({ left: v, right: { ...v } }) : onChange({ left: v })}
                min={0}
                classPrefix={mode === 'axis' ? `${classPrefix}x` : `${classPrefix}l`}
                inlineLabel={txtLbl(mode === 'axis' ? 'x' : 'l')}
                tooltip={tooltipMap[mode === 'axis' ? 'x' : 'l']}
              />
            )}
            {mode === 'axis' && !vSame
              ? mixedPill('y', (v) => onChange({ top: v, bottom: { ...v } }), () => onChange({ top: ZERO, bottom: { ...ZERO } }))
              : (
              <TokenInput
                scale={scale}
                value={value.top}
                onChange={(v) => mode === 'axis' ? onChange({ top: v, bottom: { ...v } }) : onChange({ top: v })}
                min={0}
                classPrefix={mode === 'axis' ? `${classPrefix}y` : `${classPrefix}t`}
                inlineLabel={txtLbl(mode === 'axis' ? 'y' : 't')}
                tooltip={tooltipMap[mode === 'axis' ? 'y' : 't']}
              />
            )}
          </>
        )}
        <button
          type="button"
          title={modeTitle}
          className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
            isActive
              ? 'text-accent bg-accent/10'
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
