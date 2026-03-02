import { useMemo } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { useFrameStore } from '../../store/frameStore'

export function useComponentsData() {
  const userComponents = useCatalogStore((s) => s.components)
  const highlightId = useCatalogStore((s) => s.highlightId)
  const highlightIds = useCatalogStore((s) => s.highlightIds)
  const setHighlightId = useCatalogStore((s) => s.setHighlightId)
  const highlightMulti = useCatalogStore((s) => s.highlightMulti)
  const highlightRange = useCatalogStore((s) => s.highlightRange)
  const order = useCatalogStore((s) => s.order)
  const emptyCategories = useCatalogStore((s) => s.emptyCategories)
  const deleteComponent = useCatalogStore((s) => s.deleteComponent)
  const renameComponent = useCatalogStore((s) => s.renameComponent)
  const updateComponentTags = useCatalogStore((s) => s.updateComponentTags)
  const moveComponent = useCatalogStore((s) => s.moveComponent)
  const addEmptyCategory = useCatalogStore((s) => s.addEmptyCategory)
  const removeEmptyCategory = useCatalogStore((s) => s.removeEmptyCategory)
  const moveCategory = useCatalogStore((s) => s.moveCategory)

  const root = useFrameStore((s) => s.root)
  const selectedId = useFrameStore((s) => s.selectedId)
  const insertFrame = useFrameStore((s) => s.insertFrame)

  const components = useMemo(() => {
    return useCatalogStore.getState().allComponents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userComponents, order])

  return {
    components,
    root,
    selectedId,
    insertFrame,
    highlightId,
    highlightIds,
    setHighlightId,
    highlightMulti,
    highlightRange,
    emptyCategories,
    deleteComponent,
    renameComponent,
    updateComponentTags,
    moveComponent,
    addEmptyCategory,
    removeEmptyCategory,
    moveCategory,
  }
}
