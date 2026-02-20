import type { TextElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { Select } from '../ui/Select'
import { TEXT_TAG_OPTIONS } from './constants'

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
      </div>
    </Section>
  )
}
