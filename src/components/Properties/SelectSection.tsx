import { Plus, X } from 'lucide-react'
import type { SelectElement, SelectOption } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { Switch } from '../ui/Switch'

export function SelectSection({ frame }: { frame: SelectElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  const updateOption = (index: number, field: keyof SelectOption, value: string) => {
    const options = frame.options.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    )
    updateFrame(frame.id, { options })
  }

  const addOption = () => {
    const n = frame.options.length + 1
    updateFrame(frame.id, { options: [...frame.options, { value: `option-${n}`, label: `Option ${n}` }] })
  }

  const removeOption = (index: number) => {
    if (frame.options.length <= 1) return
    updateFrame(frame.id, { options: frame.options.filter((_, i) => i !== index) })
  }

  return (
    <Section title="Select">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="c-label">Options</span>
            <button className="c-icon-btn w-5 h-5 hover:text-text-primary hover:bg-surface-2" onClick={addOption}>
              <Plus size={12} />
            </button>
          </div>
          {frame.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                value={opt.value}
                onChange={(e) => updateOption(i, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 c-input min-w-0"
              />
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(i, 'label', e.target.value)}
                placeholder="label"
                className="flex-1 c-input min-w-0"
              />
              <button
                className="c-icon-btn w-5 h-5 shrink-0 hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeOption(i)}
                disabled={frame.options.length <= 1}
              >
                <X size={10} />
              </button>
            </div>
          ))}
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
