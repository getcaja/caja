import type { TextElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'

export function ContentSection({ frame }: { frame: TextElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Content">
      <div className="flex flex-col gap-2.5">
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
