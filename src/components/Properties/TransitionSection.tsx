import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { ToggleGroup } from '../ui/ToggleGroup'
import { DURATION_SCALE } from '../../data/scales'

const TRANSITION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'all', label: 'All' },
  { value: 'colors', label: 'Colors' },
  { value: 'opacity', label: 'Opacity' },
  { value: 'shadow', label: 'Shadow' },
  { value: 'transform', label: 'Transform' },
]

const EASE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'in-out', label: 'In Out' },
]

export function TransitionSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Transition" defaultCollapsed>
      <div className="flex flex-col gap-2.5">
        <TokenInput
          value={frame.transition}
          options={TRANSITION_OPTIONS}
          onChange={(v) => updateFrame(frame.id, { transition: v as Frame['transition'] })}
          label="Transition"
          classPrefix="transition"
          initialValue="none"
        />
        {frame.transition !== 'none' && (
          <div className="flex gap-2 items-center">
            <TokenInput
              scale={DURATION_SCALE}
              value={frame.duration}
              onChange={(v) => updateFrame(frame.id, { duration: v })}
              min={0}
              label="Duration"
              classPrefix="duration"
              defaultValue={0}
            />
            <div className="flex items-center gap-1">
              <span className="text-text-muted text-[12px]">Ease</span>
              <ToggleGroup
                value={frame.ease}
                options={EASE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { ease: v as Frame['ease'] })}
              />
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
