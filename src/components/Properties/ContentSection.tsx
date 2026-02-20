import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import type { TextElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { NumberInput } from '../ui/NumberInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { Select } from '../ui/Select'
import { TEXT_TAG_OPTIONS, FONT_WEIGHT_OPTIONS } from './constants'

export function ContentSection({ frame }: { frame: TextElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Content">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Tag</span>
          <Select
            value={frame.tag || 'p'}
            options={TEXT_TAG_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { tag: v as TextElement['tag'] })}
            className="flex-1"
          />
        </div>

        {(frame.tag === 'a') && (
          <div className="flex items-center gap-1.5">
            <span className="c-label">Href</span>
            <input
              type="text"
              value={frame.href || ''}
              onChange={(e) => updateFrame(frame.id, { href: e.target.value })}
              placeholder="https://..."
              className="flex-1 c-input"
            />
          </div>
        )}

        <textarea
          value={frame.content}
          onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
          className="w-full h-14 c-textarea"
          placeholder="Text content..."
        />

        <div className="flex gap-2">
          <NumberInput
            value={frame.fontSize}
            onChange={(v) => updateFrame(frame.id, { fontSize: v })}
            min={1}
            label="Size"
          />
          <NumberInput
            value={frame.lineHeight}
            onChange={(v) => updateFrame(frame.id, { lineHeight: v })}
            min={0.5}
            label="Line H."
          />
        </div>

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
              { value: 'left', label: <AlignLeft size={12} /> },
              { value: 'center', label: <AlignCenter size={12} /> },
              { value: 'right', label: <AlignRight size={12} /> },
            ]}
            onChange={(v) => updateFrame(frame.id, { textAlign: v as TextElement['textAlign'] })}
          />
        </div>
      </div>
    </Section>
  )
}
