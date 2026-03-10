import { useMemo, useCallback } from 'react'
import { useFrameStore } from '../../store/frameStore'
import { findInTree } from '../../store/treeHelpers'
import { PagePanel } from './PagePanel'
import { ElementSection } from './ElementSection'
import { LayoutSection } from './LayoutSection'
import { TypographySection } from './TypographySection'
import { AppearanceSection } from './AppearanceSection'
import { FillSection } from './FillSection'
import { BorderSection } from './BorderSection'
import { EffectsSection } from './EffectsSection'
import { PositionSection } from './PositionSection'
import { TransformSection } from './TransformSection'
import { TransitionSection } from './TransitionSection'
import { AdvancedSection } from './AdvancedSection'
import {
  typographyResetValues, layoutResetValues, fillResetValues, appearanceResetValues,
  borderResetValues, effectsResetValues, positionResetValues, transformResetValues, transitionResetValues,
} from './sectionReset'

const SECTION_KEYS: Record<string, string[]> = {
  Layout: ['display', 'direction', 'justify', 'align', 'gap', 'wrap', 'gridCols', 'gridRows', 'padding', 'margin', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'grow', 'shrink', 'alignSelf', 'hidden'],
  Typography: ['fontSize', 'fontWeight', 'lineHeight', 'textAlign'],
  Fill: ['bg'],
  Appearance: ['opacity'],
}

function sectionHasOverrides(section: string, overrideKeys: Set<string>): boolean {
  const keys = SECTION_KEYS[section]
  if (!keys) return false
  return keys.some((k) => overrideKeys.has(k))
}

export function Properties() {
  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const selected = useMemo(() => selectedId ? findInTree(root, selectedId) : null, [root, selectedId])
  const multiCount = useFrameStore((s) => s.selectedIds.size)
  const rootId = useFrameStore((s) => s.getRootId())
  const pageSelected = useFrameStore((s) => s.pageSelected)
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const getEffectiveFrame = useFrameStore((s) => s.getEffectiveFrame)
  const removeResponsiveKeys = useFrameStore((s) => s.removeResponsiveKeys)
  const updateFrame = useFrameStore((s) => s.updateFrame)

  // Store auto-selects root when selection clears; keep UI fallback as safety net
  const frame = selected ?? root

  // Compute which keys have responsive overrides at the current breakpoint
  const overrideKeys = useMemo(() => {
    if (activeBreakpoint === 'base') return new Set<string>()
    const overrides = frame.responsive?.[activeBreakpoint]
    if (!overrides) return new Set<string>()
    return new Set(Object.keys(overrides))
  }, [frame, activeBreakpoint])

  const makeResetHandler = useCallback((section: string) => {
    if (activeBreakpoint === 'base') return undefined
    const keys = SECTION_KEYS[section]
    if (!keys || !sectionHasOverrides(section, overrideKeys)) return undefined
    return () => removeResponsiveKeys(frame.id, activeBreakpoint as 'md' | 'sm', keys)
  }, [frame, activeBreakpoint, overrideKeys, removeResponsiveKeys])

  // Section reset: single updateFrame call → one Cmd+Z
  const resetSection = useCallback((values: Partial<typeof frame>) => {
    updateFrame(frame.id, values)
  }, [frame.id, updateFrame])

  if (multiCount > 1) return null
  if (pageSelected && !selected) return <PagePanel />

  // Merge responsive overrides for the active breakpoint
  const effective = activeBreakpoint !== 'base' ? getEffectiveFrame(frame) : frame

  const isRoot = frame.id === rootId
  const hasTextStyles = effective.type !== 'box' && 'fontSize' in effective

  return (
    <div key={frame.id} className="">
      <ElementSection frame={effective} isRoot={isRoot} />
      <PositionSection frame={effective}
       
        onReset={() => resetSection(positionResetValues())}
      />
      <LayoutSection frame={effective} isRoot={isRoot}
        hasOverrides={sectionHasOverrides('Layout', overrideKeys)} onResetOverrides={makeResetHandler('Layout')}
       
        onReset={() => resetSection(layoutResetValues(effective))}
      />
      {hasTextStyles && <TypographySection frame={effective}
        hasOverrides={sectionHasOverrides('Typography', overrideKeys)} onResetOverrides={makeResetHandler('Typography')}
       
        onReset={() => resetSection(typographyResetValues())}
      />}
      <AppearanceSection frame={effective}
        hasOverrides={sectionHasOverrides('Appearance', overrideKeys)} onResetOverrides={makeResetHandler('Appearance')}
       
        onReset={() => resetSection(appearanceResetValues())}
      />
      <FillSection frame={effective}
        hasOverrides={sectionHasOverrides('Fill', overrideKeys)} onResetOverrides={makeResetHandler('Fill')}
       
        onReset={() => resetSection(fillResetValues())}
      />
      <BorderSection frame={effective}
       
        onReset={() => resetSection(borderResetValues())}
      />
      <EffectsSection frame={effective}
       
        onReset={() => resetSection(effectsResetValues())}
      />
      <TransformSection frame={effective}
       
        onReset={() => resetSection(transformResetValues())}
      />
      <TransitionSection frame={effective}
       
        onReset={() => resetSection(transitionResetValues())}
      />
      <AdvancedSection frame={effective} />
    </div>
  )
}
