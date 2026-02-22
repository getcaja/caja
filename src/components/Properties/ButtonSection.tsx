import type { ButtonElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'

export function ButtonSection({ frame }: { frame: ButtonElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Button">
      <div className="flex items-center gap-1.5">
        <span className="c-label">Content</span>
        <input
          type="text"
          value={frame.content}
          onChange={(e) => updateFrame(frame.id, { content: e.target.value })}
          placeholder="Button"
          className="flex-1 c-input"
        />
      </div>
    </Section>
  )
}
