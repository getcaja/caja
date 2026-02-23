import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { SPACING_SCALE, Z_INDEX_SCALE } from '../../data/scales'

const POSITION_OPTIONS = [
  { value: 'static', label: 'Static' },
  { value: 'relative', label: 'Relative' },
  { value: 'absolute', label: 'Absolute' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'sticky', label: 'Sticky' },
]

export function PositionSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const updateSpacing = useFrameStore((s) => s.updateSpacing)

  const isPositioned = frame.position !== 'static'

  return (
    <Section title="Position" defaultCollapsed>
      <div className="flex flex-col gap-2.5">
        <TokenInput
          value={frame.position}
          options={POSITION_OPTIONS}
          onChange={(v) => updateFrame(frame.id, { position: v as Frame['position'] })}
          label="Position"
          initialValue="static"
        />

        {isPositioned && (
          <>
            <TokenInput
              scale={Z_INDEX_SCALE}
              value={frame.zIndex}
              onChange={(v) => updateFrame(frame.id, { zIndex: v })}
              min={0}
              label="Z-Index"
              classPrefix="z"
              defaultValue={0}
            />
            <div className="flex gap-2">
              <TokenInput
                scale={SPACING_SCALE}
                value={frame.inset.top}
                onChange={(v) => updateSpacing(frame.id, 'inset', { top: v })}
                min={0}
                label="Top"
                classPrefix="top"
              />
              <TokenInput
                scale={SPACING_SCALE}
                value={frame.inset.right}
                onChange={(v) => updateSpacing(frame.id, 'inset', { right: v })}
                min={0}
                label="Right"
                classPrefix="right"
              />
            </div>
            <div className="flex gap-2">
              <TokenInput
                scale={SPACING_SCALE}
                value={frame.inset.bottom}
                onChange={(v) => updateSpacing(frame.id, 'inset', { bottom: v })}
                min={0}
                label="Bottom"
                classPrefix="bottom"
              />
              <TokenInput
                scale={SPACING_SCALE}
                value={frame.inset.left}
                onChange={(v) => updateSpacing(frame.id, 'inset', { left: v })}
                min={0}
                label="Left"
                classPrefix="left"
              />
            </div>
          </>
        )}
      </div>
    </Section>
  )
}
