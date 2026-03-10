import { Zap, Timer, Spline } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
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
  { value: 'in', label: 'Ease In' },
  { value: 'out', label: 'Ease Out' },
  { value: 'in-out', label: 'Ease In Out' },
]

export function TransitionSection({ frame, onReset }: { frame: Frame; onReset?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Transition" defaultCollapsed onReset={onReset}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={frame.transition}
            options={TRANSITION_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { transition: v as Frame['transition'] })}
            className="flex-1"
            inlineLabel={<Zap size={12} />}
            initialValue="none"
            tooltip="Transition"
          />
          <div className="c-slot-spacer" />
        </div>
        {frame.transition !== 'none' && (
          <div className="flex items-center gap-2">
            <TokenInput
              scale={DURATION_SCALE}
              value={frame.duration}
              onChange={(v) => updateFrame(frame.id, { duration: v })}
              min={0}
              inlineLabel={<Timer size={12} />}
              classPrefix="duration"
              defaultValue={0}
              placeholder="0"
              unit="ms"
              tooltip="Duration"
            />
            <Select
              value={frame.ease}
              options={EASE_OPTIONS}
              onChange={(v) => updateFrame(frame.id, { ease: v as Frame['ease'] })}
              className="flex-1"
              inlineLabel={<Spline size={12} />}
              initialValue="linear"
              tooltip="Easing"
            />
            <div className="c-slot-spacer" />
          </div>
        )}
      </div>
    </Section>
  )
}
