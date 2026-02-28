import { useState } from 'react'
import { Ellipsis, Square, ArrowDown, ArrowRight, LayoutGrid, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Check } from 'lucide-react'
import type { Frame, BoxElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { SizeInput } from '../ui/SizeInput'
import { SpacingControl } from '../ui/SpacingControl'
import { Popover } from '../ui/Popover'
import { ToggleGroup } from '../ui/ToggleGroup'
import { SPACING_SCALE, MARGIN_SCALE, SIZE_CONSTRAINT_SCALE, GRID_COLS_SCALE, GRID_ROWS_SCALE, GROW_SCALE, SHRINK_SCALE, COL_SPAN_SCALE, ROW_SPAN_SCALE } from '../../data/scales'
import { ALIGN_SELF_OPTIONS } from './constants'

export function LayoutSection({ frame, isRoot }: { frame: Frame; isRoot?: boolean }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateSize = useFrameStore((s) => s.updateSize)
  const updateSpacing = useFrameStore((s) => s.updateSpacing)
  const advancedMode = useFrameStore((s) => s.advancedMode)
  const [constraintsOpen, setConstraintsOpen] = useState(false)
  const [childPropsOpen, setChildPropsOpen] = useState(false)
  const [displayOptsOpen, setDisplayOptsOpen] = useState(false)
  const parentDisplay = useFrameStore((s) => s.getParentDisplay(frame.id))

  const isBox = frame.type === 'box'
  const boxFrame = isBox ? (frame as BoxElement) : null
  const isFlex = boxFrame?.display === 'flex' || boxFrame?.display === 'inline-flex'
  const isGrid = boxFrame?.display === 'grid'

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
    <Section title="Layout">
      <div className="flex flex-col gap-2">
        {/* Display mode */}
        {isBox && (
          <>
            <div className="flex items-center gap-2">
              <ToggleGroup
                value={displayMode}
                options={[
                  { value: 'block', label: <Square size={14} />, tooltip: 'Block' },
                  { value: 'flex-col', label: <ArrowDown size={14} />, tooltip: 'Vertical' },
                  { value: 'flex-row', label: <ArrowRight size={14} />, tooltip: 'Horizontal' },
                  { value: 'grid', label: <LayoutGrid size={14} />, tooltip: 'Grid' },
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
                      className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                        displayOptsActive
                          ? 'text-blue-400 bg-blue-400/10'
                          : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                      }`}
                    >
                      <Ellipsis size={12} />
                    </button>
                  }
                  side="bottom"
                  align="end"
                >
                  <div className="flex flex-col gap-1.5 p-2.5 min-w-[120px]">
                    {isFlex && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateFrame(frame.id, { wrap: !boxFrame!.wrap })}
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                            boxFrame!.wrap ? 'bg-accent border-accent text-white' : 'border-border-accent bg-surface-2'
                          }`}>
                            {boxFrame!.wrap && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className={`text-[12px] ${boxFrame!.wrap ? 'text-text-primary' : 'text-text-muted'}`}>Wrap</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const dir = boxFrame!.direction
                            const newDir = dir.endsWith('-reverse')
                              ? dir.replace('-reverse', '') as 'row' | 'column'
                              : `${dir}-reverse` as 'row-reverse' | 'column-reverse'
                            updateFrame(frame.id, { direction: newDir })
                          }}
                          className="flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                            isReverse ? 'bg-accent border-accent text-white' : 'border-border-accent bg-surface-2'
                          }`}>
                            {isReverse && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className={`text-[12px] ${isReverse ? 'text-text-primary' : 'text-text-muted'}`}>Reverse</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        updateFrame(frame.id, {
                          display: isFlex
                            ? (isInline ? 'flex' : 'inline-flex')
                            : (isInline ? 'block' : 'inline-block'),
                        })
                      }}
                      className="flex items-center gap-1.5 cursor-pointer select-none"
                    >
                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                        isInline ? 'bg-accent border-accent text-white' : 'border-border-accent bg-surface-2'
                      }`}>
                        {isInline && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span className={`text-[12px] ${isInline ? 'text-text-primary' : 'text-text-muted'}`}>Inline</span>
                    </button>
                  </div>
                </Popover>
              ) : (
                <div className="w-5 shrink-0" />
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
                className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                  constraintsActive || childPropsActive
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                }`}
              >
                <Ellipsis size={12} />
              </button>
            }
            side="bottom"
            align="end"
          >
            <div className="flex flex-col gap-2 p-2.5 w-[200px]">
              <TokenInput
                scale={SIZE_CONSTRAINT_SCALE}
                value={frame.minWidth}
                onChange={(v) => updateFrame(frame.id, { minWidth: v })}
                min={0}
                label="Min W"
                classPrefix="min-w"
              />
              <TokenInput
                scale={SIZE_CONSTRAINT_SCALE}
                value={frame.maxWidth}
                onChange={(v) => updateFrame(frame.id, { maxWidth: v })}
                min={0}
                label="Max W"
                classPrefix="max-w"
              />
              <TokenInput
                scale={SIZE_CONSTRAINT_SCALE}
                value={frame.minHeight}
                onChange={(v) => updateFrame(frame.id, { minHeight: v })}
                min={0}
                label="Min H"
                classPrefix="min-h"
              />
              <TokenInput
                scale={SIZE_CONSTRAINT_SCALE}
                value={frame.maxHeight}
                onChange={(v) => updateFrame(frame.id, { maxHeight: v })}
                min={0}
                label="Max H"
                classPrefix="max-h"
              />
              {hasChildBehavior && !isFlex && (
                <>
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
                      />
                      <TokenInput
                        scale={SHRINK_SCALE}
                        value={frame.shrink}
                        onChange={(v) => updateFrame(frame.id, { shrink: v })}
                        min={0}
                        label="Shrink"
                        classPrefix="shrink"
                        defaultValue={1}
                      />
                    </>
                  )}
                  <TokenInput
                    value={frame.alignSelf}
                    options={ALIGN_SELF_OPTIONS}
                    onChange={(v) => updateFrame(frame.id, { alignSelf: v as Frame['alignSelf'] })}
                    label="Align Self"
                    classPrefix="self"
                    initialValue="auto"
                  />
                  {parentIsGrid && (
                    <>
                      <TokenInput
                        scale={COL_SPAN_SCALE}
                        value={frame.colSpan}
                        onChange={(v) => updateFrame(frame.id, { colSpan: v })}
                        min={0}
                        label="Col Span"
                        classPrefix="col-span"
                        defaultValue={0}
                        placeholder="Auto"
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
                    className="grid gap-[2px] bg-surface-2 rounded p-1 w-full h-[56px]"
                    style={{
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
                            <div className="w-[3px] h-[3px] rounded-full bg-text-muted/25 group-hover:bg-text-muted/50" />
                          )}
                        </button>
                      )
                    })
                  )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <TokenInput
                    scale={SPACING_SCALE}
                    value={boxFrame!.gap}
                    onChange={(v) => updateFrame(frame.id, { gap: v })}
                    min={0}
                    classPrefix="gap"
                    inlineLabel={isRow ? <AlignHorizontalSpaceAround size={12} /> : <AlignVerticalSpaceAround size={12} />}
                    tooltip="Gap"
                    autoOption={{
                      label: 'Auto',
                      active: isSpaceBetween,
                      onToggle: () => {
                        if (isSpaceBetween) updateFrame(frame.id, { justify: currentJ })
                        else updateFrame(frame.id, { justify: 'between' })
                      },
                    }}
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
                        className={`w-5 h-5 flex items-center justify-center rounded shrink-0 ${
                          childPropsActive
                            ? 'text-blue-400 bg-blue-400/10'
                            : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                        }`}
                      >
                        <Ellipsis size={12} />
                      </button>
                    }
                    side="bottom"
                    align="end"
                  >
                    <div className="flex flex-col gap-2 p-2.5 w-[200px]">
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
                          />
                          <TokenInput
                            scale={SHRINK_SCALE}
                            value={frame.shrink}
                            onChange={(v) => updateFrame(frame.id, { shrink: v })}
                            min={0}
                            label="Shrink"
                            classPrefix="shrink"
                            defaultValue={1}
                          />
                        </>
                      )}
                      <TokenInput
                        value={frame.alignSelf}
                        options={ALIGN_SELF_OPTIONS}
                        onChange={(v) => updateFrame(frame.id, { alignSelf: v as Frame['alignSelf'] })}
                        label="Align Self"
                        classPrefix="self"
                        initialValue="auto"
                      />
                      {parentIsGrid && (
                        <>
                          <TokenInput
                            scale={COL_SPAN_SCALE}
                            value={frame.colSpan}
                            onChange={(v) => updateFrame(frame.id, { colSpan: v })}
                            min={0}
                            label="Col Span"
                            classPrefix="col-span"
                            defaultValue={0}
                            placeholder="Auto"
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
                          />
                        </>
                      )}
                    </div>
                  </Popover>
                ) : (
                  <div className="w-5 shrink-0" />
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
                    inlineLabel={<span className="text-[12px]">C</span>}
                    classPrefix="grid-cols"
                    defaultValue={0}
                    placeholder="Auto"
                    tooltip="Columns"
                  />
                  <TokenInput
                    scale={GRID_ROWS_SCALE}
                    value={boxFrame!.gridRows}
                    onChange={(v) => updateFrame(frame.id, { gridRows: v })}
                    min={0}
                    inlineLabel={<span className="text-[12px]">R</span>}
                    classPrefix="grid-rows"
                    defaultValue={0}
                    placeholder="Auto"
                    tooltip="Rows"
                  />
                  <div className="w-5 shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <TokenInput
                    scale={SPACING_SCALE}
                    value={boxFrame!.gap}
                    onChange={(v) => updateFrame(frame.id, { gap: v })}
                    min={0}
                    inlineLabel={<LayoutGrid size={12} />}
                    classPrefix="gap"
                    tooltip="Gap"
                  />
                  <div className="w-5 shrink-0" />
                </div>
              </>
            )}

          </>
        )}


        {/* Padding + Margin */}
        <SpacingControl
          value={frame.padding}
          onChange={(v) => updateSpacing(frame.id, 'padding', v)}
          label="Padding"
          classPrefix="p"
        />
        <SpacingControl
          value={frame.margin}
          onChange={(v) => updateSpacing(frame.id, 'margin', v)}
          label="Margin"
          classPrefix="m"
          scale={MARGIN_SCALE}
        />

        {/* Clip */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateFrame(frame.id, { overflow: frame.overflow === 'hidden' ? 'visible' : 'hidden' })}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
              frame.overflow === 'hidden'
                ? 'bg-accent border-accent text-white'
                : 'border-border-accent bg-surface-2'
            }`}>
              {frame.overflow === 'hidden' && <Check size={10} strokeWidth={3} />}
            </span>
            <span className={`text-[12px] ${frame.overflow === 'hidden' ? 'text-text-primary' : 'text-text-muted'}`}>Clip</span>
          </button>
          <div className="flex-1" />
          <Popover
            trigger={
              <button
                type="button"
                title="Overflow"
                className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${
                  frame.overflow === 'scroll'
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-2'
                }`}
              >
                <Ellipsis size={12} />
              </button>
            }
            side="bottom"
            align="end"
          >
            <div className="flex flex-col gap-1.5 p-2.5 min-w-[120px]">
              <button
                type="button"
                onClick={() => updateFrame(frame.id, { overflow: frame.overflow === 'scroll' ? 'visible' : 'scroll' })}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                  frame.overflow === 'scroll' ? 'bg-accent border-accent text-white' : 'border-border-accent bg-surface-2'
                }`}>
                  {frame.overflow === 'scroll' && <Check size={10} strokeWidth={3} />}
                </span>
                <span className={`text-[12px] ${frame.overflow === 'scroll' ? 'text-text-primary' : 'text-text-muted'}`}>Scroll</span>
              </button>
            </div>
          </Popover>
        </div>
      </div>
    </Section>
  )
}
