import { Trash2 } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { NameHeader } from './NameHeader'
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
  const selectedIds = useFrameStore((s) => s.selectedIds)
  const removeSelected = useFrameStore((s) => s.removeSelected)

  if (selectedIds.size > 1) {
    return (
      <div className="h-full bg-surface-1 p-4 flex flex-col items-center justify-center gap-3">
        <span className="text-text-secondary text-[12px]">{selectedIds.size} elements selected</span>
        <button
          onClick={removeSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
        >
          <Trash2 size={12} /> Delete all
        </button>
      </div>
    )
  }

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
      {selected.type === 'box' && <LayoutSection frame={selected} isRoot={isRoot} />}
      {selected.type === 'text' && <ContentSection frame={selected} />}
      {selected.type === 'image' && <ImageSection frame={selected} />}
      {selected.type === 'button' && <ButtonSection frame={selected} />}
      {selected.type === 'input' && <InputSection frame={selected} />}
      {selected.type === 'textarea' && <TextareaSection frame={selected} />}
      {selected.type === 'select' && <SelectSection frame={selected} />}
      <SizeSection frame={selected} />
      <SpacingSection frame={selected} />
      {selected.type !== 'box' && selected.type !== 'image' && <TypographySection frame={selected} />}
      <FillSection frame={selected} />
      <BorderSection frame={selected} />
      <EffectsSection frame={selected} />
      <PositionSection frame={selected} />
      <TransformSection frame={selected} />
      <TransitionSection frame={selected} />
      <AdvancedSection frame={selected} />
    </div>
  )
}
