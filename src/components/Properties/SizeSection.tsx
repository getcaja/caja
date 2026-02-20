import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { InlineSizeControl } from '../ui/InlineSizeControl'

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
        />
        <InlineSizeControl
          value={frame.height}
          onChange={(v) => updateSize(frame.id, 'height', v)}
          label="Height"
        />
        <div className="flex gap-2">
          <NumberInput
            value={frame.grow}
            onChange={(v) => updateFrame(frame.id, { grow: v })}
            min={0}
            label="Grow"
          />
          <NumberInput
            value={frame.shrink}
            onChange={(v) => updateFrame(frame.id, { shrink: v })}
            min={0}
            label="Shrink"
          />
        </div>
      </div>
    </Section>
  )
}
