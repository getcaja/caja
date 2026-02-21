import type { BoxElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ScaleInput } from '../ui/ScaleInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Switch } from '../ui/Switch'
import { Select } from '../ui/Select'
import { SPACING_SCALE } from '../../data/scales'
import { BOX_TAG_OPTIONS } from './constants'

export function LayoutSection({ frame }: { frame: BoxElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  const isRow = frame.direction === 'row'
  const isSpaceBetween = frame.justify === 'between' || frame.justify === 'around'
  const justifyValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const alignValues: ('start' | 'center' | 'end')[] = ['start', 'center', 'end']
  const currentJ = isSpaceBetween ? 'center' : (frame.justify as 'start' | 'center' | 'end')
  const currentA = frame.align === 'stretch' ? 'start' : (frame.align as 'start' | 'center' | 'end')

  return (
    <Section title="Layout">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Tag</span>
          <Select
            value={frame.tag || 'div'}
            options={BOX_TAG_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { tag: v as BoxElement['tag'] })}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Display</span>
          <ToggleGroup
            value="flex"
            options={[
              { value: 'block', label: 'Block', disabled: true },
              { value: 'flex', label: 'Flex' },
              { value: 'grid', label: 'Grid', disabled: true },
            ]}
            onChange={() => {}}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Direction</span>
          <ToggleGroup
            value={frame.direction}
            options={[
              { value: 'row', label: 'Row' },
              { value: 'column', label: 'Column' },
            ]}
            onChange={(v) => updateFrame(frame.id, { direction: v })}
            className="flex-1"
          />
        </div>

        <div className="flex items-start gap-3">
          <div
            className="grid gap-[3px] bg-surface-0 rounded-md p-1.5 shrink-0"
            style={{
              gridTemplateColumns: 'repeat(3, 14px)',
              gridTemplateRows: 'repeat(3, 14px)',
            }}
          >
            {(isRow ? alignValues : justifyValues).map((rowVal, ri) =>
              (isRow ? justifyValues : alignValues).map((colVal, ci) => {
                const j = isRow ? colVal : rowVal
                const a = isRow ? rowVal : colVal
                const isActive = isSpaceBetween
                  ? currentA === a
                  : currentJ === j && currentA === a
                return (
                  <button
                    key={`${ri}-${ci}`}
                    className="w-[14px] h-[14px] rounded-sm flex items-center justify-center hover:bg-surface-2"
                    onClick={() => {
                      if (isSpaceBetween) updateFrame(frame.id, { align: a })
                      else updateFrame(frame.id, { justify: j, align: a })
                    }}
                  >
                    {isActive ? (
                      <div className={`rounded-full ${isRow ? 'w-[2px] h-[8px]' : 'w-[8px] h-[2px]'} bg-text-primary`} />
                    ) : (
                      <div className="w-[3px] h-[3px] rounded-full bg-surface-3" />
                    )}
                  </button>
                )
              })
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <ToggleGroup
              value={isSpaceBetween ? frame.justify : 'default'}
              options={[
                { value: 'default', label: 'Packed' },
                { value: 'between', label: 'Between' },
                { value: 'around', label: 'Around' },
              ]}
              onChange={(v) => {
                if (v === 'default') updateFrame(frame.id, { justify: currentJ })
                else updateFrame(frame.id, { justify: v as BoxElement['justify'] })
              }}
            />
            <button
              className={`px-2 py-1 text-[12px] rounded-md ${
                frame.align === 'stretch'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'bg-surface-0 text-text-muted hover:text-text-secondary'
              }`}
              onClick={() =>
                updateFrame(frame.id, { align: frame.align === 'stretch' ? 'start' : 'stretch' })
              }
            >
              Stretch
            </button>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <ScaleInput
              scale={SPACING_SCALE}
              value={frame.gap}
              onChange={(v) => updateFrame(frame.id, { gap: v })}
              min={0}
              label="Gap"
              classPrefix="gap"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted text-[12px]">Wrap</span>
            <Switch checked={frame.wrap} onCheckedChange={(v) => updateFrame(frame.id, { wrap: v })} />
          </div>
        </div>
      </div>
    </Section>
  )
}
