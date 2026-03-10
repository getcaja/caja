import type { Frame, Spacing, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { SpacingControl } from '../ui/SpacingControl'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
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
const BLACK: DesignValue<string> = { mode: 'token', token: 'black', value: '#000000' }

const STYLE_OPTIONS: { value: string; label: string; tooltip?: string }[] = [
  { value: 'none', label: 'None', tooltip: 'No Border' },
  { value: 'solid', label: 'Solid', tooltip: 'Solid Border' },
  { value: 'dashed', label: 'Dashed', tooltip: 'Dashed Border' },
  { value: 'dotted', label: 'Dotted', tooltip: 'Dotted Border' },
]

export function BorderSection({ frame, onReset, overrideKeys }: { frame: Frame; onReset?: () => void; overrideKeys?: Set<string> }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)
  const ov = (...keys: string[]) => keys.some(k => overrideKeys?.has(k)) ? ' c-overridden' : ''

  const hasBorder = frame.border.style !== 'none'

  return (
    <Section title="Border" onReset={onReset}>
      <div className="flex flex-col gap-2">
        {/* Border Radius */}
        <div className={ov('borderRadius').trim() || undefined}>
          <BorderRadiusControl
            value={frame.borderRadius}
            onChange={(v) => updateBorderRadius(frame.id, v)}
          />
        </div>

        {/* Style toggle */}
        <div className={`flex items-center gap-2${ov('border')}`}>
          <ToggleGroup
            value={frame.border.style}
            options={STYLE_OPTIONS}
            onChange={(v) => {
              const style = v as Frame['border']['style']
              const isEnabling = style !== 'none' && frame.border.style === 'none'
              const zeroBorder = allSidesZero(frame)
              const noColor = frame.border.color.value === ''
              updateFrame(frame.id, {
                border: {
                  ...frame.border,
                  style,
                  ...(isEnabling && zeroBorder ? { top: ONE_PX, right: { ...ONE_PX }, bottom: { ...ONE_PX }, left: { ...ONE_PX } } : {}),
                  ...(isEnabling && noColor ? { color: BLACK } : {}),
                  ...(style === 'none' ? { top: { mode: 'custom' as const, value: 0 }, right: { mode: 'custom' as const, value: 0 }, bottom: { mode: 'custom' as const, value: 0 }, left: { mode: 'custom' as const, value: 0 } } : {}),
                },
              })
            }}
            className="flex-1"
          />
          <div className="c-slot-spacer" />
        </div>

        {/* Color */}
        {hasBorder && (
          <div className={`flex items-center gap-2${ov('border')}`}>
            <ColorInput
              value={frame.border.color}
              onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, color: v } })}
              label="Color"
              classPrefix="border"
              tooltip="Border Color"
            />
            <div className="c-slot-spacer" />
          </div>
        )}

        {/* Width */}
        {hasBorder && (
          <div className={ov('border').trim() || undefined}>
            <SpacingControl
              value={borderWidthAsSpacing(frame)}
              onChange={(v) => updateFrame(frame.id, { border: { ...frame.border, ...v } })}
              label="Width"
              classPrefix="border"
              labelPrefix="W"
              scale={BORDER_WIDTH_SCALE}
            />
          </div>
        )}

      </div>
    </Section>
  )
}
