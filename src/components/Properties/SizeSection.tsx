import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ScaleInput } from '../ui/ScaleInput'
import { InlineSizeControl } from '../ui/InlineSizeControl'
import { ToggleGroup } from '../ui/ToggleGroup'
import { SIZE_CONSTRAINT_SCALE, GROW_SCALE, SHRINK_SCALE } from '../../data/scales'
import { ALIGN_SELF_OPTIONS } from './constants'

export function SizeSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateSize = useFrameStore((s) => s.updateSize)

  return (
    <Section title="Size">
      <div className="flex flex-col gap-2">
        <InlineSizeControl
          value={frame.width}
          onChange={(v) => updateSize(frame.id, 'width', v)}
          label="Width"
          classPrefix="w"
        />
        <InlineSizeControl
          value={frame.height}
          onChange={(v) => updateSize(frame.id, 'height', v)}
          label="Height"
          classPrefix="h"
        />
        <div className="flex gap-2">
          <ScaleInput
            scale={GROW_SCALE}
            value={frame.grow}
            onChange={(v) => updateFrame(frame.id, { grow: v })}
            min={0}
            label="Grow"
            classPrefix="grow"
            defaultValue={0}
          />
          <ScaleInput
            scale={SHRINK_SCALE}
            value={frame.shrink}
            onChange={(v) => updateFrame(frame.id, { shrink: v })}
            min={0}
            label="Shrink"
            classPrefix="shrink"
            defaultValue={1}
          />
        </div>
        <div className="flex gap-2">
          <ScaleInput
            scale={SIZE_CONSTRAINT_SCALE}
            value={frame.minWidth}
            onChange={(v) => updateFrame(frame.id, { minWidth: v })}
            min={0}
            label="Min W"
            classPrefix="min-w"
          />
          <ScaleInput
            scale={SIZE_CONSTRAINT_SCALE}
            value={frame.maxWidth}
            onChange={(v) => updateFrame(frame.id, { maxWidth: v })}
            min={0}
            label="Max W"
            classPrefix="max-w"
          />
        </div>
        <div className="flex gap-2">
          <ScaleInput
            scale={SIZE_CONSTRAINT_SCALE}
            value={frame.minHeight}
            onChange={(v) => updateFrame(frame.id, { minHeight: v })}
            min={0}
            label="Min H"
            classPrefix="min-h"
          />
          <ScaleInput
            scale={SIZE_CONSTRAINT_SCALE}
            value={frame.maxHeight}
            onChange={(v) => updateFrame(frame.id, { maxHeight: v })}
            min={0}
            label="Max H"
            classPrefix="max-h"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Align</span>
          <ToggleGroup
            value={frame.alignSelf}
            options={ALIGN_SELF_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { alignSelf: v as Frame['alignSelf'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
