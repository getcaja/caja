import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { MARGIN_SCALE } from '../../data/scales'
import { Section } from '../ui/Section'
import { SpacingControl } from '../ui/SpacingControl'

export function SpacingSection({ frame }: { frame: Frame }) {
  const updateSpacing = useFrameStore((s) => s.updateSpacing)

  return (
    <Section title="Spacing">
      <div className="flex flex-col gap-2">
        <SpacingControl
          value={frame.margin}
          onChange={(v) => updateSpacing(frame.id, 'margin', v)}
          label="Margin"
          classPrefix="m"
          scale={MARGIN_SCALE}
        />
        <SpacingControl
          value={frame.padding}
          onChange={(v) => updateSpacing(frame.id, 'padding', v)}
          label="Padding"
          classPrefix="p"
        />
      </div>
    </Section>
  )
}
