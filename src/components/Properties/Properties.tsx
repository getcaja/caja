import { useFrameStore } from '../../store/frameStore'
import { PagePanel } from './PagePanel'
import { ElementSection } from './ElementSection'
import { LayoutSection } from './LayoutSection'
import { TypographySection } from './TypographySection'
import { FillSection } from './FillSection'
import { BorderSection } from './BorderSection'
import { EffectsSection } from './EffectsSection'
import { PositionSection } from './PositionSection'
import { TransformSection } from './TransformSection'
import { TransitionSection } from './TransitionSection'
import { AdvancedSection } from './AdvancedSection'

export function Properties() {
  const selected = useFrameStore((s) => s.getSelected())
  const rootId = useFrameStore((s) => s.getRootId())
  const advancedMode = useFrameStore((s) => s.advancedMode)

  if (!selected) {
    return <PagePanel />
  }

  const isRoot = selected.id === rootId
  const hasTextStyles = 'fontSize' in selected

  return (
    <div key={selected.id} className="h-full overflow-y-auto">
      <ElementSection frame={selected} isRoot={isRoot} />
      <PositionSection frame={selected} />
      <LayoutSection frame={selected} isRoot={isRoot} />
      {hasTextStyles && <TypographySection frame={selected} />}
      <FillSection frame={selected} />
      <BorderSection frame={selected} />
      {advancedMode && <EffectsSection frame={selected} />}
      {advancedMode && <TransformSection frame={selected} />}
      {advancedMode && <TransitionSection frame={selected} />}
      <AdvancedSection frame={selected} />
    </div>
  )
}
