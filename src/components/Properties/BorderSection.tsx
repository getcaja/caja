import type { Frame, Spacing, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { ColorInput } from '../ui/ColorInput'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
import { SpacingControl } from '../ui/SpacingControl'
import { BORDER_WIDTH_SCALE } from '../../data/scales'

function borderWidthAsSpacing(frame: Frame): Spacing {
  return {
    top: frame.border.top,
    right: frame.border.right,
    bottom: frame.border.bottom,
    left: frame.border.left,
  }
}

function allSidesZero(frame: Frame): boolean {
  return frame.border.top.value === 0 && frame.border.right.value === 0 && frame.border.bottom.value === 0 && frame.border.left.value === 0
}

const ONE_PX: DesignValue<number> = { mode: 'custom', value: 1 }

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
            onChange={(style) => {
              const isEnabling = style !== 'none' && frame.border.style === 'none'
              const zeroBorder = allSidesZero(frame)
              updateFrame(frame.id, {
                border: {
                  ...frame.border,
                  style,
                  // When enabling border and all sides are 0, set all to 1px
                  ...(isEnabling && zeroBorder ? { top: ONE_PX, right: { ...ONE_PX }, bottom: { ...ONE_PX }, left: { ...ONE_PX } } : {}),
                  // When disabling, zero out all sides
                  ...(style === 'none' ? { top: { mode: 'custom', value: 0 }, right: { mode: 'custom', value: 0 }, bottom: { mode: 'custom', value: 0 }, left: { mode: 'custom', value: 0 } } : {}),
                },
              })
            }}
          />
          {frame.border.style !== 'none' && (
            <>
              <SpacingControl
                value={borderWidthAsSpacing(frame)}
                onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, ...v } })}
                label="Width"
                classPrefix="border"
                scale={BORDER_WIDTH_SCALE}
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
