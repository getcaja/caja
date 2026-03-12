import { create } from 'zustand'

interface HoverState {
  hoveredId: string | null
  isTreeHover: boolean
  hover: (id: string | null, source?: 'tree') => void
  clearHover: () => void
}

// rAF-throttled hover: at most 1 update per animation frame.
// Rapid mouse movement across tree rows fires dozens of events
// but only ~2-3 actual hover updates get processed per 16ms frame.
let _rafId: number | null = null

export const useHoverStore = create<HoverState>((set) => ({
  hoveredId: null,
  isTreeHover: false,
  hover: (id, source) => {
    if (_rafId) cancelAnimationFrame(_rafId)
    _rafId = requestAnimationFrame(() => {
      _rafId = null
      set({ hoveredId: id, isTreeHover: source === 'tree' })
    })
  },
  clearHover: () => {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null }
    set({ hoveredId: null, isTreeHover: false })
  },
}))
