import { useFrameStore } from '../../store/frameStore'
import { PagePanel } from './PagePanel'
import { NameHeader } from './NameHeader'
import { AttributesSection } from './AttributesSection'
import { LayoutSection } from './LayoutSection'
import { ContentSection } from './ContentSection'
import { ImageSection } from './ImageSection'
import { ButtonSection } from './ButtonSection'
import { InputSection } from './InputSection'
import { TextareaSection } from './TextareaSection'
import { SelectSection } from './SelectSection'
import { SizeSection } from './SizeSection'
import { SpacingSection } from './SpacingSection'
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
    <div key={selected.id} className="h-full bg-surface-1 p-3 overflow-y-auto">
      <NameHeader frame={selected} isRoot={isRoot} />
      {advancedMode && !isRoot && <AttributesSection frame={selected} />}
      {selected.type === 'text' && <ContentSection frame={selected} />}
      {selected.type === 'image' && <ImageSection frame={selected} />}
      {selected.type === 'button' && <ButtonSection frame={selected} />}
      {selected.type === 'input' && <InputSection frame={selected} />}
      {selected.type === 'textarea' && <TextareaSection frame={selected} />}
      {selected.type === 'select' && <SelectSection frame={selected} />}
      {advancedMode && <PositionSection frame={selected} />}
      <LayoutSection frame={selected} isRoot={isRoot} />
      <SizeSection frame={selected} />
      <SpacingSection frame={selected} />
      {hasTextStyles && <TypographySection frame={selected} />}
      <FillSection frame={selected} />
      <BorderSection frame={selected} />
      {advancedMode && <EffectsSection frame={selected} />}
      {advancedMode && <TransformSection frame={selected} />}
      {advancedMode && <TransitionSection frame={selected} />}
      {advancedMode && <AdvancedSection frame={selected} />}
    </div>
  )
}
