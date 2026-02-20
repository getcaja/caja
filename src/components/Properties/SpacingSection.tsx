import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { SpacingControl } from '../ui/SpacingControl'

export function SpacingSection({ frame }: { frame: Frame }) {
  const updateSpacing = useFrameStore((s) => s.updateSpacing)

  return (
    <Section title="Spacing">
      <div className="flex flex-col gap-2.5">
        <SpacingControl
          value={frame.margin}
          onChange={(v) => updateSpacing(frame.id, 'margin', v)}
          label="Margin"
        />
        <SpacingControl
          value={frame.padding}
          onChange={(v) => updateSpacing(frame.id, 'padding', v)}
          label="Padding"
        />
      </div>
    </Section>
  )
}
