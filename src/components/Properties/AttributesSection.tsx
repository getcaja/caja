import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'

export function AttributesSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Attributes" defaultCollapsed>
      <div className="flex gap-1.5">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={frame.className}
            onChange={(e) => updateFrame(frame.id, { className: e.target.value })}
            placeholder="class"
            className="w-full c-input text-[11px]"
          />
        </div>
        <div className="w-[80px] shrink-0">
          <input
            type="text"
            value={frame.htmlId}
            onChange={(e) => updateFrame(frame.id, { htmlId: e.target.value })}
            placeholder="id"
            className="w-full c-input text-[11px]"
          />
        </div>
      </div>
    </Section>
  )
}
