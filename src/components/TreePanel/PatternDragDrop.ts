import React from 'react'
import { useFrameStore } from '../../store/frameStore'
import type { Pattern } from '../../types/pattern'

export type DropPosition = 'before' | 'after' | 'inside'

export function getDropPos(e: React.DragEvent, el: HTMLElement, isCategory: boolean): DropPosition {
  const rect = el.getBoundingClientRect()
  const y = e.clientY - rect.top
  const third = rect.height / 3
  if (y < third) return 'before'
  if (y > third * 2 || !isCategory) return 'after'
  return 'inside'
}

export interface DragHandlers {
  handleDragStart: (e: React.DragEvent, id: string) => void
  handleDragOver: (e: React.DragEvent, id: string, isCategory: boolean) => void
  handleDragLeave: (id: string) => void
  handleDrop: (
    e: React.DragEvent,
    targetId: string,
    isCategory: boolean,
    context: {
      categorized: Map<string, Pattern[]>
      movePattern: (id: string, targetId: string, pos: 'before' | 'after') => void
      updatePatternTags: (id: string, tags: string[]) => void
    },
  ) => void
  handleRootDrop: (
    e: React.DragEvent,
    context: {
      uncategorized: Pattern[]
      movePattern: (id: string, targetId: string, pos: 'before' | 'after') => void
      updatePatternTags: (id: string, tags: string[]) => void
    },
  ) => void
  endDrag: () => void
}

export function createDragHandlers(
  readOnly: boolean,
  patterns: Pattern[],
  source: { type: string; libraryId?: string },
  dragId: string | null,
  overId: string | null,
  setDragId: (id: string | null) => void,
  setOverId: (id: string | null) => void,
  setOverPos: (pos: DropPosition | null) => void,
): DragHandlers {
  function endDrag() {
    setDragId(null)
    setOverId(null)
    setOverPos(null)
    const store = useFrameStore.getState()
    store.setPatternDragFrame(null)
    store.setCanvasDrag(null)
    store.setCanvasDragOver(null)
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = readOnly ? 'copy' : 'copyMove'
    e.dataTransfer.setData('text/plain', id)
    if (!readOnly) setDragId(id)

    const pattern = patterns.find((s) => s.id === id)
    if (pattern) {
      const origin = { libraryId: source.type === 'library' ? source.libraryId : 'internal', patternId: pattern.id }
      useFrameStore.getState().setPatternDragFrame(pattern.frame, origin)
    }
  }

  function handleDragOver(e: React.DragEvent, id: string, isCategory: boolean) {
    if (!dragId || dragId === id) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const pos = getDropPos(e, e.currentTarget as HTMLElement, isCategory)
    setOverId(id)
    setOverPos(pos)
  }

  function handleDragLeave(id: string) {
    if (overId === id) { setOverId(null); setOverPos(null) }
  }

  function handleDrop(
    e: React.DragEvent,
    targetId: string,
    isCategory: boolean,
    context: {
      categorized: Map<string, Pattern[]>
      movePattern: (id: string, targetId: string, pos: 'before' | 'after') => void
      updatePatternTags: (id: string, tags: string[]) => void
    },
  ) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragId || dragId === targetId) { endDrag(); return }

    const pos = getDropPos(e, e.currentTarget as HTMLElement, isCategory)
    const capturedDragId = dragId
    endDrag()

    if (isCategory && pos === 'inside') {
      const items = context.categorized.get(targetId)
      const lastInCategory = items && items.length > 0 ? items[items.length - 1].id : null
      if (lastInCategory) {
        context.movePattern(capturedDragId, lastInCategory, 'after')
      } else {
        context.updatePatternTags(capturedDragId, [targetId])
      }
    } else if (isCategory) {
      const items = context.categorized.get(targetId)
      if (pos === 'before' && items && items.length > 0) {
        context.movePattern(capturedDragId, items[0].id, 'before')
      } else if (pos === 'after' && items && items.length > 0) {
        context.movePattern(capturedDragId, items[items.length - 1].id, 'after')
      }
    } else {
      context.movePattern(capturedDragId, targetId, pos as 'before' | 'after')
    }
  }

  function handleRootDrop(
    e: React.DragEvent,
    context: {
      uncategorized: Pattern[]
      movePattern: (id: string, targetId: string, pos: 'before' | 'after') => void
      updatePatternTags: (id: string, tags: string[]) => void
    },
  ) {
    e.preventDefault()
    if (!dragId) return
    const capturedDragId = dragId
    endDrag()
    const last = context.uncategorized.length > 0 ? context.uncategorized[context.uncategorized.length - 1].id : null
    if (last && last !== capturedDragId) {
      context.movePattern(capturedDragId, last, 'after')
    } else {
      context.updatePatternTags(capturedDragId, [])
    }
  }

  return { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleRootDrop, endDrag }
}
