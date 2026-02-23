import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { BLUR_SCALE } from '../../data/scales'
import { OVERFLOW_OPTIONS, BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function EffectsSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Effects">
      <div className="flex flex-col gap-2.5">
        <TokenInput
          value={frame.overflow}
          options={OVERFLOW_OPTIONS}
          onChange={(v) => updateFrame(frame.id, { overflow: v as Frame['overflow'] })}
          label="Overflow"
          classPrefix="overflow"
          initialValue="visible"
        />

        <TokenInput
          value={frame.boxShadow}
          options={BOX_SHADOW_OPTIONS}
          onChange={(v) => updateFrame(frame.id, { boxShadow: v as Frame['boxShadow'] })}
          label="Shadow"
          classPrefix="shadow"
          initialValue="none"
        />

        <div className="flex gap-2">
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.blur}
            onChange={(v) => updateFrame(frame.id, { blur: v })}
            min={0}
            label="Blur"
            classPrefix="blur"
            defaultValue={0}
          />
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.backdropBlur}
            onChange={(v) => updateFrame(frame.id, { backdropBlur: v })}
            min={0}
            label="Backdrop"
            classPrefix="backdrop-blur"
            defaultValue={0}
          />
        </div>

        <TokenInput
          value={frame.cursor}
          options={CURSOR_OPTIONS}
          onChange={(v) => updateFrame(frame.id, { cursor: v as Frame['cursor'] })}
          label="Cursor"
          classPrefix="cursor"
          initialValue="auto"
        />
      </div>
    </Section>
  )
}
