import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Select } from '../ui/Select'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
import { OVERFLOW_OPTIONS, BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function StyleSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)

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
          <div className="flex items-center gap-1.5">
            <span className="c-label">Border</span>
            <ToggleGroup
              value={frame.border.style}
              options={[
                { value: 'none', label: 'None' },
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
              className="flex-1"
              onChange={(style) =>
                updateFrame(frame.id, {
                  border: { ...frame.border, style, width: style === 'none' ? 0 : Math.max(frame.border.width, 1) },
                })
              }
            />
          </div>
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

        <BorderRadiusControl
          value={frame.borderRadius}
          onChange={(v) => updateBorderRadius(frame.id, v)}
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Overflow</span>
          <ToggleGroup
            value={frame.overflow}
            options={OVERFLOW_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { overflow: v as Frame['overflow'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Shadow</span>
          <Select
            value={frame.boxShadow}
            options={BOX_SHADOW_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { boxShadow: v as Frame['boxShadow'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Cursor</span>
          <Select
            value={frame.cursor}
            options={CURSOR_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { cursor: v as Frame['cursor'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
