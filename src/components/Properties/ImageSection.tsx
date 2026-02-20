import type { ImageElement } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { ToggleGroup } from '../ui/ToggleGroup'

export function ImageSection({ frame }: { frame: ImageElement }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Image">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="c-label">Source</span>
          <input
            type="text"
            value={frame.src}
            onChange={(e) => updateFrame(frame.id, { src: e.target.value })}
            placeholder="https://..."
            className="flex-1 c-input"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Alt</span>
          <input
            type="text"
            value={frame.alt}
            onChange={(e) => updateFrame(frame.id, { alt: e.target.value })}
            placeholder="Description..."
            className="flex-1 c-input"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="c-label">Fit</span>
          <ToggleGroup
            value={frame.objectFit}
            options={[
              { value: 'cover', label: 'Cover' },
              { value: 'contain', label: 'Contain' },
              { value: 'fill', label: 'Fill' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => updateFrame(frame.id, { objectFit: v as ImageElement['objectFit'] })}
            className="flex-1"
          />
        </div>
      </div>
    </Section>
  )
}
