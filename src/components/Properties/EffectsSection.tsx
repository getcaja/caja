import { Eclipse, MousePointer2, Droplets, Layers } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { BLUR_SCALE } from '../../data/scales'
import { BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function EffectsSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Effects">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TokenInput
            value={frame.boxShadow}
            options={BOX_SHADOW_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { boxShadow: v as Frame['boxShadow'] })}
            inlineLabel={<Eclipse size={12} />}
            classPrefix="shadow"
            initialValue="none"
          />
          <TokenInput
            value={frame.cursor}
            options={CURSOR_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { cursor: v as Frame['cursor'] })}
            inlineLabel={<MousePointer2 size={12} />}
            classPrefix="cursor"
            initialValue="auto"
          />
          <div className="w-5 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.blur}
            onChange={(v) => updateFrame(frame.id, { blur: v })}
            min={0}
            inlineLabel={<Droplets size={12} />}
            classPrefix="blur"
            defaultValue={0}
          />
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.backdropBlur}
            onChange={(v) => updateFrame(frame.id, { backdropBlur: v })}
            min={0}
            inlineLabel={<Layers size={12} />}
            classPrefix="backdrop-blur"
            defaultValue={0}
          />
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </Section>
  )
}
