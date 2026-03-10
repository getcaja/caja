import type { StateCreator } from 'zustand'
import type { Frame, DesignValue, Spacing, Breakpoint } from '../../types/frame'
import type { SpacingGrid } from '../../data/scales'
import type { FrameStore } from '../frameStore'
import { findParent } from '../treeHelpers'

// --- View prefs persistence ---

const VIEW_PREFS_KEY = 'caja-view-prefs'

interface ViewPrefs {
  previewMode: boolean
  canvasWidth: number | null
  activeBreakpoint: Breakpoint
  collapsedIds: string[]
  spacingGrid: SpacingGrid
  styleNewFrames: boolean
  showHints: boolean
}

export function loadViewPrefs(): ViewPrefs {
  try {
    const raw = localStorage.getItem(VIEW_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        previewMode: parsed.previewMode ?? false,
        canvasWidth: parsed.canvasWidth ?? null,
        activeBreakpoint: (['base', 'md', 'sm'].includes(parsed.activeBreakpoint) ? parsed.activeBreakpoint : 'base') as Breakpoint,
        collapsedIds: parsed.collapsedIds ?? [],
        spacingGrid: (['off', '4px', '8px'].includes(parsed.spacingGrid) ? parsed.spacingGrid : '4px') as SpacingGrid,
        styleNewFrames: parsed.styleNewFrames ?? true,
        showHints: parsed.showHints ?? true,
      }
    }
  } catch (err) { console.warn('Failed to load view preferences:', err) }
  return { previewMode: false, canvasWidth: null, activeBreakpoint: 'base' as Breakpoint, collapsedIds: [], spacingGrid: '4px' as SpacingGrid, styleNewFrames: true, showHints: true }
}

export function saveViewPrefs(prefs: Partial<ViewPrefs>) {
  try {
    const current = loadViewPrefs()
    localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify({ ...current, ...prefs }))
  } catch (err) {
    console.warn('Failed to save view preferences:', err)
  }
}

// --- Responsive helpers ---

function ensureSpacingSides(s: unknown): Spacing | undefined {
  if (!s || typeof s !== 'object') return undefined
  const r = s as Record<string, unknown>
  const zero: DesignValue<number> = { mode: 'custom', value: 0 }
  const valid = (v: unknown): v is DesignValue<number> => !!v && typeof v === 'object' && 'mode' in (v as Record<string, unknown>)
  return {
    top: valid(r.top) ? r.top : zero,
    right: valid(r.right) ? r.right : zero,
    bottom: valid(r.bottom) ? r.bottom : zero,
    left: valid(r.left) ? r.left : zero,
  }
}

export function mergeResponsiveOverrides(frame: Frame, bp: 'md' | 'sm'): Frame {
  const resp = frame.responsive
  if (!resp) return frame
  let result = frame as Frame
  // Desktop-first cascade: md always applies at sm too
  if (bp === 'sm' || bp === 'md') {
    const md = resp.md
    if (md && Object.keys(md).length > 0) {
      result = { ...result, ...md } as Frame
    }
  }
  if (bp === 'sm') {
    const sm = resp.sm
    if (sm && Object.keys(sm).length > 0) {
      result = { ...result, ...sm } as Frame
    }
  }
  // Ensure spacing fields are complete after merge (responsive overrides can be partial)
  if (result.padding) result = { ...result, padding: ensureSpacingSides(result.padding)! }
  if (result.margin) result = { ...result, margin: ensureSpacingSides(result.margin)! }
  return result
}

// --- Slice ---

export interface UiSlice {
  collapsedIds: Set<string>
  previewMode: boolean
  canvasWidth: number | null
  activeBreakpoint: Breakpoint
  spacingGrid: SpacingGrid
  styleNewFrames: boolean
  canvasZoom: number
  canvasTool: 'pointer' | 'frame' | 'text' | 'image'
  pendingTextEdit: string | null
  pendingImageSrc: string | null
  treePanelTab: 'layers' | 'components'
  _layersPageId: string | null
  showMarginOverlay: boolean
  showPaddingOverlay: boolean
  showGapOverlay: boolean
  showHints: boolean
  deepSelect: boolean
  canvasResizing: boolean
  propertyHint: string | null

  setPropertyHint: (hint: string | null) => void
  setCanvasResizing: (value: boolean) => void
  setDeepSelect: (value: boolean) => void
  setShowHints: (value: boolean) => void
  setShowMarginOverlay: (value: boolean) => void
  setShowPaddingOverlay: (value: boolean) => void
  setShowGapOverlay: (value: boolean) => void
  setSpacingGrid: (mode: SpacingGrid) => void
  setStyleNewFrames: (value: boolean) => void
  toggleCollapse: (id: string) => void
  collapseAll: () => void
  expandAll: () => void
  expandToFrame: (id: string) => void
  togglePreviewMode: () => void
  setPreviewMode: (value: boolean) => void
  setCanvasWidth: (width: number | null) => void
  setActiveBreakpoint: (bp: Breakpoint) => void
  getEffectiveFrame: (frame: Frame) => Frame
  setCanvasZoom: (zoom: number) => void
  setCanvasTool: (tool: 'pointer' | 'frame' | 'text' | 'image') => void
  clearPendingTextEdit: () => void
  setPendingImageSrc: (src: string | null) => void
  setTreePanelTab: (tab: 'layers' | 'components') => void
}

export const createUiSlice: StateCreator<FrameStore, [], [], UiSlice> = (set, get) => {
  const initialViewPrefs = loadViewPrefs()

  return {
    collapsedIds: new Set(initialViewPrefs.collapsedIds),
    previewMode: initialViewPrefs.previewMode,
    canvasWidth: initialViewPrefs.canvasWidth,
    activeBreakpoint: initialViewPrefs.activeBreakpoint,
    spacingGrid: initialViewPrefs.spacingGrid,
    styleNewFrames: initialViewPrefs.styleNewFrames,
    canvasZoom: 1,
    canvasTool: 'pointer',
    pendingTextEdit: null,
    pendingImageSrc: null,
    treePanelTab: 'layers' as const,
    _layersPageId: null as string | null,
    showMarginOverlay: false,
    showPaddingOverlay: false,
    showGapOverlay: false,
    showHints: initialViewPrefs.showHints,
    deepSelect: false,
    canvasResizing: false,
    propertyHint: null,

    setPropertyHint: (hint) => set({ propertyHint: hint }),
    setCanvasResizing: (value) => set({ canvasResizing: value }),
    setDeepSelect: (value) => set({ deepSelect: value }),
    setShowHints: (value) => {
      saveViewPrefs({ showHints: value })
      set({ showHints: value })
    },
    setShowMarginOverlay: (value) => set({ showMarginOverlay: value }),
    setShowPaddingOverlay: (value) => set({ showPaddingOverlay: value }),
    setShowGapOverlay: (value) => set({ showGapOverlay: value }),
    setSpacingGrid: (mode) => {
      saveViewPrefs({ spacingGrid: mode })
      set({ spacingGrid: mode })
    },

    setStyleNewFrames: (value) => {
      saveViewPrefs({ styleNewFrames: value })
      set({ styleNewFrames: value })
    },

    toggleCollapse: (id) =>
      set((state) => {
        const next = new Set(state.collapsedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        saveViewPrefs({ collapsedIds: [...next] })
        return { collapsedIds: next }
      }),

    collapseAll: () => set((state) => {
      const ids: string[] = []
      function walk(frame: Frame) {
        if (frame.type === 'box' && frame.children.length > 0) {
          ids.push(frame.id)
          for (const child of frame.children) walk(child)
        }
      }
      walk(state.root)
      saveViewPrefs({ collapsedIds: ids })
      return { collapsedIds: new Set(ids) }
    }),

    expandAll: () => {
      saveViewPrefs({ collapsedIds: [] })
      set({ collapsedIds: new Set() })
    },

    expandToFrame: (id) => set((state) => {
      const ancestors: string[] = []
      let current = findParent(state.root, id)
      while (current) {
        ancestors.push(current.id)
        current = findParent(state.root, current.id)
      }
      if (ancestors.length === 0) return {}
      const next = new Set(state.collapsedIds)
      let changed = false
      for (const aid of ancestors) {
        if (next.has(aid)) {
          next.delete(aid)
          changed = true
        }
      }
      return changed ? { collapsedIds: next } : {}
    }),

    togglePreviewMode: () => set((s) => {
      const next = !s.previewMode
      saveViewPrefs({ previewMode: next, canvasWidth: s.canvasWidth })
      return { previewMode: next, canvasTool: 'pointer' as const, ...(next ? { selectedId: null, hoveredId: null } : {}) }
    }),
    setPreviewMode: (value) => set((s) => {
      saveViewPrefs({ previewMode: value, canvasWidth: s.canvasWidth })
      return { previewMode: value, canvasTool: 'pointer' as const, ...(value ? { selectedId: null, hoveredId: null } : {}) }
    }),
    setCanvasWidth: (width) => set((s) => {
      saveViewPrefs({ previewMode: s.previewMode, canvasWidth: width })
      return { canvasWidth: width }
    }),
    setActiveBreakpoint: (bp) => {
      saveViewPrefs({ activeBreakpoint: bp })
      set({ activeBreakpoint: bp })
    },
    getEffectiveFrame: (frame) => {
      const bp = get().activeBreakpoint
      if (bp === 'base') return frame
      return mergeResponsiveOverrides(frame, bp)
    },
    setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
    setCanvasTool: (tool) => set({ canvasTool: tool }),
    clearPendingTextEdit: () => set({ pendingTextEdit: null }),
    setPendingImageSrc: (src) => set({ pendingImageSrc: src }),
    setTreePanelTab: (tab) => {
      const state = get()
      const prevTab = state.treePanelTab

      // If in edit mode and switching away from Components, exit edit mode first
      if (state.editingComponentId && tab !== 'components') {
        const restore = state._beforeEditState
        const restorePage = restore ? state.pages.find((p) => p.id === restore.pageId) : null
        if (restorePage) {
          set({
            editingComponentId: null,
            _beforeEditState: null,
            treePanelTab: tab,
            _layersPageId: null,
            activePageId: restorePage.id,
            root: restorePage.root,
          })
          return
        }
      }

      if (tab === 'components' && prevTab !== 'components') {
        // Switching TO Components tab — keep canvas selection intact
        set({
          treePanelTab: tab,
          _layersPageId: state.activePageId,
        })
        return
      }

      if (prevTab === 'components' && tab !== 'components') {
        // Switching FROM Components — restore page, keep selection intact
        const restoreId = state._layersPageId
        const restorePage = restoreId ? state.pages.find((p) => p.id === restoreId) : null
        if (restorePage) {
          set({
            treePanelTab: tab,
            _layersPageId: null,
            activePageId: restorePage.id,
            root: restorePage.root,
          })
          return
        }
      }

      set({ treePanelTab: tab })
    },
  }
}
