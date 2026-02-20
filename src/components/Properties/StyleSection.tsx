import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { OVERFLOW_OPTIONS } from './constants'

export function StyleSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Style">
      <div className="flex flex-col gap-2.5">
        <ColorInput
          value={frame.bg}
          onChange={(v) => updateFrame(frame.id, { bg: v })}
          label="Fill"
        />

        {frame.type === 'text' && (
          <ColorInput
            value={frame.color}
            onChange={(v) => updateFrame(frame.id, { color: v })}
            label="Color"
          />
        )}

        <NumberInput
          value={frame.opacity}
          onChange={(v) => updateFrame(frame.id, { opacity: v })}
          min={0}
          max={100}
          label="Opacity"
        />

        <div className="flex flex-col gap-1.5">
          <ToggleGroup
            value={frame.border.style}
            options={[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            onChange={(style) =>
              updateFrame(frame.id, {
                border: { ...frame.border, style, width: style === 'none' ? 0 : Math.max(frame.border.width, 1) },
              })
            }
          />
          {frame.border.style !== 'none' && (
            <>
              <NumberInput
                value={frame.border.width}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, width: v } })}
                min={1}
                label="Width"
              />
              <ColorInput
                value={frame.border.color}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, color: v } })}
                label="Color"
              />
            </>
          )}
        </div>

        <NumberInput
          value={frame.borderRadius}
          onChange={(v) => updateFrame(frame.id, { borderRadius: v })}
          min={0}
          label="Radius"
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Clip</span>
          <ToggleGroup
            value={frame.overflow}
            options={OVERFLOW_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { overflow: v as Frame['overflow'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
