import { Italic, Underline, Strikethrough } from 'lucide-react'
import type { TextElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ScaleInput } from '../ui/ScaleInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Select } from '../ui/Select'
import { FONT_SIZE_SCALE, LINE_HEIGHT_SCALE, LETTER_SPACING_SCALE } from '../../data/scales'
import { FONT_WEIGHT_OPTIONS, TEXT_TRANSFORM_OPTIONS, WHITE_SPACE_OPTIONS } from './constants'

export function TypographySection({ frame }: { frame: TextElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Typography">
      <div className="flex flex-col gap-2.5">
        <ScaleInput
          scale={FONT_SIZE_SCALE}
          value={frame.fontSize}
          onChange={(v) => updateFrame(frame.id, { fontSize: v })}
          min={1}
          label="Size"
          classPrefix="text"
        />
        <ScaleInput
          scale={LINE_HEIGHT_SCALE}
          value={frame.lineHeight}
          onChange={(v) => updateFrame(frame.id, { lineHeight: v })}
          min={0.5}
          label="Leading"
          unit=""
          classPrefix="leading"
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Weight</span>
          <Select
            value={String(frame.fontWeight)}
            options={FONT_WEIGHT_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { fontWeight: Number(v) as TextElement['fontWeight'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Align</span>
          <ToggleGroup
            value={frame.textAlign}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlign: v as TextElement['textAlign'] })}
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

        <ScaleInput
          scale={LETTER_SPACING_SCALE}
          value={frame.letterSpacing}
          onChange={(v) => updateFrame(frame.id, { letterSpacing: v })}
          min={-10}
          label="Tracking"
          unit="px"
          classPrefix="tracking"
        />

        <div className="flex items-center gap-1.5">
          <span className="c-label">Case</span>
          <ToggleGroup
            value={frame.textTransform}
            options={TEXT_TRANSFORM_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { textTransform: v as TextElement['textTransform'] })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="c-label">Wrap</span>
          <ToggleGroup
            value={frame.whiteSpace}
            options={WHITE_SPACE_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { whiteSpace: v as TextElement['whiteSpace'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
