import { useFrameStore } from '../../store/frameStore'
import { NameHeader } from './NameHeader'
import { LayoutSection } from './LayoutSection'
import { ContentSection } from './ContentSection'
import { TypographySection } from './TypographySection'
import { ImageSection } from './ImageSection'
import { ButtonSection } from './ButtonSection'
import { InputSection } from './InputSection'
import { TextareaSection } from './TextareaSection'
import { SelectSection } from './SelectSection'
import { SizeSection } from './SizeSection'
import { SpacingSection } from './SpacingSection'
import { StyleSection } from './StyleSection'
import { AdvancedSection } from './AdvancedSection'

export function Properties() {
  const selected = useFrameStore((s) => s.getSelected())
  const rootId = useFrameStore((s) => s.getRootId())

  if (!selected) {
    return (
      <div className="h-full bg-surface-1 p-4 flex items-center justify-center">
        <span className="text-text-muted text-[12px]">Select an element</span>
      </div>
    )
  }

  const isRoot = selected.id === rootId

  return (
    <div key={selected.id} className="h-full bg-surface-1 p-3 overflow-y-auto">
      <NameHeader frame={selected} isRoot={isRoot} />
      {selected.type === 'box' && <LayoutSection frame={selected} />}
      {selected.type === 'text' && <ContentSection frame={selected} />}
      {selected.type === 'text' && <TypographySection frame={selected} />}
      {selected.type === 'image' && <ImageSection frame={selected} />}
      {selected.type === 'button' && <ButtonSection frame={selected} />}
      {selected.type === 'input' && <InputSection frame={selected} />}
      {selected.type === 'textarea' && <TextareaSection frame={selected} />}
      {selected.type === 'select' && <SelectSection frame={selected} />}
      <StyleSection frame={selected} />
      <SizeSection frame={selected} />
      <SpacingSection frame={selected} />
      <AdvancedSection frame={selected} />
    </div>
  )
}
