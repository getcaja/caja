import { useMemo } from 'react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { TokenInput } from '../ui/TokenInput'
import { SIZE_CONSTRAINT_SCALE, filterSpacingScale } from '../../data/scales'

export function SizeSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const spacingGrid = useFrameStore((s) => s.spacingGrid)
  const filteredSize = useMemo(() => filterSpacingScale(SIZE_CONSTRAINT_SCALE, spacingGrid), [spacingGrid])

  return (
    <Section title="Size Constraints" defaultCollapsed>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <TokenInput
            scale={filteredSize}
            value={frame.minWidth}
            onChange={(v) => updateFrame(frame.id, { minWidth: v })}
            min={0}
            label="Min W"
            classPrefix="min-w"
          />
          <TokenInput
            scale={filteredSize}
            value={frame.maxWidth}
            onChange={(v) => updateFrame(frame.id, { maxWidth: v })}
            min={0}
            label="Max W"
            classPrefix="max-w"
          />
        </div>
        <div className="flex gap-2">
          <TokenInput
            scale={filteredSize}
            value={frame.minHeight}
            onChange={(v) => updateFrame(frame.id, { minHeight: v })}
            min={0}
            label="Min H"
            classPrefix="min-h"
          />
          <TokenInput
            scale={filteredSize}
            value={frame.maxHeight}
            onChange={(v) => updateFrame(frame.id, { maxHeight: v })}
            min={0}
            label="Max H"
            classPrefix="max-h"
          />
        </div>
      </div>
    </Section>
  )
}
