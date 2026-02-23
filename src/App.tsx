import { useEffect, useState, useCallback, useRef } from 'react'
import { useFrameStore } from './store/frameStore'
import { TreePanel } from './components/TreePanel/TreePanel'
import { Canvas } from './components/Canvas/Canvas'
import { RightPanel } from './components/RightPanel/RightPanel'
import { ExportModal } from './components/Export/ExportModal'
import { TooltipProvider } from './components/ui/Tooltip'
import { saveFile, saveFileAs, openFile } from './lib/fileOps'
import { useSnippetStore, loadSnippetsFromStorage } from './store/snippetStore'

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

  // Update window title with file name
  useEffect(() => {
    if (!isTauri) return
    const fileName = filePath ? filePath.split('/').pop() : 'Untitled'
    const title = dirty ? `${fileName} — Edited · Caja` : `${fileName} · Caja`
    import('@tauri-apps/api/webviewWindow').then(({ getCurrentWebviewWindow }) => {
      getCurrentWebviewWindow().setTitle(title)
    }).catch(() => {})
  }, [filePath, dirty])

  const handleSave = useCallback(async () => {
    if (!isTauri) return
    const root = useFrameStore.getState().root
    const currentPath = useFrameStore.getState().filePath
    const snippets = useSnippetStore.getState().getSnippetData()
    const path = await saveFile(root, snippets, currentPath)
    if (path) {
      useFrameStore.getState().setFilePath(path)
      useFrameStore.getState().markClean()
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    if (!isTauri) return
    const root = useFrameStore.getState().root
    const snippets = useSnippetStore.getState().getSnippetData()
    const path = await saveFileAs(root, snippets)
    if (path) {
      useFrameStore.getState().setFilePath(path)
      useFrameStore.getState().markClean()
    }
  }, [])

  const handleOpen = useCallback(async () => {
    if (!isTauri) return
    const result = await openFile()
    if (result) {
      const { migrateToInternalRoot } = await import('./store/frameStore')
      const root = migrateToInternalRoot(result.data.root as Record<string, unknown>)
      useFrameStore.getState().loadFromFile(root, result.path)
      useSnippetStore.getState().loadSnippets(result.data.snippets as import('./store/snippetStore').SnippetData | undefined)
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
    loadSnippetsFromStorage()
    startMcpBridge()

    // Sync initial view prefs to native menu check states
    if (isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        const { showSpacingOverlays, showOverlayValues } = useFrameStore.getState()
        invoke('set_menu_check', { id: 'toggle-spacing-overlays', checked: showSpacingOverlays }).catch(() => {})
        invoke('set_menu_check', { id: 'toggle-overlay-values', checked: showOverlayValues }).catch(() => {})
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
        } else if (selectedId && selectedId !== '__root__') {
          removeFrame(selectedId)
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedId && selectedId !== '__root__') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
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
                <TreePanel />
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

        {/* Export modal */}
        <ExportModal open={showExport} onOpenChange={setShowExport} />
      </div>
    </TooltipProvider>
  )
}

export default App
