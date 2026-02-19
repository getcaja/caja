import { createContext, useContext, useState, useCallback } from 'react'

export type DropPosition = 'before' | 'after' | 'inside'

interface DragState {
  dragId: string | null
  overId: string | null
  overPosition: DropPosition | null
}

interface TreeDndContextValue extends DragState {
  startDrag: (id: string) => void
  setOver: (id: string | null, position: DropPosition | null) => void
  endDrag: () => void
}

const TreeDndCtx = createContext<TreeDndContextValue>({
  dragId: null,
  overId: null,
  overPosition: null,
  startDrag: () => {},
  setOver: () => {},
  endDrag: () => {},
})

export function useTreeDnd() {
  return useContext(TreeDndCtx)
}

export function TreeDndProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DragState>({
    dragId: null,
    overId: null,
    overPosition: null,
  })

  const startDrag = useCallback((id: string) => {
    setState({ dragId: id, overId: null, overPosition: null })
  }, [])

  const setOver = useCallback((id: string | null, position: DropPosition | null) => {
    setState((prev) => ({ ...prev, overId: id, overPosition: position }))
  }, [])

  const endDrag = useCallback(() => {
    setState({ dragId: null, overId: null, overPosition: null })
  }, [])

  return (
    <TreeDndCtx.Provider value={{ ...state, startDrag, setOver, endDrag }}>
      {children}
    </TreeDndCtx.Provider>
  )
}
