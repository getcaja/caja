import { RotateCw, Scaling, MoveHorizontal, MoveVertical, Italic, Locate } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { Select } from '../ui/Select'
import { SPACING_SCALE, ROTATE_SCALE, SCALE_SCALE, SKEW_SCALE } from '../../data/scales'
import { TRANSFORM_ORIGIN_OPTIONS } from './constants'

export function TransformSection({ frame, isDirty, onReset }: { frame: Frame; isDirty?: boolean; onReset?: () => void }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)

  return (
    <Section title="Transform" defaultCollapsed isDirty={isDirty} onReset={onReset}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <TokenInput
            scale={ROTATE_SCALE}
            value={frame.rotate}
            onChange={(v) => updateFrame(frame.id, { rotate: v })}
            inlineLabel={<RotateCw size={12} />}
            classPrefix="rotate"
            defaultValue={0}
            placeholder="0"
            unit="°"
            tooltip="Rotate"
          />
          <TokenInput
            scale={SCALE_SCALE}
            value={frame.scaleVal}
            onChange={(v) => updateFrame(frame.id, { scaleVal: v })}
            min={0}
            inlineLabel={<Scaling size={12} />}
            classPrefix="scale"
            defaultValue={100}
            placeholder="100"
            unit="%"
            tooltip="Scale"
          />
          <div className="c-slot-spacer" />
        </div>
        <div className="flex items-center gap-2">
          <TokenInput
            scale={SPACING_SCALE}
            value={frame.translateX}
            onChange={(v) => updateFrame(frame.id, { translateX: v })}
            inlineLabel={<MoveHorizontal size={12} />}
            classPrefix="translate-x"
            defaultValue={0}
            placeholder="0"
            tooltip="Translate X"
          />
          <TokenInput
            scale={SPACING_SCALE}
            value={frame.translateY}
            onChange={(v) => updateFrame(frame.id, { translateY: v })}
            inlineLabel={<MoveVertical size={12} />}
            classPrefix="translate-y"
            defaultValue={0}
            placeholder="0"
            tooltip="Translate Y"
          />
          <div className="c-slot-spacer" />
        </div>
        <div className="flex items-center gap-2">
          <TokenInput
            scale={SKEW_SCALE}
            value={frame.skewX}
            onChange={(v) => updateFrame(frame.id, { skewX: v })}
            inlineLabel={<Italic size={12} />}
            classPrefix="skew-x"
            defaultValue={0}
            placeholder="0"
            unit="°"
            tooltip="Skew X"
          />
          <TokenInput
            scale={SKEW_SCALE}
            value={frame.skewY}
            onChange={(v) => updateFrame(frame.id, { skewY: v })}
            inlineLabel={<Italic size={12} />}
            classPrefix="skew-y"
            defaultValue={0}
            placeholder="0"
            unit="°"
            tooltip="Skew Y"
          />
          <div className="c-slot-spacer" />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={frame.transformOrigin}
            options={TRANSFORM_ORIGIN_OPTIONS}
            onChange={(v) => updateFrame(frame.id, { transformOrigin: v })}
            className="flex-1"
            inlineLabel={<Locate size={12} />}
            initialValue="center"
            tooltip="Transform Origin"
          />
          <div className="c-slot-spacer" />
        </div>
      </div>
    </Section>
  )
}
