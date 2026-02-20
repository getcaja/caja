import type { ButtonElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ToggleGroup } from '../ui/ToggleGroup'

export function ButtonSection({ frame }: { frame: ButtonElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Button">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Label</span>
          <input
            type="text"
            value={frame.label}
            onChange={(e) => updateFrame(frame.id, { label: e.target.value })}
            placeholder="Button"
            className="flex-1 c-input"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Variant</span>
          <ToggleGroup
            value={frame.variant}
            options={[
              { value: 'filled', label: 'Filled' },
              { value: 'outline', label: 'Outline' },
              { value: 'ghost', label: 'Ghost' },
            ]}
            onChange={(v) => updateFrame(frame.id, { variant: v as ButtonElement['variant'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
