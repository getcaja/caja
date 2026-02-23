import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { ColorInput } from '../ui/ColorInput'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
import { BORDER_WIDTH_SCALE } from '../../data/scales'

export function BorderSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)

  return (
    <Section title="Border">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <TokenInput
            value={frame.border.style}
            options={[
              { value: 'none', label: 'None' },
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
              { value: 'dotted', label: 'Dotted' },
            ]}
            label="Border"
            classPrefix="border"
            initialValue="none"
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
          {frame.border.style !== 'none' && (
            <>
              <TokenInput
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
      </div>
    </Section>
  )
}
