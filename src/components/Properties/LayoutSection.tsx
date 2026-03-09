import { useState, useMemo, useEffect } from 'react'
import { Settings2, LayoutGrid, Icon, Columns3, Rows3, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Check } from 'lucide-react'
import { layoutGridMoveHorizontal, layoutGridMoveVertical } from '@lucide/lab'

// Single rect matching LayoutGrid's footprint (18×18 from 3,3) with rx=1 for lab icon consistency
const layoutBlock = [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "1" }]] as unknown as import('lucide-react').IconNode
import type { Frame, BoxElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { SizeInput } from '../ui/SizeInput'
import { Popover } from '../ui/Popover'
import { ToggleGroup } from '../ui/ToggleGroup'
import { SpacingControl } from '../ui/SpacingControl'
import { SPACING_SCALE, SIZE_CONSTRAINT_SCALE, GRID_COLS_SCALE, GRID_ROWS_SCALE, GROW_SCALE, SHRINK_SCALE, COL_SPAN_SCALE, ROW_SPAN_SCALE, MARGIN_SCALE, GAP_SCALE, filterSpacingScale } from '../../data/scales'
import { Select } from '../ui/Select'
import { ALIGN_SELF_OPTIONS } from './constants'

export function LayoutSection({ frame, isRoot: _isRoot, hasOverrides, onResetOverrides }: { frame: Frame; isRoot?: boolean; hasOverrides?: boolean; onResetOverrides?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateSize = useFrameStore((s) => s.updateSize)
  const updateSpacing = useFrameStore((s) => s.updateSpacing)
  const spacingGrid = useFrameStore((s) => s.spacingGrid)
  const setShowMarginOverlay = useFrameStore((s) => s.setShowMarginOverlay)
  const setShowPaddingOverlay = useFrameStore((s) => s.setShowPaddingOverlay)
  const setShowGapOverlay = useFrameStore((s) => s.setShowGapOverlay)
  const filteredSpacing = useMemo(() => filterSpacingScale(SPACING_SCALE, spacingGrid), [spacingGrid])
  const filteredGap = useMemo(() => filterSpacingScale(GAP_SCALE, spacingGrid), [spacingGrid])
  const filteredSize = useMemo(() => filterSpacingScale(SIZE_CONSTRAINT_SCALE, spacingGrid), [spacingGrid])
  const filteredMargin = useMemo(() => filterSpacingScale(MARGIN_SCALE, spacingGrid), [spacingGrid])
  const [constraintsOpen, setConstraintsOpen] = useState(false)
  const [childPropsOpen, setChildPropsOpen] = useState(false)
  const [displayOptsOpen, setDisplayOptsOpen] = useState(false)
  const [overflowOptsOpen, setOverflowOptsOpen] = useState(false)
  const parentDisplay = useFrameStore((s) => s.getParentDisplay(frame.id))

  const isBox = frame.type === 'box'
  const boxFrame = isBox ? (frame as BoxElement) : null
  const isFlex = boxFrame?.display === 'flex' || boxFrame?.display === 'inline-flex'
  const isGrid = boxFrame?.display === 'grid'

  // Clear overlays when display mode changes or component unmounts
  const display = boxFrame?.display
  useEffect(() => {
    return () => {
      setShowGapOverlay(false)
      setShowPaddingOverlay(false)
      setShowMarginOverlay(false)
    }
  }, [frame.id, display, setShowGapOverlay, setShowPaddingOverlay, setShowMarginOverlay])

  const parentIsFlex = parentDisplay === 'flex' || parentDisplay === 'inline-flex'
  const parentIsGrid = parentDisplay === 'grid'
  const hasChildBehavior = parentIsFlex || parentIsGrid

  // Detect non-default state for popover indicators
  const dvActive = (dv: { mode: string; value: number }, def = 0) => dv.mode === 'token' || dv.value !== def
  const constraintsActive = dvActive(frame.minWidth) || dvActive(frame.maxWidth) || dvActive(frame.minHeight) || dvActive(frame.maxHeight)
  const childPropsActive = (parentIsFlex && (dvActive(frame.grow) || dvActive(frame.shrink, 1)))
    || frame.alignSelf !== 'auto'
    || (parentIsGrid && (dvActive(frame.colSpan) || dvActive(frame.rowSpan)))

  // Always show: padding/margin apply to all elements

  const baseDir = boxFrame?.direction?.replace('-reverse', '') as 'row' | 'column' | undefined
  const displayMode = isGrid ? 'grid' : isFlex ? (baseDir === 'column' ? 'flex-col' : 'flex-row') : 'block'
  const isInline = boxFrame?.display === 'inline-flex' || boxFrame?.display === 'inline-block'
  const isReverse = boxFrame?.direction?.endsWith('-reverse') ?? false
  const displayOptsActive = isInline || (isFlex && (boxFrame!.wrap || isReverse))

  const isRow = baseDir === 'row'
  const isSpaceBetween = boxFrame?.justify === 'between' || boxFrame?.justify === 'around'
  const justifyValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const alignValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const currentJ = isSpaceBetween ? 'center' : (boxFrame?.justify as 'start' | 'center' | 'end') ?? 'start'
  const currentA = boxFrame?.align === 'stretch' ? 'start' : (boxFrame?.align as 'start' | 'center' | 'end') ?? 'start'

  return (
    <Section title="Layout" hasOverrides={hasOverrides} onResetOverrides={onResetOverrides}>
      <div className="flex flex-col gap-2">
        {/* Display mode */}
        {isBox && (
          <>
            <div className="flex items-center gap-2">
              <ToggleGroup
                value={displayMode}
                options={[
                  { value: 'block', label: <Icon iconNode={layoutBlock} size={12} />, tooltip: 'Block' },
                  { value: 'flex-col', label: <Icon iconNode={layoutGridMoveVertical} size={12} />, tooltip: 'Vertical' },
                  { value: 'flex-row', label: <Icon iconNode={layoutGridMoveHorizontal} size={12} />, tooltip: 'Horizontal' },
                  { value: 'grid', label: <LayoutGrid size={12} />, tooltip: 'Grid' },
                ]}
                onChange={(v) => {
                  const updates: Partial<BoxElement> = {}
                  if (v === 'block') {
                    updates.display = isInline ? 'inline-block' : 'block'
                  } else if (v === 'flex-col') {
                    updates.display = isInline ? 'inline-flex' : 'flex'
                    updates.direction = isReverse ? 'column-reverse' : 'column'
                  } else if (v === 'flex-row') {
                    updates.display = isInline ? 'inline-flex' : 'flex'
                    updates.direction = isReverse ? 'row-reverse' : 'row'
                  } else {
                    updates.display = 'grid'
                  }
                  updateFrame(frame.id, updates)
                  setShowGapOverlay(false)
                  // Force WebKit reflow after direction change — without this,
                  // children retain stale widths from the previous flex layout.
                  requestAnimationFrame(() => {
                    document.getElementById('caja-canvas')?.offsetHeight
                  })
                }}
                className="flex-1"
              />
              {!isGrid ? (
                <Popover
                  open={displayOptsOpen}
                  onOpenChange={setDisplayOptsOpen}
                  trigger={
                    <button
                      type="button"
                      title="Display Options"
                      className={`c-slot ${displayOptsActive ? 'is-active' : ''}`}
                    >
                      <Settings2 size={12} />
                    </button>
                  }
                  side="bottom"
                  align="end"
                >
                  <div className="c-popover">
                    <span className="c-popover-title">Display Options</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateFrame(frame.id, {
                          display: isFlex
                            ? (isInline ? 'flex' : 'inline-flex')
                            : (isInline ? 'block' : 'inline-block'),
                        })
                      }}
                      className="c-popover-row cursor-pointer select-none"
                    >
                      <span className={`c-checkbox ${isInline ? 'is-checked' : ''}`}>
                        {isInline && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className={`text-[12px] c-dimmed ${isInline ? 'is-active' : ''}`}>{isFlex ? 'Inline Flex' : 'Inline Block'}</span>
                    </button>
                    {isFlex && (
                      <>
                        <div className="c-popover-divider" />
                        <button
                          type="button"
                          onClick={() => updateFrame(frame.id, { wrap: !boxFrame!.wrap })}
                          className="c-popover-row cursor-pointer select-none"
                        >
                          <span className={`c-checkbox ${boxFrame!.wrap ? 'is-checked' : ''}`}>
                            {boxFrame!.wrap && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className={`text-[12px] c-dimmed ${boxFrame!.wrap ? 'is-active' : ''}`}>Wrap Children</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const dir = boxFrame!.direction
                            const newDir = dir.endsWith('-reverse')
                              ? dir.replace('-reverse', '') as 'row' | 'column'
                              : `${dir}-reverse` as 'row-reverse' | 'column-reverse'
                            updateFrame(frame.id, { direction: newDir })
                            requestAnimationFrame(() => {
                              document.getElementById('caja-canvas')?.offsetHeight
                            })
                          }}
                          className="c-popover-row cursor-pointer select-none"
                        >
                          <span className={`c-checkbox ${isReverse ? 'is-checked' : ''}`}>
                            {isReverse && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className={`text-[12px] c-dimmed ${isReverse ? 'is-active' : ''}`}>Reverse Order</span>
                        </button>
                      </>
                    )}
                  </div>
                </Popover>
              ) : (
                <div className="c-slot-spacer" />
              )}
            </div>
          </>
        )}

        {/* W + H + constraints */}
        <div className="flex items-center gap-2">
          <SizeInput
            value={frame.width}
            onChange={(v) => updateSize(frame.id, 'width', v)}
            label="W"
            classPrefix="w"
            parentIsFlex={parentIsFlex}
            tooltip="Width"
          />
          <SizeInput
            value={frame.height}
            onChange={(v) => updateSize(frame.id, 'height', v)}
            label="H"
            classPrefix="h"
            parentIsFlex={parentIsFlex}
            tooltip="Height"
          />
          <Popover
              open={constraintsOpen}
              onOpenChange={setConstraintsOpen}
              trigger={
                <button
                  type="button"
                  title="Size Constraints"
                  className={`c-slot ${constraintsActive || childPropsActive ? 'is-active' : ''}`}
                >
                  <Settings2 size={12} />
                </button>
              }
              side="bottom"
              align="end"
            >
              <div className="c-popover">
                <span className="c-popover-title">Size Options</span>
                <TokenInput
                  scale={filteredSize}
                  value={frame.minWidth}
                  onChange={(v) => updateFrame(frame.id, { minWidth: v })}
                  min={0}
                  label="Min Width"
                  classPrefix="min-w"
                />
                <TokenInput
                  scale={filteredSize}
                  value={frame.maxWidth}
                  onChange={(v) => updateFrame(frame.id, { maxWidth: v })}
                  min={0}
                  label="Max Width"
                  classPrefix="max-w"
                />
                <div className="c-popover-divider" />
                <TokenInput
                  scale={filteredSize}
                  value={frame.minHeight}
                  onChange={(v) => updateFrame(frame.id, { minHeight: v })}
                  min={0}
                  label="Min Height"
                  classPrefix="min-h"
                />
                <TokenInput
                  scale={filteredSize}
                  value={frame.maxHeight}
                  onChange={(v) => updateFrame(frame.id, { maxHeight: v })}
                  min={0}
                  label="Max Height"
                  classPrefix="max-h"
                />
                {hasChildBehavior && !isFlex && (
                  <>
                    <div className="c-popover-divider" />
                    <span className="c-popover-subtitle">Child Behavior</span>
                    {parentIsFlex && (
                      <>
                        <TokenInput
                          scale={GROW_SCALE}
                          value={frame.grow}
                          onChange={(v) => updateFrame(frame.id, { grow: v })}
                          min={0}
                          label="Grow"
                          classPrefix="grow"
                          defaultValue={0}
                          unit=""
                        />
                        <TokenInput
                          scale={SHRINK_SCALE}
                          value={frame.shrink}
                          onChange={(v) => updateFrame(frame.id, { shrink: v })}
                          min={0}
                          label="Shrink"
                          classPrefix="shrink"
                          defaultValue={1}
                          unit=""
                        />
                      </>
                    )}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="c-label">Align Self</span>
                      <Select
                        value={frame.alignSelf}
                        options={ALIGN_SELF_OPTIONS}
                        onChange={(v) => updateFrame(frame.id, { alignSelf: v as Frame['alignSelf'] })}
                        className="flex-1"
                        initialValue="auto"
                        tooltip="Align Self"
                      />
                    </div>
                    {parentIsGrid && (
                      <>
                        <div className="c-popover-divider" />
                        <TokenInput
                          scale={COL_SPAN_SCALE}
                          value={frame.colSpan}
                          onChange={(v) => updateFrame(frame.id, { colSpan: v })}
                          min={0}
                          label="Col Span"
                          classPrefix="col-span"
                          defaultValue={0}
                          placeholder="Auto"
                          unit=""
                        />
                        <TokenInput
                          scale={ROW_SPAN_SCALE}
                          value={frame.rowSpan}
                          onChange={(v) => updateFrame(frame.id, { rowSpan: v })}
                          min={0}
                          label="Row Span"
                          classPrefix="row-span"
                          defaultValue={0}
                          placeholder="Auto"
                          unit=""
                        />
                      </>
                    )}
                  </>
                )}
              </div>
            </Popover>
        </div>

        {isBox && (
          <>
            {/* Flex: 3x3 grid + gap + overflow — follows W|H column alignment */}
            {isFlex && (
              <div className="flex gap-2 items-start">
                <div className="flex-1 min-w-0">
                  <div
                    className="grid gap-[2px] rounded p-1 w-full h-[56px]"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gridTemplateRows: 'repeat(3, 1fr)',
                    }}
                  >
                  {(isRow ? alignValues : justifyValues).map((rowVal, ri) =>
                    (isRow ? justifyValues : alignValues).map((colVal, ci) => {
                      const j = isRow ? colVal : rowVal
                      const a = isRow ? rowVal : colVal
                      const active = isSpaceBetween
                        ? currentA === a
                        : currentJ === j && currentA === a
                      return (
                        <button
                          key={`${ri}-${ci}`}
                          className="flex items-center justify-center group"
                          onClick={() => {
                            if (isSpaceBetween) updateFrame(frame.id, { align: a })
                            else updateFrame(frame.id, { justify: j, align: a })
                          }}
                        >
                          {active ? (
                            <div className={`${isRow ? 'w-[2px] h-[8px]' : 'w-[8px] h-[2px]'} bg-accent rounded-full`} />
                          ) : (
                            <div className="w-[3px] h-[3px] rounded-full bg-surface-3 group-hover:bg-emphasis" />
                          )}
                        </button>
                      )
                    })
                  )}
                  </div>
                </div>
                <div
                  className="flex flex-col gap-2 flex-1 min-w-0"
                  onMouseEnter={() => setShowGapOverlay(true)}
                  onMouseLeave={() => setShowGapOverlay(false)}
                >
                  <TokenInput
                    scale={filteredGap}
                    value={isSpaceBetween ? { mode: 'token' as const, token: 'auto', value: 0 } : boxFrame!.gap}
                    onChange={(v) => {
                      if (v.mode === 'token' && v.token === 'auto') {
                        updateFrame(frame.id, { justify: 'between' })
                      } else {
                        if (isSpaceBetween) updateFrame(frame.id, { justify: currentJ, gap: v })
                        else updateFrame(frame.id, { gap: v })
                      }
                    }}
                    min={0}
                    classPrefix="gap"
                    inlineLabel={isRow ? <AlignHorizontalSpaceAround size={12} /> : <AlignVerticalSpaceAround size={12} />}
                    tooltip="Gap"
                  />
                </div>
                {hasChildBehavior ? (
                  <Popover
                    open={childPropsOpen}
                    onOpenChange={setChildPropsOpen}
                    trigger={
                      <button
                        type="button"
                        title="Flex Child"
                        className={`c-slot ${childPropsActive ? 'is-active' : ''}`}
                      >
                        <Settings2 size={12} />
                      </button>
                    }
                    side="bottom"
                    align="end"
                  >
                    <div className="c-popover">
                      <span className="c-popover-title">Child Options</span>
                      {parentIsFlex && (
                        <>
                          <TokenInput
                            scale={GROW_SCALE}
                            value={frame.grow}
                            onChange={(v) => updateFrame(frame.id, { grow: v })}
                            min={0}
                            label="Grow"
                            classPrefix="grow"
                            defaultValue={0}
                            unit=""
                          />
                          <TokenInput
                            scale={SHRINK_SCALE}
                            value={frame.shrink}
                            onChange={(v) => updateFrame(frame.id, { shrink: v })}
                            min={0}
                            label="Shrink"
                            classPrefix="shrink"
                            defaultValue={1}
                            unit=""
                          />
                        </>
                      )}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="c-label">Align Self</span>
                        <Select
                          value={frame.alignSelf}
                          options={ALIGN_SELF_OPTIONS}
                          onChange={(v) => updateFrame(frame.id, { alignSelf: v as Frame['alignSelf'] })}
                          className="flex-1"
                          initialValue="auto"
                          tooltip="Align Self"
                        />
                      </div>
                      {parentIsGrid && (
                        <>
                          <div className="c-popover-divider" />
                          <TokenInput
                            scale={COL_SPAN_SCALE}
                            value={frame.colSpan}
                            onChange={(v) => updateFrame(frame.id, { colSpan: v })}
                            min={0}
                            label="Col Span"
                            classPrefix="col-span"
                            defaultValue={0}
                            placeholder="Auto"
                            unit=""
                          />
                          <TokenInput
                            scale={ROW_SPAN_SCALE}
                            value={frame.rowSpan}
                            onChange={(v) => updateFrame(frame.id, { rowSpan: v })}
                            min={0}
                            label="Row Span"
                            classPrefix="row-span"
                            defaultValue={0}
                            placeholder="Auto"
                            unit=""
                          />
                        </>
                      )}
                    </div>
                  </Popover>
                ) : (
                  <div className="c-slot-spacer" />
                )}
              </div>
            )}

            {/* Grid: cols + rows + gap */}
            {isGrid && (
              <>
                <div className="flex items-center gap-2">
                  <TokenInput
                    scale={GRID_COLS_SCALE}
                    value={boxFrame!.gridCols}
                    onChange={(v) => updateFrame(frame.id, { gridCols: v })}
                    min={0}
                    inlineLabel={<Columns3 size={12} />}
                    classPrefix="grid-cols"
                    defaultValue={0}
                    placeholder="Auto"
                    unit=""
                    tooltip="Columns"
                  />
                  <TokenInput
                    scale={GRID_ROWS_SCALE}
                    value={boxFrame!.gridRows}
                    onChange={(v) => updateFrame(frame.id, { gridRows: v })}
                    min={0}
                    inlineLabel={<Rows3 size={12} />}
                    classPrefix="grid-rows"
                    defaultValue={0}
                    placeholder="Auto"
                    unit=""
                    tooltip="Rows"
                  />
                  <div className="c-slot-spacer" />
                </div>
                <div
                  className="flex items-center gap-2"
                  onMouseEnter={() => setShowGapOverlay(true)}
                  onMouseLeave={() => setShowGapOverlay(false)}
                >
                  <TokenInput
                    scale={filteredSpacing}
                    value={boxFrame!.gap}
                    onChange={(v) => updateFrame(frame.id, { gap: v })}
                    min={0}
                    inlineLabel={<LayoutGrid size={12} />}
                    classPrefix="gap"
                    tooltip="Gap"
                  />
                  <div className="c-slot-spacer" />
                </div>
              </>
            )}

          </>
        )}


        {/* Padding + Margin */}
        <div
          onMouseEnter={() => setShowPaddingOverlay(true)}
          onMouseLeave={() => setShowPaddingOverlay(false)}
        >
          <SpacingControl
            value={frame.padding}
            onChange={(v) => updateSpacing(frame.id, 'padding', v)}
            label="Padding"
            classPrefix="p"
            scale={filteredSpacing}
          />
        </div>
        <div
          onMouseEnter={() => setShowMarginOverlay(true)}
          onMouseLeave={() => setShowMarginOverlay(false)}
        >
          <SpacingControl
            value={frame.margin}
            onChange={(v) => updateSpacing(frame.id, 'margin', v)}
            label="Margin"
            classPrefix="m"
            scale={filteredMargin}
          />
        </div>

        {/* Clip */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); updateFrame(frame.id, { overflow: frame.overflow !== 'visible' ? 'visible' : 'hidden' }) }}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <span className={`c-checkbox ${frame.overflow !== 'visible' ? 'is-checked' : ''}`}>
              {frame.overflow !== 'visible' && <Check size={10} strokeWidth={3} />}
            </span>
            <span className={`text-[12px] c-dimmed ${frame.overflow !== 'visible' ? 'is-active' : ''}`}>Clip Content</span>
          </button>
          <div className="flex-1" />
          <Popover
              open={overflowOptsOpen}
              onOpenChange={setOverflowOptsOpen}
              trigger={
                <button
                  type="button"
                  title="Overflow"
                  className={`c-slot ${
                    frame.overflow === 'visible'
                      ? 'invisible'
                      : frame.overflow === 'scroll'
                        ? 'is-active'
                        : ''
                  }`}
                >
                  <Settings2 size={12} />
                </button>
              }
              side="bottom"
              align="end"
            >
              <div className="c-popover">
                <span className="c-popover-title">Clip Options</span>
                <button
                  type="button"
                  onClick={() => updateFrame(frame.id, { overflow: frame.overflow === 'scroll' ? 'hidden' : 'scroll' })}
                  className="c-popover-row cursor-pointer select-none"
                >
                  <span className={`c-checkbox ${frame.overflow === 'scroll' ? 'is-checked' : ''}`}>
                    {frame.overflow === 'scroll' && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={`text-[12px] c-dimmed ${frame.overflow === 'scroll' ? 'is-active' : ''}`}>Scroll</span>
                </button>
              </div>
            </Popover>
        </div>
      </div>
    </Section>
  )
}
