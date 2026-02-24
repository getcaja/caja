import { useEffect, useState, useCallback, useRef } from 'react'
import { useFrameStore, isRootId } from './store/frameStore'
import { TreePanel } from './components/TreePanel/TreePanel'
import { Canvas } from './components/Canvas/Canvas'
import { RightPanel } from './components/RightPanel/RightPanel'
import { ExportModal } from './components/Export/ExportModal'
import { TooltipProvider } from './components/ui/Tooltip'
import { saveFile, saveFileAs, openFile } from './lib/fileOps'
import { saveLibrary } from './lib/libraryOps'
import { useCatalogStore, loadPatternsFromStorage } from './store/catalogStore'
import { ExportLibraryModal } from './components/TreePanel/ExportLibraryModal'

import { startMcpBridge, stopMcpBridge } from './mcp/bridge'
import { TitleBar } from './components/TitleBar/TitleBar'
import { ZOOM_LEVELS } from './components/Canvas/ZoomBar'

const LEFT_MIN = 150
const LEFT_MAX = 400
const LEFT_DEFAULT = 224
const RIGHT_MIN = 180
const RIGHT_MAX = 400
const RIGHT_DEFAULT = 240

const STORAGE_KEY = 'caja-panel-state'

function loadPanelState(): { leftWidth: number; rightWidth: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        leftWidth: Math.min(LEFT_MAX, Math.max(LEFT_MIN, parsed.leftWidth ?? LEFT_DEFAULT)),
        rightWidth: Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, parsed.rightWidth ?? RIGHT_DEFAULT)),
      }
    }
  } catch { /* ignore */ }
  return { leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT }
}

function savePanelState(state: { leftWidth: number; rightWidth: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const isTauri = '__TAURI_INTERNALS__' in window

function App() {
  const [showExport, setShowExport] = useState(false)
  const [showExportLibrary, setShowExportLibrary] = useState(false)
  const initial = useRef(loadPanelState())
  const [leftWidth, setLeftWidth] = useState(initial.current.leftWidth)
  const [rightWidth, setRightWidth] = useState(initial.current.rightWidth)

  // Persist panel state on change
  useEffect(() => {
    savePanelState({ leftWidth, rightWidth })
  }, [leftWidth, rightWidth])
  const dragging = useRef<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const startWidth = useRef(0)
  const loadFromStorage = useFrameStore((s) => s.loadFromStorage)
  const undo = useFrameStore((s) => s.undo)
  const redo = useFrameStore((s) => s.redo)
  const removeFrame = useFrameStore((s) => s.removeFrame)
  const removeSelected = useFrameStore((s) => s.removeSelected)
  const reorderFrame = useFrameStore((s) => s.reorderFrame)
  const selectedId = useFrameStore((s) => s.selectedId)
  const filePath = useFrameStore((s) => s.filePath)
  const dirty = useFrameStore((s) => s.dirty)
  const previewMode = useFrameStore((s) => s.previewMode)
  const iframeWindow = useFrameStore((s) => s.iframeWindow)
  const activePageId = useFrameStore((s) => s.activePageId)
  const pages = useFrameStore((s) => s.pages)

  // Update window title with file name + active page
  useEffect(() => {
    if (!isTauri) return
    const fileName = filePath ? filePath.split('/').pop() : 'Untitled'
    const activePage = pages.find((p) => p.id === activePageId)
    const pageName = activePage?.name || ''
    const pageLabel = pages.length > 1 && pageName ? ` — ${pageName}` : ''
    const title = dirty ? `${fileName}${pageLabel} — Edited · Caja` : `${fileName}${pageLabel} · Caja`
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('set_window_title', { title })
    }).catch(() => {})
  }, [filePath, dirty, activePageId, pages])

  const handleSave = useCallback(async () => {
    if (!isTauri) return
    const store = useFrameStore.getState()
    const snippets = useCatalogStore.getState().getPatternData()
    const path = await saveFile(store.pages, store.activePageId, snippets, store.filePath)
    if (path) {
      store.setFilePath(path)
      store.markClean()
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    if (!isTauri) return
    const store = useFrameStore.getState()
    const snippets = useCatalogStore.getState().getPatternData()
    const path = await saveFileAs(store.pages, store.activePageId, snippets)
    if (path) {
      store.setFilePath(path)
      store.markClean()
    }
  }, [])

  const handleOpen = useCallback(async () => {
    if (!isTauri) return
    const result = await openFile()
    if (result) {
      const { migrateToInternalRoot } = await import('./store/frameStore')
      const data = result.data
      if (data.pages && Array.isArray(data.pages)) {
        // New multi-page format
        const pages = (data.pages as Array<Record<string, unknown>>).map((p) => ({
          id: p.id as string,
          name: p.name as string,
          route: p.route as string,
          root: migrateToInternalRoot(p.root as Record<string, unknown>, p.id as string),
        }))
        const activePageId = (data.activePageId as string) || pages[0].id
        useFrameStore.getState().loadFromFileMulti(pages, activePageId, result.path)
      } else if (data.root) {
        // Legacy single-root format
        const root = migrateToInternalRoot(data.root as Record<string, unknown>, 'page-1')
        useFrameStore.getState().loadFromFile(root, result.path)
      }
      useCatalogStore.getState().loadPatterns((data.patterns ?? data.snippets) as import('./store/catalogStore').PatternData | undefined)
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
    loadPatternsFromStorage()
    startMcpBridge()

    // Load installed libraries (Tauri only)
    if (isTauri) {
      import('./components/TreePanel/ManageLibrariesModal').then(({ initializeLibraries }) => {
        initializeLibraries().catch(() => {})
      }).catch(() => {})
    }

    // Sync initial view prefs to native menu check states
    if (isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        const { showSpacingOverlays, showOverlayValues, advancedMode } = useFrameStore.getState()
        invoke('set_menu_check', { id: 'toggle-spacing-overlays', checked: showSpacingOverlays }).catch(() => {})
        invoke('set_menu_check', { id: 'toggle-overlay-values', checked: showOverlayValues }).catch(() => {})
        invoke('set_menu_check', { id: 'toggle-advanced-mode', checked: advancedMode }).catch(() => {})
      }).catch(() => {})
    }

    return () => stopMcpBridge()
  }, [loadFromStorage])

  // Listen for native menu events (Tauri)
  useEffect(() => {
    if (!isTauri) return
    let active = true
    const unlisteners: (() => void)[] = []
    import('@tauri-apps/api/event').then(({ listen }) => {
      if (!active) return

      // Regular menu events
      listen<string>('menu-event', (e) => {
        switch (e.payload) {
          case 'new':
            localStorage.removeItem('caja-state')
            localStorage.removeItem('caja-snippets-state')
            location.reload()
            break
          case 'open':
            handleOpen()
            break
          case 'save':
            handleSave()
            break
          case 'save-as':
            handleSaveAs()
            break
          case 'export':
            setShowExport(true)
            break
          case 'save-library': {
            const lastExport = useCatalogStore.getState().lastExport
            if (lastExport) {
              const data = useCatalogStore.getState().getPatternData()
              saveLibrary(data, {
                name: lastExport.name,
                author: lastExport.author || undefined,
                description: lastExport.description || undefined,
                version: lastExport.version || undefined,
              }, lastExport.path).catch((err) => console.error('Failed to save library:', err))
            } else {
              setShowExportLibrary(true)
            }
            break
          }
          case 'export-library':
            setShowExportLibrary(true)
            break
        }
      }).then((fn) => {
        if (active) unlisteners.push(fn); else fn()
      })

      // Check menu events (View toggles) — payload is [id, checked]
      listen<[string, boolean]>('menu-check-event', (e) => {
        const [id, checked] = e.payload
        const store = useFrameStore.getState()
        if (id === 'toggle-spacing-overlays') {
          store.setSpacingOverlays(checked)
        } else if (id === 'toggle-overlay-values') {
          store.setOverlayValues(checked)
        } else if (id === 'toggle-advanced-mode') {
          store.setAdvancedMode(checked)
        }
      }).then((fn) => {
        if (active) unlisteners.push(fn); else fn()
      })
    })
    return () => { active = false; unlisteners.forEach((fn) => fn()) }
  }, [handleOpen, handleSave, handleSaveAs])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds } = useFrameStore.getState()
        if (!selectedId && selectedIds.size === 0) return
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (isEditable) return
        e.preventDefault()
        if (selectedIds.size > 1) {
          removeSelected()
        } else if (selectedId && !isRootId(selectedId)) {
          removeFrame(selectedId)
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId && !isRootId(selectedId)) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((e.target as HTMLElement).isContentEditable) return
        const dir = useFrameStore.getState().getParentDirection(selectedId)
        const isVertical = dir === 'column'
        const isHorizontal = dir === 'row'
        if (isVertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
        if (isHorizontal && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return
        e.preventDefault()
        const before = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
        reorderFrame(selectedId, before ? 'up' : 'down')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        handleSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && e.shiftKey) {
        e.preventDefault()
        handleSaveAs()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault()
        handleOpen()
      }
      // View toggles (keyboard shortcut — also sync native menu check state)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'o') {
        e.preventDefault()
        useFrameStore.getState().toggleSpacingOverlays()
        if (isTauri) {
          const checked = useFrameStore.getState().showSpacingOverlays
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_menu_check', { id: 'toggle-spacing-overlays', checked })
          }).catch(() => {})
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault()
        useFrameStore.getState().toggleOverlayValues()
        if (isTauri) {
          const checked = useFrameStore.getState().showOverlayValues
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_menu_check', { id: 'toggle-overlay-values', checked })
          }).catch(() => {})
        }
      }
      // Advanced mode toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        const store = useFrameStore.getState()
        const next = !store.advancedMode
        store.setAdvancedMode(next)
        if (isTauri) {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke('set_menu_check', { id: 'toggle-advanced-mode', checked: next })
          }).catch(() => {})
        }
      }
      // Preview mode toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        useFrameStore.getState().togglePreviewMode()
      }
      // Zoom: Cmd+= / Cmd+- / Cmd+0
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const { canvasZoom, setCanvasZoom } = useFrameStore.getState()
        const idx = ZOOM_LEVELS.indexOf(canvasZoom)
        if (idx < ZOOM_LEVELS.length - 1) setCanvasZoom(ZOOM_LEVELS[idx + 1])
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '-') {
        e.preventDefault()
        const { canvasZoom, setCanvasZoom } = useFrameStore.getState()
        const idx = ZOOM_LEVELS.indexOf(canvasZoom)
        if (idx > 0) setCanvasZoom(ZOOM_LEVELS[idx - 1])
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '0') {
        e.preventDefault()
        useFrameStore.getState().setCanvasZoom(1)
      }
    }

    window.addEventListener('keydown', handler)
    iframeWindow?.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      iframeWindow?.removeEventListener('keydown', handler)
    }
  }, [undo, redo, removeFrame, removeSelected, reorderFrame, selectedId, handleSave, handleSaveAs, handleOpen, iframeWindow])

  // Resize drag handlers — pointer events + capture for reliable tracking
  const startDrag = (side: 'left' | 'right', e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = side
    startX.current = e.clientX
    startWidth.current = side === 'left' ? leftWidth : rightWidth
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    document.body.style.cursor = 'col-resize'
  }

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    if (dragging.current === 'left') {
      setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidth.current + delta)))
    } else {
      setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth.current - delta)))
    }
  }, [])

  const onResizeUp = useCallback(() => {
    dragging.current = null
    document.body.style.cursor = ''
  }, [])

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-surface-0 select-none">
        <TitleBar />
        {/* Main panels */}
        <div className="flex-1 flex overflow-hidden">
          {!previewMode && (
            <>
              <div style={{ width: leftWidth }} className="shrink-0 border-r border-border">
                <TreePanel onExportLibrary={() => setShowExportLibrary(true)} />
              </div>
              <div
                className="w-[7px] shrink-0 cursor-col-resize bg-transparent hover:bg-accent/40 transition-colors -ml-[4px] z-10"
                onPointerDown={(e) => startDrag('left', e)}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeUp}
              />
            </>
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas />
          </div>
          {!previewMode && (
            <>
              <div
                className="w-[7px] shrink-0 cursor-col-resize bg-transparent hover:bg-accent/40 transition-colors -mr-[4px] z-10"
                onPointerDown={(e) => startDrag('right', e)}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeUp}
              />
              <div style={{ width: rightWidth }} className="shrink-0 border-l border-border">
                <RightPanel />
              </div>
            </>
          )}
        </div>

        {/* Export modals */}
        <ExportModal open={showExport} onOpenChange={setShowExport} />
        <ExportLibraryModal open={showExportLibrary} onOpenChange={setShowExportLibrary} />
      </div>
    </TooltipProvider>
  )
}

export default App
