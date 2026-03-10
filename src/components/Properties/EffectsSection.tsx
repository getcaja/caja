import { Eclipse, MousePointer2, Droplet, Droplets } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { BLUR_SCALE } from '../../data/scales'
import { BOX_SHADOW_OPTIONS, CURSOR_OPTIONS } from './constants'

export function EffectsSection({ frame, onReset, overrideKeys }: { frame: Frame; onReset?: () => void; overrideKeys?: Set<string> }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const ov = (...keys: string[]) => keys.some(k => overrideKeys?.has(k)) ? ' c-overridden' : ''

  return (
    <Section title="Effects" defaultCollapsed onReset={onReset}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className={`contents${ov('boxShadow')}`}>
            <Select
              value={frame.boxShadow}
              options={BOX_SHADOW_OPTIONS}
              onChange={(v) => updateFrame(frame.id, { boxShadow: v as Frame['boxShadow'] })}
              className="flex-1"
              inlineLabel={<Eclipse size={12} />}
              initialValue="none"
              tooltip="Box Shadow"
            />
          </div>
          <div className={`contents${ov('cursor')}`}>
            <Select
              value={frame.cursor}
              options={CURSOR_OPTIONS}
              onChange={(v) => updateFrame(frame.id, { cursor: v as Frame['cursor'] })}
              className="flex-1"
              inlineLabel={<MousePointer2 size={12} />}
              initialValue="auto"
              tooltip="Cursor"
            />
          </div>
          <div className="c-slot-spacer" />
        </div>
        <div className="flex items-center gap-2">
          <div className={`contents${ov('blur')}`}>
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
          </div>
          <div className={`contents${ov('backdropBlur')}`}>
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
          </div>
          <div className="c-slot-spacer" />
        </div>
      </div>
    </Section>
  )
}
