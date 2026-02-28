import type { Frame, Spacing, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
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

const ONE_PX: DesignValue<number> = { mode: 'token', token: '', value: 1 }

const STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
]

export function BorderSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)

  const hasBorder = frame.border.style !== 'none'

  return (
    <Section title="Border">
      <div className="flex flex-col gap-2">
        {/* Style toggle */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={frame.border.style}
            options={STYLE_OPTIONS}
            onChange={(v) => {
              const style = v as Frame['border']['style']
              const isEnabling = style !== 'none' && frame.border.style === 'none'
              const zeroBorder = allSidesZero(frame)
              updateFrame(frame.id, {
                border: {
                  ...frame.border,
                  style,
                  ...(isEnabling && zeroBorder ? { top: ONE_PX, right: { ...ONE_PX }, bottom: { ...ONE_PX }, left: { ...ONE_PX } } : {}),
                  ...(style === 'none' ? { top: { mode: 'custom' as const, value: 0 }, right: { mode: 'custom' as const, value: 0 }, bottom: { mode: 'custom' as const, value: 0 }, left: { mode: 'custom' as const, value: 0 } } : {}),
                },
              })
            }}
            className="flex-1"
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Color */}
        {hasBorder && (
          <div className="flex items-center gap-2">
            <ColorInput
              value={frame.border.color}
              onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, color: v } })}
              label="Color"
              classPrefix="border"
            />
            <div className="w-5 shrink-0" />
          </div>
        )}

        {/* Width */}
        {hasBorder && (
          <SpacingControl
            value={borderWidthAsSpacing(frame)}
            onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, ...v } })}
            label="Width"
            classPrefix="border"
            labelPrefix="B"
            scale={BORDER_WIDTH_SCALE}
          />
        )}

        {/* Radius */}
        <BorderRadiusControl
          value={frame.borderRadius}
          onChange={(v) => updateBorderRadius(frame.id, v)}
        />
      </div>
    </Section>
  )
}
