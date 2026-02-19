import { useEffect, useState, useCallback, useRef } from 'react'
import { useFrameStore } from './store/frameStore'
import { TreePanel } from './components/TreePanel/TreePanel'
import { Canvas } from './components/Canvas/Canvas'
import { RightPanel } from './components/RightPanel/RightPanel'
import { ExportModal } from './components/Export/ExportModal'
import { TooltipProvider } from './components/ui/Tooltip'
import { saveFile, saveFileAs, openFile } from './lib/fileOps'
import type { BoxElement } from './types/frame'
import { startMcpBridge, stopMcpBridge } from './mcp/bridge'

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
  const reorderFrame = useFrameStore((s) => s.reorderFrame)
  const selectedId = useFrameStore((s) => s.selectedId)
  const filePath = useFrameStore((s) => s.filePath)
  const dirty = useFrameStore((s) => s.dirty)

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
    const path = await saveFile(root, currentPath)
    if (path) {
      useFrameStore.getState().setFilePath(path)
      useFrameStore.getState().markClean()
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    if (!isTauri) return
    const root = useFrameStore.getState().root
    const path = await saveFileAs(root)
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
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
    startMcpBridge()
    return () => stopMcpBridge()
  }, [loadFromStorage])

  // Listen for native menu events (Tauri)
  useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<string>('menu-event', (e) => {
        switch (e.payload) {
          case 'new':
            useFrameStore.setState({
              root: useFrameStore.getState().root.children.length ? useFrameStore.getState().root : useFrameStore.getState().root,
              filePath: null,
              dirty: false,
              selectedId: null,
              past: [],
              future: [],
            })
            localStorage.removeItem('caja-state')
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
          case 'toggle-spacing-overlays':
            useFrameStore.getState().toggleSpacingOverlays()
            break
          case 'toggle-overlay-values':
            useFrameStore.getState().toggleOverlayValues()
            break
        }
      }).then((fn) => { unlisten = fn })
    })
    return () => { unlisten?.() }
  }, [handleOpen, handleSave, handleSaveAs])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && selectedId !== '__root__') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (isEditable) return
        e.preventDefault()
        removeFrame(selectedId)
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
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, removeFrame, reorderFrame, selectedId, handleSave, handleSaveAs, handleOpen])

  // Resize drag handlers
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    if (dragging.current === 'left') {
      setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, startWidth.current + delta)))
    } else {
      setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startWidth.current - delta)))
    }
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const startDrag = (side: 'left' | 'right', e: React.MouseEvent) => {
    dragging.current = side
    startX.current = e.clientX
    startWidth.current = side === 'left' ? leftWidth : rightWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-surface-0">
        {/* Main panels */}
        <div className="flex-1 flex overflow-hidden">
          <div style={{ width: leftWidth }} className="shrink-0">
            <TreePanel />
          </div>
          <div
            className="w-[3px] shrink-0 cursor-col-resize bg-transparent hover:bg-accent/40 transition-colors"
            onMouseDown={(e) => startDrag('left', e)}
          />
          <Canvas />
          <div
            className="w-[3px] shrink-0 cursor-col-resize bg-transparent hover:bg-accent/40 transition-colors"
            onMouseDown={(e) => startDrag('right', e)}
          />
          <div style={{ width: rightWidth }} className="shrink-0">
            <RightPanel />
          </div>
        </div>

        {/* Export modal */}
        <ExportModal open={showExport} onOpenChange={setShowExport} />
      </div>
    </TooltipProvider>
  )
}

export default App
