import { Zap, Timer } from 'lucide-react'
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
  { value: 'linear', label: 'Linear', tooltip: 'Ease: Linear' },
  { value: 'in', label: 'In', tooltip: 'Ease: In' },
  { value: 'out', label: 'Out', tooltip: 'Ease: Out' },
  { value: 'in-out', label: 'In Out', tooltip: 'Ease: In Out' },
]

export function TransitionSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Transition" defaultCollapsed>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TokenInput
            value={frame.transition}
            options={TRANSITION_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { transition: v as Frame['transition'] })}
            inlineLabel={<Zap size={12} />}
            classPrefix="transition"
            initialValue="none"
            tooltip="Transition"
          />
          <div className="w-5 shrink-0" />
        </div>
        {frame.transition !== 'none' && (
          <>
            <div className="flex items-center gap-2">
              <TokenInput
                scale={DURATION_SCALE}
                value={frame.duration}
                onChange={(v) => updateFrame(frame.id, { duration: v })}
                min={0}
                inlineLabel={<Timer size={12} />}
                classPrefix="duration"
                defaultValue={0}
                tooltip="Duration"
              />
              <div className="w-5 shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup
                value={frame.ease}
                options={EASE_OPTIONS}
                onChange={(v) => updateFrame(frame.id, { ease: v as Frame['ease'] })}
                className="flex-1"
              />
              <div className="w-5 shrink-0" />
            </div>
          </>
        )}
      </div>
    </Section>
  )
}
