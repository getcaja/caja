import { create } from 'zustand'

interface HoverState {
  hoveredId: string | null
  isTreeHover: boolean
  hover: (id: string | null, source?: 'tree') => void
  clearHover: () => void
}

export const useHoverStore = create<HoverState>((set) => ({
  hoveredId: null,
  isTreeHover: false,
  hover: (id, source) => set({ hoveredId: id, isTreeHover: source === 'tree' }),
  clearHover: () => set({ hoveredId: null, isTreeHover: false }),
}))
