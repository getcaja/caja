import { Columns3, Rows3, AlignHorizontalJustifyCenter, AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround, Square, LayoutGrid } from 'lucide-react'
import type { BoxElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Switch } from '../ui/Switch'

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
          <span className="c-label">Display</span>
          <ToggleGroup
            value="flex"
            options={[
              { value: 'block', label: <Square size={12} />, tooltip: 'Block', disabled: true },
              { value: 'flex', label: 'Flex', tooltip: 'Flex' },
              { value: 'grid', label: <LayoutGrid size={12} />, tooltip: 'Grid', disabled: true },
            ]}
            onChange={() => {}}
            className="flex-1"
          />
        </div>

        <ToggleGroup
          value={frame.direction}
          options={[
            { value: 'row', label: <Columns3 size={14} />, tooltip: 'Horizontal' },
            { value: 'column', label: <Rows3 size={14} />, tooltip: 'Vertical' },
          ]}
          onChange={(v) => updateFrame(frame.id, { direction: v })}
        />

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
                const isActive = !isSpaceBetween && currentJ === j && currentA === a
                return (
                  <button
                    key={`${ri}-${ci}`}
                    className={`w-[14px] h-[14px] rounded-sm transition-all ${
                      isActive ? 'bg-accent' : 'bg-surface-3 hover:bg-border-accent'
                    }`}
                    onClick={() => updateFrame(frame.id, { justify: j, align: a })}
                  />
                )
              })
            )}
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <ToggleGroup
              value={isSpaceBetween ? frame.justify : 'default'}
              options={[
                { value: 'default', label: <AlignHorizontalJustifyCenter size={14} />, tooltip: 'Packed' },
                { value: 'between', label: <AlignHorizontalSpaceBetween size={14} />, tooltip: 'Space between' },
                { value: 'around', label: <AlignHorizontalSpaceAround size={14} />, tooltip: 'Space around' },
              ]}
              onChange={(v) => {
                if (v === 'default') updateFrame(frame.id, { justify: currentJ })
                else updateFrame(frame.id, { justify: v as BoxElement['justify'] })
              }}
            />
            <button
              className={`px-2 py-1 text-[12px] rounded-md transition-all ${
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
            <NumberInput value={frame.gap} onChange={(v) => updateFrame(frame.id, { gap: v })} min={0} label="Gap" />
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
