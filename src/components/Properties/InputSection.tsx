import type { InputElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { Select } from '../ui/Select'
import { Switch } from '../ui/Switch'
import { INPUT_TYPE_OPTIONS } from './constants'

const TEXT_LIKE = new Set(['text', 'email', 'password', 'number', 'search', 'tel', 'url'])

export function InputSection({ frame }: { frame: InputElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const it = frame.inputType

  return (
    <Section title="Input">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Type</span>
          <Select
            value={it}
            options={INPUT_TYPE_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { inputType: v as InputElement['inputType'] })}
            className="flex-1"
          />
        </div>

        {/* Placeholder — text-like inputs only */}
        {TEXT_LIKE.has(it) && (
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
        )}

        {/* Checked — checkbox/radio */}
        {(it === 'checkbox' || it === 'radio') && (
          <div className="flex items-center gap-1.5">
            <span className="c-label">Checked</span>
            <Switch
              checked={frame.checked}
              onCheckedChange={(v) => updateFrame(frame.id, { checked: v })}
            />
          </div>
        )}

        {/* Radio: name + value */}
        {it === 'radio' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Name</span>
              <input
                type="text"
                value={frame.inputName}
                onChange={(e) => updateFrame(frame.id, { inputName: e.target.value })}
                placeholder="group"
                className="flex-1 c-input"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Value</span>
              <input
                type="text"
                value={frame.inputValue}
                onChange={(e) => updateFrame(frame.id, { inputValue: e.target.value })}
                placeholder="option-1"
                className="flex-1 c-input"
              />
            </div>
          </>
        )}

        {/* Range: min/max/step/default */}
        {it === 'range' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Min</span>
              <input type="number" value={frame.min} onChange={(e) => updateFrame(frame.id, { min: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Max</span>
              <input type="number" value={frame.max} onChange={(e) => updateFrame(frame.id, { max: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Step</span>
              <input type="number" value={frame.step} onChange={(e) => updateFrame(frame.id, { step: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Default</span>
              <input type="number" value={frame.defaultValue} onChange={(e) => updateFrame(frame.id, { defaultValue: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
          </>
        )}

        {/* Number: min/max/step */}
        {it === 'number' && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Min</span>
              <input type="number" value={frame.min} onChange={(e) => updateFrame(frame.id, { min: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Max</span>
              <input type="number" value={frame.max} onChange={(e) => updateFrame(frame.id, { max: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="c-label">Step</span>
              <input type="number" value={frame.step} onChange={(e) => updateFrame(frame.id, { step: Number(e.target.value) })} className="flex-1 c-input" />
            </div>
          </>
        )}

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
