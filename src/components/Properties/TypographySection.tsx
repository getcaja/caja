import { Italic, Underline, Strikethrough } from 'lucide-react'
import type { TextStyles } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { ColorInput } from '../ui/ColorInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { FONT_SIZE_SCALE, FONT_WEIGHT_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE, getCompoundLineHeight } from '../../data/scales'
import { TEXT_TRANSFORM_OPTIONS, WHITE_SPACE_OPTIONS } from './constants'

export function TypographySection({ frame }: { frame: TextStyles & { id: string } }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Typography">
      <div className="flex flex-col gap-2.5">
        <ColorInput
          value={frame.color}
          onChange={(v) => updateFrame(frame.id, { color: v })}
          label="Color"
          classPrefix="text"
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
          label="Size"
          classPrefix="text"
        />
        <TokenInput
          scale={LINE_HEIGHT_SCALE}
          value={frame.lineHeight}
          onChange={(v) => updateFrame(frame.id, { lineHeight: v })}
          min={0.5}
          label="Leading"
          unit=""
          classPrefix="leading"
        />

        <TokenInput
          scale={FONT_WEIGHT_SCALE}
          value={frame.fontWeight}
          onChange={(v) => updateFrame(frame.id, { fontWeight: v })}
          label="Weight"
          classPrefix="font"
          defaultValue={400}
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Align</span>
          <ToggleGroup
            value={frame.textAlign}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlign: v as TextStyles['textAlign'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Style</span>
          <div className="flex flex-1 bg-surface-0 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => updateFrame(frame.id, { fontStyle: frame.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center ${
                frame.fontStyle === 'italic'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Italic size={12} />
            </button>
            <button
              type="button"
              onClick={() => updateFrame(frame.id, { textDecoration: frame.textDecoration === 'underline' ? 'none' : 'underline' })}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center ${
                frame.textDecoration === 'underline'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Underline size={12} />
            </button>
            <button
              type="button"
              onClick={() => updateFrame(frame.id, { textDecoration: frame.textDecoration === 'line-through' ? 'none' : 'line-through' })}
              className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center ${
                frame.textDecoration === 'line-through'
                  ? 'bg-surface-3 text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Strikethrough size={12} />
            </button>
          </div>
        </div>

        <TokenInput
          scale={LETTER_SPACING_SCALE}
          value={frame.letterSpacing}
          onChange={(v) => updateFrame(frame.id, { letterSpacing: v })}
          min={-10}
          defaultValue={0}
          label="Tracking"
          unit="px"
          classPrefix="tracking"
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Case</span>
          <ToggleGroup
            value={frame.textTransform}
            options={TEXT_TRANSFORM_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { textTransform: v as TextStyles['textTransform'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Wrap</span>
          <ToggleGroup
            value={frame.whiteSpace}
            options={WHITE_SPACE_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { whiteSpace: v as TextStyles['whiteSpace'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
