import { Type, MoveVertical, MoveHorizontal, AlignLeft, AlignCenter, AlignRight, Settings2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react'
import { AlignVerticalCenterIcon } from '../icons/LayoutIcons'
import { useState } from 'react'
import type { TextStyles, DesignValue } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Popover } from '../ui/Popover'
import { FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE } from '../../data/scales'
import { TEXT_TRANSFORM_OPTIONS, WHITE_SPACE_OPTIONS } from './constants'

const lbl = (text: string) => <span className="text-[12px]">{text}</span>

const DECORATION_OPTIONS = [
  { value: '__none__', label: 'None', tooltip: 'No Style' },
  { value: '__italic__', label: <span className="text-[12px] italic">I</span>, tooltip: 'Italic' },
  { value: '__underline__', label: <span className="text-[12px] underline">U</span>, tooltip: 'Underline' },
  { value: '__strike__', label: <span className="text-[12px] line-through">S</span>, tooltip: 'Strikethrough' },
]

const FONT_FAMILY_OPTIONS = [
  { value: '__default__', label: 'Default' },
  { value: 'sans', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
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
          <Select
            options={FONT_FAMILY_OPTIONS}
            value={frame.fontFamily || '__default__'}
            onChange={(v) => updateFrame(frame.id, { fontFamily: v === '__default__' ? '' : v })}
            className="flex-1"
            inlineLabel={<Type size={12} />}
            initialValue="__default__"
            tooltip="Font Family"
          />
          <div className="c-slot-spacer" />
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
          <div className="c-slot-spacer" />
        </div>

        {/* Weight + Size */}
        <div className="flex items-center gap-2">
          <TokenInput
            scale={FONT_WEIGHT_SCALE}
            value={frame.fontWeight}
            onChange={(v) => updateFrame(frame.id, { fontWeight: v })}
            classPrefix="font"
            defaultValue={0}
            placeholder="400"
            unit=""
            inlineLabel={lbl('W')}
            tooltip="Font Weight"
          />
          <TokenInput
            scale={FONT_SIZE_SCALE}
            value={frame.fontSize}
            onChange={(v) => {
              updateFrame(frame.id, { fontSize: v })
            }}
            min={1}
            defaultValue={0}
            placeholder="16"
            classPrefix="text"
            inlineLabel={lbl('S')}
            tooltip="Font Size"
          />
          <div className="c-slot-spacer" />
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
          />
          <TokenInput
            scale={LETTER_SPACING_SCALE}
            value={frame.letterSpacing}
            onChange={(v) => updateFrame(frame.id, { letterSpacing: v })}
            min={-10}
            defaultValue={0}
            unit="em"
            placeholder="Auto"
            classPrefix="tracking"
            inlineLabel={<MoveHorizontal size={12} />}
            tooltip="Letter Spacing"
          />
          <div className="c-slot-spacer" />
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
              { value: 'start', label: <ArrowUpToLine size={12} />, tooltip: 'Align Top' },
              { value: 'center', label: <AlignVerticalCenterIcon size={12} />, tooltip: 'Align Middle' },
              { value: 'end', label: <ArrowDownToLine size={12} />, tooltip: 'Align Bottom' },
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
                className={`c-slot ${moreActive ? 'is-active' : ''}`}
              >
                <Settings2 size={12} />
              </button>
            }
            align="end"
          >
            <div className="c-popover">
              <span className="c-popover-title">Text Style Options</span>
              <div className="c-popover-row">
                <span className="c-popover-label">Style</span>
                <ToggleGroup
                  value={
                    frame.fontStyle === 'italic' ? '__italic__'
                      : frame.textDecoration === 'underline' ? '__underline__'
                      : frame.textDecoration === 'line-through' ? '__strike__'
                      : '__none__'
                  }
                  options={DECORATION_OPTIONS}
                  onChange={(v) => {
                    if (v === '__none__') updateFrame(frame.id, { fontStyle: 'normal', textDecoration: 'none' })
                    else if (v === '__italic__') updateFrame(frame.id, { fontStyle: frame.fontStyle === 'italic' ? 'normal' : 'italic', textDecoration: 'none' })
                    else if (v === '__underline__') updateFrame(frame.id, { fontStyle: 'normal', textDecoration: frame.textDecoration === 'underline' ? 'none' : 'underline' })
                    else if (v === '__strike__') updateFrame(frame.id, { fontStyle: 'normal', textDecoration: frame.textDecoration === 'line-through' ? 'none' : 'line-through' })
                  }}
                  className="flex-1"
                />
              </div>
              <div className="c-popover-row">
                <span className="c-popover-label">Case</span>
                <ToggleGroup
                  value={frame.textTransform}
                  options={TEXT_TRANSFORM_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { textTransform: v as TextStyles['textTransform'] })}
                  className="flex-1"
                />
              </div>
              <div className="c-popover-row">
                <span className="c-popover-label">Wrap</span>
                <ToggleGroup
                  value={frame.whiteSpace}
                  options={WHITE_SPACE_OPTIONS}
                  onChange={(v) => updateFrame(frame.id, { whiteSpace: v as TextStyles['whiteSpace'] })}
                  className="flex-1"
                />
              </div>
            </div>
          </Popover>
        </div>
      </div>
    </Section>
  )
}
