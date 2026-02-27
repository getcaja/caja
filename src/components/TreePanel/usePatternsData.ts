import { useMemo } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useFrameStore } from '../../store/frameStore'
import type { PatternSource } from './PatternsPanel'

export function usePatternsData(source: PatternSource) {
  const userPatterns = useCatalogStore((s) => s.patterns)
  const highlightId = useCatalogStore((s) => s.highlightId)
  const setHighlightId = useCatalogStore((s) => s.setHighlightId)
  const order = useCatalogStore((s) => s.order)
  const emptyCategories = useCatalogStore((s) => s.emptyCategories)
  const deletePattern = useCatalogStore((s) => s.deletePattern)
  const renamePattern = useCatalogStore((s) => s.renamePattern)
  const updatePatternTags = useCatalogStore((s) => s.updatePatternTags)
  const movePattern = useCatalogStore((s) => s.movePattern)
  const addEmptyCategory = useCatalogStore((s) => s.addEmptyCategory)
  const removeEmptyCategory = useCatalogStore((s) => s.removeEmptyCategory)
  const moveCategory = useCatalogStore((s) => s.moveCategory)
  const libraries = useCatalogStore((s) => s.libraries)
  const libraryIndex = useCatalogStore((s) => s.libraryIndex)

  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const insertFrame = useFrameStore((s) => s.insertFrame)

  const readOnly = source.type === 'library'

  const patterns = useMemo(() => {
    if (source.type === 'library') {
      return useCatalogStore.getState().getLibraryPatterns(source.libraryId)
    }
    return useCatalogStore.getState().allPatterns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.type, source.type === 'library' ? source.libraryId : null, userPatterns, order, libraries])

  const sourceName = useMemo(() => {
    if (source.type === 'internal') return 'Internal Patterns'
    const lib = libraryIndex.find((l) => l.id === source.libraryId)
    return lib?.name || 'Library'
  }, [source, libraryIndex])

  return {
    patterns,
    readOnly,
    sourceName,
    root,
    selectedId,
    insertFrame,
    highlightId,
    setHighlightId,
    emptyCategories,
    deletePattern,
    renamePattern,
    updatePatternTags,
    movePattern,
    addEmptyCategory,
    removeEmptyCategory,
    moveCategory,
  }
}
