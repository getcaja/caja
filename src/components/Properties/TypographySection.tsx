import { Type, MoveVertical, MoveHorizontal, AlignLeft, AlignCenter, AlignRight, Italic, Underline, Strikethrough, Ellipsis } from 'lucide-react'
import { useState } from 'react'
import type { TextStyles, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Popover } from '../ui/Popover'
import { FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE, getCompoundLineHeight } from '../../data/scales'
import { TEXT_TRANSFORM_OPTIONS, WHITE_SPACE_OPTIONS } from './constants'

const lbl = (text: string) => <span className="text-[12px]">{text}</span>

const FONT_FAMILY_OPTIONS = [
  { value: '', label: 'Default', token: '' },
  { value: 'sans', label: 'Sans Serif', token: 'sans', group: 'Fonts' },
  { value: 'serif', label: 'Serif', token: 'serif' },
  { value: 'mono', label: 'Monospace', token: 'mono' },
]

export function TypographySection({ frame, hasOverrides, onResetOverrides }: { frame: TextStyles & { id: string; color: DesignValue<string> }; hasOverrides?: boolean; onResetOverrides?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const [moreOpen, setMoreOpen] = useState(false)

  const moreActive = frame.fontStyle !== 'normal'
    || frame.textDecoration !== 'none'
    || frame.textTransform !== 'none'
    || frame.whiteSpace !== 'normal'

  return (
    <Section title="Typography" hasOverrides={hasOverrides} onResetOverrides={onResetOverrides}>
      <div className="flex flex-col gap-2">
        {/* Font family */}
        <div className="flex items-center gap-2">
          <TokenInput
            options={FONT_FAMILY_OPTIONS}
            value={frame.fontFamily}
            onChange={(v) => updateFrame(frame.id, { fontFamily: v })}
            classPrefix="font"
            initialValue=""
            inlineLabel={<Type size={12} />}
            tooltip="Font Family"
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Color */}
        <div className="flex items-center gap-2">
          <ColorInput
            value={frame.color}
            onChange={(v) => updateFrame(frame.id, { color: v })}
            label="Color"
            classPrefix="text"
            tooltip="Text Color"
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Weight + Size */}
        <div className="flex items-center gap-2">
          <TokenInput
            scale={FONT_WEIGHT_SCALE}
            value={frame.fontWeight}
            onChange={(v) => updateFrame(frame.id, { fontWeight: v })}
            classPrefix="font"
            defaultValue={0}
            placeholder="Regular"
            inlineLabel={lbl('W')}
            tooltip="Font Weight"
            autoOption={{
              label: 'Default',
              active: frame.fontWeight.mode === 'custom' && frame.fontWeight.value === 0,
              onToggle: () => updateFrame(frame.id, { fontWeight: { mode: 'custom', value: 0 } }),
            }}
          />
          <TokenInput
            scale={FONT_SIZE_SCALE}
            value={frame.fontSize}
            onChange={(v) => {
              const updates: Record<string, unknown> = { fontSize: v }
              if (v.mode === 'token') {
                const defaultLH = getCompoundLineHeight(v.token)
                if (defaultLH) updates.lineHeight = defaultLH
              }
              updateFrame(frame.id, updates)
            }}
            min={1}
            defaultValue={0}
            placeholder="16"
            classPrefix="text"
            inlineLabel={lbl('S')}
            tooltip="Font Size"
            autoOption={{
              label: 'Default',
              active: frame.fontSize.mode === 'custom' && frame.fontSize.value === 0,
              onToggle: () => updateFrame(frame.id, { fontSize: { mode: 'custom', value: 0 } }),
            }}
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Leading + Tracking */}
        <div className="flex items-center gap-2">
          <TokenInput
            scale={LINE_HEIGHT_SCALE}
            value={frame.lineHeight}
            onChange={(v) => updateFrame(frame.id, { lineHeight: v })}
            min={0.5}
            defaultValue={0}
            unit=""
            placeholder="Auto"
            classPrefix="leading"
            inlineLabel={<MoveVertical size={12} />}
            tooltip="Line Height"
            autoOption={{
              label: 'Default',
              active: frame.lineHeight.mode === 'custom' && frame.lineHeight.value === 0,
              onToggle: () => updateFrame(frame.id, { lineHeight: { mode: 'custom', value: 0 } }),
            }}
          />
          <TokenInput
            scale={LETTER_SPACING_SCALE}
            value={frame.letterSpacing}
            onChange={(v) => updateFrame(frame.id, { letterSpacing: v })}
            min={-10}
            defaultValue={0}
            unit="px"
            placeholder="Auto"
            classPrefix="tracking"
            inlineLabel={<MoveHorizontal size={12} />}
            tooltip="Letter Spacing"
            autoOption={{
              label: 'Default',
              active: frame.letterSpacing.mode === 'custom' && frame.letterSpacing.value === 0,
              onToggle: () => updateFrame(frame.id, { letterSpacing: { mode: 'custom', value: 0 } }),
            }}
          />
          <div className="w-5 shrink-0" />
        </div>

        {/* Align H + Align V + More */}
        <div className="flex items-center gap-2">
          <ToggleGroup
            value={frame.textAlign}
            options={[
              { value: 'left', label: <AlignLeft size={12} />, tooltip: 'Align Left' },
              { value: 'center', label: <AlignCenter size={12} />, tooltip: 'Align Center' },
              { value: 'right', label: <AlignRight size={12} />, tooltip: 'Align Right' },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlign: v as TextStyles['textAlign'] })}
            className="flex-1"
          />
          <ToggleGroup
            value={frame.textAlignVertical}
            options={[
              { value: 'start', label: 'Top', tooltip: 'Align Top' },
              { value: 'center', label: 'Mid', tooltip: 'Align Middle' },
              { value: 'end', label: 'Bot', tooltip: 'Align Bottom' },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlignVertical: v as TextStyles['textAlignVertical'] })}
            className="flex-1"
          />
          <Popover
            open={moreOpen}
            onOpenChange={setMoreOpen}
            trigger={
              <button
                type="button"
                title="Text Style"
                className={`w-5 h-5 shrink-0 flex items-center justify-center rounded ${
                  moreActive
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'fg-subtle hover:fg-muted hover:bg-inset'
                }`}
              >
                <Ellipsis size={12} />
              </button>
            }
            align="end"
          >
            <div className="flex flex-col gap-2 p-2 w-[200px]">
              {/* Style: Italic / Underline / Strikethrough */}
              <div className="flex bg-inset rounded">
                <button
                  type="button"
                  onClick={() => updateFrame(frame.id, { fontStyle: frame.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  className={`flex-1 h-6 px-1.5 rounded flex items-center justify-center ${
                    frame.fontStyle === 'italic'
                      ? 'bg-emphasis fg-default shadow-sm'
                      : 'fg-subtle hover:fg-muted'
                  }`}
                >
                  <Italic size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => updateFrame(frame.id, { textDecoration: frame.textDecoration === 'underline' ? 'none' : 'underline' })}
                  className={`flex-1 h-6 px-1.5 rounded flex items-center justify-center ${
                    frame.textDecoration === 'underline'
                      ? 'bg-emphasis fg-default shadow-sm'
                      : 'fg-subtle hover:fg-muted'
                  }`}
                >
                  <Underline size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => updateFrame(frame.id, { textDecoration: frame.textDecoration === 'line-through' ? 'none' : 'line-through' })}
                  className={`flex-1 h-6 px-1.5 rounded flex items-center justify-center ${
                    frame.textDecoration === 'line-through'
                      ? 'bg-emphasis fg-default shadow-sm'
                      : 'fg-subtle hover:fg-muted'
                  }`}
                >
                  <Strikethrough size={12} />
                </button>
              </div>

              {/* Case */}
              <ToggleGroup
                value={frame.textTransform}
                options={TEXT_TRANSFORM_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { textTransform: v as TextStyles['textTransform'] })}
              />

              {/* Wrap */}
              <ToggleGroup
                value={frame.whiteSpace}
                options={WHITE_SPACE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { whiteSpace: v as TextStyles['whiteSpace'] })}
              />
            </div>
          </Popover>
        </div>
      </div>
    </Section>
  )
}
