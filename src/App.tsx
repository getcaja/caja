import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
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
import { WorkspaceDndProvider } from './components/TreePanel/WorkspaceDndContext'

import { startMcpBridge, stopMcpBridge } from './mcp/bridge'
import { TitleBar } from './components/TitleBar/TitleBar'
import { ZOOM_LEVELS } from './components/Canvas/ZoomBar'
import { switchTheme, getActiveTheme } from './lib/theme'
import { checkForUpdates, relaunchApp, type UpdateStatus } from './lib/updater'
import * as Dialog from '@radix-ui/react-dialog'

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
  } catch { /* expected: localStorage unavailable — panel state is non-critical */ }
  return { leftWidth: LEFT_DEFAULT, rightWidth: RIGHT_DEFAULT }
}

function savePanelState(state: { leftWidth: number; rightWidth: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const isTauri = '__TAURI_INTERNALS__' in window

// TODO: Global ErrorBoundary component for React render crashes

/** Fire-and-forget Tauri menu sync — logs on failure instead of silently swallowing */
function safeMenuSync(invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>, id: string, checked: boolean) {
  invoke('set_menu_check', { id, checked }).catch((err) => console.warn(`Menu sync failed (${id}):`, err))
}

function App() {
  const [showExport, setShowExport] = useState(false)
  const [showExportLibrary, setShowExportLibrary] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [showUpdater, setShowUpdater] = useState(false)
  const initial = useRef(loadPanelState())
  const [leftWidth, setLeftWidth] = useState(initial.current.leftWidth)
  const [rightWidth, setRightWidth] = useState(initial.current.rightWidth)

  // Persist panel state on change
  useEffect(() => {
    savePanelState({ leftWidth, rightWidth })
  }, [leftWidth, rightWidth])
  const [isResizing, setIsResizing] = useState(false)
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
    }).catch((err) => console.warn('Failed to set window title:', err))
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
      // Restore blob URLs from local asset files after file load
      import('./lib/assetOps').then(({ restoreAllAssets }) => {
        restoreAllAssets(useFrameStore.getState().pages).catch((err) => console.warn('Asset restore failed:', err))
      })
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
    // Restore blob URLs from local asset files (async, non-blocking)
    import('./lib/assetOps').then(({ restoreAllAssets }) => {
      restoreAllAssets(useFrameStore.getState().pages).catch((err) => console.warn('Asset restore failed:', err))
    })
    loadPatternsFromStorage()
    startMcpBridge()

    // Load installed libraries (Tauri only)
    if (isTauri) {
      import('./components/TreePanel/ManageLibrariesModal').then(({ initializeLibraries }) => {
        initializeLibraries().catch((err) => console.warn('Library initialization failed:', err))
      }).catch((err) => console.warn('Failed to load library module:', err))
    }

    // Sync initial view prefs to native menu check states
    if (isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        const { showSpacingOverlays, showOverlayValues, advancedMode } = useFrameStore.getState()
        safeMenuSync(invoke, 'toggle-spacing-overlays', showSpacingOverlays)
        safeMenuSync(invoke, 'toggle-overlay-values', showOverlayValues)
        safeMenuSync(invoke, 'toggle-advanced-mode', advancedMode)
        // Sync theme radio checks
        const activeId = getActiveTheme().id
        for (const tid of ['default-dark', 'dracula', 'catppuccin-mocha']) {
          safeMenuSync(invoke, `theme-${tid}`, tid === activeId)
        }
      }).catch((err) => console.warn('Failed to load Tauri core for menu sync:', err))
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
            useFrameStore.getState().newFile()
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
          case 'check-for-updates':
            setShowUpdater(true)
            checkForUpdates(setUpdateStatus)
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
          default:
            // Theme menu items: "theme-<id>" → strip prefix
            if (e.payload.startsWith('theme-')) {
              const themeId = e.payload.slice(6) // "theme-default-dark" → "default-dark"
              switchTheme(themeId)
            }
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
        const { getParentDirection, getParentDisplay } = useFrameStore.getState()
        const display = getParentDisplay(selectedId)
        // Grid with multiple columns behaves like a row (Left/Right only)
        const dir = display === 'grid' ? 'row' : getParentDirection(selectedId)
        if (dir === 'column' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
        if (dir === 'row' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return
        e.preventDefault()
        const before = e.key === 'ArrowUp' || e.key === 'ArrowLeft'
        reorderFrame(selectedId, before ? 'up' : 'down')
      }
      // Copy / Cut / Paste
      if ((e.metaKey || e.ctrlKey) && key === 'c' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        useFrameStore.getState().copySelected()
      }
      if ((e.metaKey || e.ctrlKey) && key === 'x' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        useFrameStore.getState().cutSelected()
      }
      if ((e.metaKey || e.ctrlKey) && key === 'v' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        useFrameStore.getState().pasteClipboard()
      }
      // Duplicate
      if ((e.metaKey || e.ctrlKey) && key === 'd') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if ((e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        const s = useFrameStore.getState()
        if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
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
          import('@tauri-apps/api/core').then(({ invoke }) => safeMenuSync(invoke, 'toggle-spacing-overlays', checked))
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        e.preventDefault()
        useFrameStore.getState().toggleOverlayValues()
        if (isTauri) {
          const checked = useFrameStore.getState().showOverlayValues
          import('@tauri-apps/api/core').then(({ invoke }) => safeMenuSync(invoke, 'toggle-overlay-values', checked))
        }
      }
      // Advanced mode toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
        e.preventDefault()
        const store = useFrameStore.getState()
        const next = !store.advancedMode
        store.setAdvancedMode(next)
        if (isTauri) {
          import('@tauri-apps/api/core').then(({ invoke }) => safeMenuSync(invoke, 'toggle-advanced-mode', next))
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
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [undo, redo, removeFrame, removeSelected, reorderFrame, selectedId, handleSave, handleSaveAs, handleOpen])

  // Resize drag — full-viewport overlay prevents iframe from stealing events.
  // Uses pointermove/pointerup (NOT mousemove/mouseup) because preventDefault()
  // on pointerdown cancels mouse compatibility events per the pointer events spec.
  const startDrag = (side: 'left' | 'right', e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = side
    startX.current = e.clientX
    startWidth.current = side === 'left' ? leftWidth : rightWidth
    setIsResizing(true)

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX.current
      if (dragging.current === 'left') {
        setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidth.current + delta)))
      } else {
        setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth.current - delta)))
      }
    }
    const onUp = () => {
      dragging.current = null
      setIsResizing(false)
      document.documentElement.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerup', onUp)
    }
    document.documentElement.addEventListener('pointermove', onMove)
    document.documentElement.addEventListener('pointerup', onUp)
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col select-none">
        <TitleBar />
        {/* Full-viewport overlay during panel resize — prevents canvas from stealing events */}
        {isResizing && <div className="fixed inset-0 z-50 cursor-col-resize" />}
        {/* Main panels */}
        <div className="flex-1 flex overflow-hidden">
          <WorkspaceDndProvider>
            {!previewMode && (
              <div style={{ width: leftWidth }} className="shrink-0 border-r border-border relative">
                <TreePanel onExportLibrary={() => setShowExportLibrary(true)} />
                <div
                  className="absolute top-0 -right-[3px] bottom-0 w-[7px] cursor-col-resize hover:bg-accent/40 transition-colors z-10"
                  onPointerDown={(e) => startDrag('left', e)}
                />
              </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Canvas />
            </div>
            {!previewMode && (
              <div style={{ width: rightWidth }} className="shrink-0 border-l border-border relative">
                <div
                  className="absolute top-0 -left-[3px] bottom-0 w-[7px] cursor-col-resize hover:bg-accent/40 transition-colors z-10"
                  onPointerDown={(e) => startDrag('right', e)}
                />
                <RightPanel />
              </div>
            )}
          </WorkspaceDndProvider>
        </div>

        {/* Export modals */}
        <ExportModal open={showExport} onOpenChange={setShowExport} />
        <ExportLibraryModal open={showExportLibrary} onOpenChange={setShowExportLibrary} />

        {/* Updater dialog */}
        <UpdateDialog
          open={showUpdater}
          onOpenChange={(open) => { setShowUpdater(open); if (!open) setUpdateStatus(null) }}
          status={updateStatus}
        />
      </div>
    </TooltipProvider>
  )
}

function UpdateDialog({ open, onOpenChange, status }: { open: boolean; onOpenChange: (o: boolean) => void; status: UpdateStatus | null }) {
  let content: ReactNode
  if (!status || status.state === 'checking') {
    content = <p className="text-text-secondary">Checking for updates...</p>
  } else if (status.state === 'up-to-date') {
    content = <p className="text-text-secondary">You're on the latest version.</p>
  } else if (status.state === 'available') {
    content = <p className="text-text-secondary">Downloading v{status.version}...</p>
  } else if (status.state === 'downloading') {
    const pct = Math.round(status.progress * 100)
    content = (
      <div className="flex flex-col gap-2">
        <p className="text-text-secondary">Downloading... {pct}%</p>
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  } else if (status.state === 'ready') {
    content = (
      <div className="flex flex-col gap-3">
        <p className="text-text-secondary">Update downloaded. Restart to apply.</p>
        <button
          className="h-7 px-3 bg-accent text-white text-[12px] font-medium rounded hover:bg-accent-hover transition-colors"
          onClick={() => relaunchApp()}
        >
          Restart Now
        </button>
      </div>
    )
  } else if (status.state === 'error') {
    content = <p className="text-destructive text-[12px]">{status.message}</p>
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] bg-surface-1 border border-border rounded-lg p-5 flex flex-col gap-3">
          <Dialog.Title className="text-[13px] font-semibold text-text-primary">Check for Updates</Dialog.Title>
          <div className="text-[12px]">{content}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default App
