import { useMemo } from 'react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'
import { SpacingControl } from '../ui/SpacingControl'
import { SPACING_SCALE, MARGIN_SCALE, filterSpacingScale } from '../../data/scales'

export function SpacingSection({ frame }: { frame: Frame }) {
  const updateSpacing = useFrameStore((s) => s.updateSpacing)
  const spacingGrid = useFrameStore((s) => s.spacingGrid)
  const filteredSpacing = useMemo(() => filterSpacingScale(SPACING_SCALE, spacingGrid), [spacingGrid])
  const filteredMargin = useMemo(() => filterSpacingScale(MARGIN_SCALE, spacingGrid), [spacingGrid])
  const setShowMarginOverlay = useFrameStore((s) => s.setShowMarginOverlay)

  return (
    <Section title="Spacing">
      <div className="flex flex-col gap-2">
        <SpacingControl
          value={frame.padding}
          onChange={(v) => updateSpacing(frame.id, 'padding', v)}
          label="Padding"
          classPrefix="p"
          scale={filteredSpacing}
        />
        <div
          onMouseEnter={() => setShowMarginOverlay(true)}
          onMouseLeave={() => setShowMarginOverlay(false)}
        >
          <SpacingControl
            value={frame.margin}
            onChange={(v) => updateSpacing(frame.id, 'margin', v)}
            label="Margin"
            classPrefix="m"
            scale={filteredMargin}
          />
        </div>
      </div>
    </Section>
  )
}
