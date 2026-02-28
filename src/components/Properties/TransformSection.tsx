import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { SPACING_SCALE, ROTATE_SCALE, SCALE_SCALE } from '../../data/scales'

export function TransformSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Transform" defaultCollapsed>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TokenInput
            scale={ROTATE_SCALE}
            value={frame.rotate}
            onChange={(v) => updateFrame(frame.id, { rotate: v })}
            inlineLabel="R"
            classPrefix="rotate"
            defaultValue={0}
            placeholder="0°"
            tooltip="Rotate"
          />
          <TokenInput
            scale={SCALE_SCALE}
            value={frame.scaleVal}
            onChange={(v) => updateFrame(frame.id, { scaleVal: v })}
            min={0}
            inlineLabel="S"
            classPrefix="scale"
            defaultValue={100}
            placeholder="100%"
            tooltip="Scale"
          />
          <div className="w-5 shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <TokenInput
            scale={SPACING_SCALE}
            value={frame.translateX}
            onChange={(v) => updateFrame(frame.id, { translateX: v })}
            inlineLabel="X"
            classPrefix="translate-x"
            defaultValue={0}
            tooltip="Translate X"
          />
          <TokenInput
            scale={SPACING_SCALE}
            value={frame.translateY}
            onChange={(v) => updateFrame(frame.id, { translateY: v })}
            inlineLabel="Y"
            classPrefix="translate-y"
            defaultValue={0}
            tooltip="Translate Y"
          />
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </Section>
  )
}
