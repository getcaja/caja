import { useMemo } from 'react'

export interface TreeMergeState {
  mergeTop: Set<string>
  mergeBottom: Set<string>
}

const EMPTY: TreeMergeState = { mergeTop: new Set(), mergeBottom: new Set() }

/**
 * Computes which selected tree rows are visually adjacent so their
 * backgrounds can merge into a continuous block (like Figma).
 *
 * mergeTop  = previous visible row is also selected → no top radius
 * mergeBottom = next visible row is also selected → no bottom radius
 */
export function useTreeMerge(selectedIds: Set<string>, visibleOrder: string[]): TreeMergeState {
  return useMemo(() => {
    if (selectedIds.size <= 1) return EMPTY
    const mergeTop = new Set<string>()
    const mergeBottom = new Set<string>()
    for (let i = 0; i < visibleOrder.length; i++) {
      if (!selectedIds.has(visibleOrder[i])) continue
      if (i > 0 && selectedIds.has(visibleOrder[i - 1])) mergeTop.add(visibleOrder[i])
      if (i < visibleOrder.length - 1 && selectedIds.has(visibleOrder[i + 1])) mergeBottom.add(visibleOrder[i])
    }
    return { mergeTop, mergeBottom }
  }, [selectedIds, visibleOrder])
}

/**
 * Compute the border-radius class for a row in a merged multi-selection group.
 */
export function selectionRadiusClass(
  isSelected: boolean,
  isMulti: boolean,
  mt: boolean,
  mb: boolean,
): string {
  if (!isSelected || !isMulti) return 'rounded-md'
  if (mt && mb) return ''
  if (mt) return 'rounded-b-md'
  if (mb) return 'rounded-t-md'
  return 'rounded-md'
}
