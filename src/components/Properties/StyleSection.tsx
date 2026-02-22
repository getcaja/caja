import type { Frame, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ScaleInput } from '../ui/ScaleInput'
import { ColorInput } from '../ui/ColorInput'
import { FillInput } from '../ui/FillInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Select } from '../ui/Select'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
import { BORDER_WIDTH_SCALE } from '../../data/scales'
import { OVERFLOW_OPTIONS, BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function StyleSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)

  return (
    <Section title="Style">
      <div className="flex flex-col gap-2.5">
        <FillInput
          color={frame.bg}
          opacity={frame.opacity}
          onColorChange={(v) => updateFrame(frame.id, { bg: v })}
          onOpacityChange={(v) => updateFrame(frame.id, { opacity: v })}
          label="Fill"
          colorClassPrefix="bg"
        />

        {frame.type !== 'box' && frame.type !== 'image' && (
          <ColorInput
            value={frame.color}
            onChange={(v) => updateFrame(frame.id, { color: v })}
            label="Color"
            classPrefix="text"
          />
        )}

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
                  border: {
                    ...frame.border,
                    style,
                    width: style === 'none'
                      ? { mode: 'custom', value: 0 }
                      : frame.border.width.value < 1
                        ? { mode: 'custom', value: 1 }
                        : frame.border.width,
                  },
                })
              }
            />
          </div>
          {frame.border.style !== 'none' && (
            <>
              <ScaleInput
                scale={BORDER_WIDTH_SCALE}
                value={frame.border.width}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, width: v } })}
                min={1}
                label="Width"
                classPrefix="border"
              />
              <ColorInput
                value={frame.border.color}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, color: v } })}
                label="Color"
                classPrefix="border"
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
