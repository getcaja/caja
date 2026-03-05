import { Eclipse, MousePointer2, Droplet, Droplets } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { BLUR_SCALE } from '../../data/scales'
import { BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function EffectsSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Effects" defaultCollapsed>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={frame.boxShadow}
            options={BOX_SHADOW_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { boxShadow: v as Frame['boxShadow'] })}
            className="flex-1"
            inlineLabel={<Eclipse size={12} />}
            initialValue="none"
            tooltip="Box Shadow"
          />
          <Select
            value={frame.cursor}
            options={CURSOR_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { cursor: v as Frame['cursor'] })}
            className="flex-1"
            inlineLabel={<MousePointer2 size={12} />}
            initialValue="auto"
            tooltip="Cursor"
          />
          <div className="w-5 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.blur}
            onChange={(v) => updateFrame(frame.id, { blur: v })}
            min={0}
            inlineLabel={<Droplet size={12} />}
            classPrefix="blur"
            defaultValue={0}
            placeholder="0"
            tooltip="Blur"
          />
          <TokenInput
            scale={BLUR_SCALE}
            value={frame.backdropBlur}
            onChange={(v) => updateFrame(frame.id, { backdropBlur: v })}
            min={0}
            inlineLabel={<Droplets size={12} />}
            classPrefix="backdrop-blur"
            defaultValue={0}
            placeholder="0"
            tooltip="Backdrop Blur"
          />
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </Section>
  )
}
