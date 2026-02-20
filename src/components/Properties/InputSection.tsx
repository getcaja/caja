import type { InputElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { INPUT_TYPE_OPTIONS } from './constants'

export function InputSection({ frame }: { frame: InputElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Input">
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
        <div className="flex items-center gap-1.5">
          <span className="c-label">Type</span>
          <Select
            value={frame.inputType}
            options={INPUT_TYPE_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { inputType: v as InputElement['inputType'] })}
            className="flex-1"
          />
        </div>
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
