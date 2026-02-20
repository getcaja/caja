import type { TextareaElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { Switch } from '../ui/Switch'

export function TextareaSection({ frame }: { frame: TextareaElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Textarea">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Placeholder</span>
          <input
            type="text"
            value={frame.placeholder}
            onChange={(e) => updateFrame(frame.id, { placeholder: e.target.value })}
            placeholder="Placeholder..."
            className="flex-1 c-input"
          />
        </div>
        <NumberInput value={frame.rows} onChange={(v) => updateFrame(frame.id, { rows: v })} min={1} label="Rows" />
        <div className="flex items-center gap-1.5">
          <span className="c-label">Disabled</span>
          <Switch
            checked={frame.disabled}
            onCheckedChange={(v) => updateFrame(frame.id, { disabled: v })}
          />
        </div>
      </div>
    </Section>
  )
}
