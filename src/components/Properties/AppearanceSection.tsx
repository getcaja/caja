import { Blend } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { BorderRadiusControl } from '../ui/BorderRadiusControl'
import { OPACITY_SCALE } from '../../data/scales'

export function AppearanceSection({ frame, hasOverrides, onResetOverrides }: { frame: Frame; hasOverrides?: boolean; onResetOverrides?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateBorderRadius = useFrameStore((s) => s.updateBorderRadius)

  return (
    <Section title="Appearance" hasOverrides={hasOverrides} onResetOverrides={onResetOverrides}>
      <div className="flex flex-col gap-2">
        <BorderRadiusControl
          value={frame.borderRadius}
          onChange={(v) => updateBorderRadius(frame.id, v)}
        />
        <div className="flex items-center gap-2">
          <TokenInput
            scale={OPACITY_SCALE}
            value={frame.opacity}
            onChange={(v) => updateFrame(frame.id, { opacity: v })}
            min={0}
            unit="%"
            classPrefix="opacity"
            defaultValue={100}
            inlineLabel={<Blend size={12} />}
            tooltip="Opacity"
          />
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </Section>
  )
}
