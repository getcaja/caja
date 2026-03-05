import { useEffect, useState, useCallback, useRef } from 'react'
import { useFrameStore } from './store/frameStore'
import { TreePanel } from './components/TreePanel/TreePanel'
import { Canvas } from './components/Canvas/Canvas'
import { RightPanel } from './components/RightPanel/RightPanel'
import { ExportModal } from './components/Export/ExportModal'
import { WelcomeModal } from './components/WelcomeModal'
import { TooltipProvider } from './components/ui/Tooltip'
import { saveFile, saveFileAs, openFile, openFilePath } from './lib/fileOps'
import { useCatalogStore, loadComponentsFromStorage } from './store/catalogStore'
import { WorkspaceDndProvider } from './components/TreePanel/WorkspaceDndContext'

import { startMcpBridge, stopMcpBridge } from './mcp/bridge'
import { TitleBar } from './components/TitleBar/TitleBar'
import { ZOOM_LEVELS } from './components/Canvas/ZoomBar'
import { isRootId } from './store/treeHelpers'
import { canvasZoomTo } from './components/Canvas/CanvasInline'
import { switchTheme, getThemePreference } from './lib/theme'
import { checkForUpdates, checkForUpdatesOnStartup } from './lib/updater'

const LEFT_MIN = 320
const LEFT_MAX = 400
const LEFT_DEFAULT = 320
const RIGHT_MIN = 320
const RIGHT_MAX = 400
const RIGHT_DEFAULT = 320

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
  const [showWelcome, setShowWelcome] = useState(false)
  const initial = useRef(loadPanelState())
  const [leftWidth, setLeftWidth] = useState(initial.current.leftWidth)
  const [rightWidth, setRightWidth] = useState(initial.current.rightWidth)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [layoutResetKey, setLayoutResetKey] = useState(0)

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
  const filePath = useFrameStore((s) => s.filePath)
  const projectName = useFrameStore((s) => s.projectName)
  const previewMode = useFrameStore((s) => s.previewMode)
  const activePageId = useFrameStore((s) => s.activePageId)
  const pages = useFrameStore((s) => s.pages)

  // Update window title with file name + active page
  // NOTE: dirty state is excluded — each setTitle() triggers a macOS traffic-light
  // reposition (±1pt resize hack) which causes visible flicker when editing rapidly.
  // The custom TitleBar already shows a dirty dot indicator.
  const lastTitleRef = useRef('')
  useEffect(() => {
    if (!isTauri) return
    const fileName = filePath ? filePath.split('/').pop() : (projectName ?? 'Untitled')
    const activePage = pages.find((p) => p.id === activePageId)
    const pageName = activePage?.name || ''
    const regularPages = pages.filter((p) => !p.isComponentPage)
    const pageLabel = regularPages.length > 1 && pageName ? ` — ${pageName}` : ''
    const title = `${fileName}${pageLabel}`
    if (title === lastTitleRef.current) return
    lastTitleRef.current = title
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('set_window_title', { title })
    }).catch((err) => console.warn('Failed to set window title:', err))
  }, [filePath, projectName, activePageId, pages])

  const recentFilesRef = useRef<string[]>([])

  /** Add path to recent files (fire-and-forget) */
  const addToRecent = useCallback((path: string) => {
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('add_recent_file', { path }).catch((err: unknown) => console.warn('Failed to add recent file:', err))
    })
  }, [])

  /** Load a .caja file by known path (shared logic for handleOpen and recent files) */
  const loadFileFromPath = useCallback(async (result: { path: string; data: Record<string, unknown> }) => {
    const { migrateToInternalRoot } = await import('./store/frameStore')
    const data = result.data
    if (data.pages && Array.isArray(data.pages)) {
      const pages = (data.pages as Array<Record<string, unknown>>).map((p) => ({
        id: p.id as string,
        name: p.name as string,
        route: p.route as string,
        root: migrateToInternalRoot(p.root as Record<string, unknown>, p.id as string),
        ...(p.isComponentPage ? { isComponentPage: true as const } : {}),
      }))
      const activePageId = (data.activePageId as string) || pages[0].id
      useFrameStore.getState().loadFromFileMulti(pages, activePageId, result.path)
    } else if (data.root) {
      const root = migrateToInternalRoot(data.root as Record<string, unknown>, 'page-1')
      useFrameStore.getState().loadFromFile(root, result.path)
    }
    useCatalogStore.getState().loadComponents(data.components as import('./store/catalogStore').ComponentData | undefined)
    addToRecent(result.path)
    import('./lib/assetOps').then(({ restoreAllAssets }) => {
      restoreAllAssets(useFrameStore.getState().pages).catch((err) => console.warn('Asset restore failed:', err))
    })
  }, [addToRecent])

  const handleSave = useCallback(async () => {
    if (!isTauri) return
    const store = useFrameStore.getState()
    const componentData = useCatalogStore.getState().getComponentData()
    const path = await saveFile(store.pages, store.activePageId, componentData, store.filePath)
    if (path) {
      store.setFilePath(path)
      store.markClean()
      addToRecent(path)
    }
  }, [addToRecent])

  const handleSaveAs = useCallback(async () => {
    if (!isTauri) return
    const store = useFrameStore.getState()
    const componentData = useCatalogStore.getState().getComponentData()
    const path = await saveFileAs(store.pages, store.activePageId, componentData)
    if (path) {
      store.setFilePath(path)
      store.markClean()
      addToRecent(path)
    }
  }, [addToRecent])

  const handleOpen = useCallback(async () => {
    if (!isTauri) return
    try {
      const result = await openFile()
      if (result) await loadFileFromPath(result)
    } catch (err) {
      console.error('Failed to open file:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error opening file'
      const { message } = await import('@tauri-apps/plugin-dialog')
      message(msg, { title: 'Open Failed', kind: 'error' })
    }
  }, [loadFileFromPath])

  useEffect(() => {
    const didRestore = loadFromStorage()
    // First-launch: if no localStorage data, check filesystem flag (Tauri only)
    if (!didRestore && isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke<boolean>('check_has_launched').then(async (launched) => {
          if (!launched) {
            useFrameStore.getState().loadSampleProject()
            await invoke('mark_has_launched')
            setShowWelcome(true)
          }
        }).catch((err) => console.warn('First-launch check failed:', err))
      })
    }
    // Restore blob URLs from local asset files (async, non-blocking)
    import('./lib/assetOps').then(({ restoreAllAssets }) => {
      restoreAllAssets(useFrameStore.getState().pages).catch((err) => console.warn('Asset restore failed:', err))
    })
    loadComponentsFromStorage()
    startMcpBridge()

    // Sync initial view prefs to native menu check states + load recent files
    if (isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        safeMenuSync(invoke, 'toggle-left-panel', true)
        safeMenuSync(invoke, 'toggle-right-panel', true)
        safeMenuSync(invoke, 'style-new-frames', useFrameStore.getState().styleNewFrames)
        // Sync theme radio checks
        const pref = getThemePreference()
        for (const tid of ['system', 'default-dark', 'default-light']) {
          safeMenuSync(invoke, `theme-${tid}`, tid === pref)
        }
        // Sync spacing grid radio checks
        const gridPref = useFrameStore.getState().spacingGrid
        for (const gid of ['off', '4px', '8px']) {
          safeMenuSync(invoke, `spacing-grid-${gid}`, gid === gridPref)
        }
        // Load recent files list for menu event index lookups
        invoke<string[]>('get_recent_files').then((files) => {
          recentFilesRef.current = files
        }).catch((err: unknown) => console.warn('Failed to load recent files:', err))
      }).catch((err) => console.warn('Failed to load Tauri core for menu sync:', err))
    }

    if (isTauri) checkForUpdatesOnStartup()

    return () => stopMcpBridge()
  }, [loadFromStorage])

  // Unsaved changes protection on window close (Tauri)
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave
  const closingRef = useRef(false)
  useEffect(() => {
    if (!isTauri) return
    let cancelled = false
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (cancelled) return
      const win = getCurrentWindow()
      win.onCloseRequested(async (event) => {
        // Guard: prevent double-fire (plugin or destroy re-triggers)
        if (closingRef.current) { event.preventDefault(); return }
        // Always prevent default — relying on native close is unreliable
        // when tauri_plugin_window_state intercepts the event.
        event.preventDefault()
        const { dirty, filePath, projectName, root } = useFrameStore.getState()
        const hasUnsavedContent = !filePath && !projectName && root.children.length > 0
        if (dirty || hasUnsavedContent) {
          const { ask } = await import('@tauri-apps/plugin-dialog')
          const save = await ask('You have unsaved changes. Save before closing?', {
            title: 'Unsaved Changes',
            kind: 'warning',
            okLabel: 'Save',
            cancelLabel: "Don't Save",
          })
          if (save) {
            await handleSaveRef.current()
          }
        }
        closingRef.current = true
        const { exit } = await import('@tauri-apps/plugin-process')
        await exit(0)
      }).then((fn) => {
        if (cancelled) { fn(); return } // effect disposed before import resolved
        unlisten = fn
      })
    })
    return () => { cancelled = true; unlisten?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for native menu events (Tauri)
  useEffect(() => {
    if (!isTauri) return
    let active = true
    const unlisteners: (() => void)[] = []
    import('@tauri-apps/api/event').then(({ listen }) => {
      if (!active) return

      // Regular menu events
      listen<string>('menu-event', async (e) => {
        switch (e.payload) {
          case 'new': {
            if (useFrameStore.getState().dirty) {
              const { ask } = await import('@tauri-apps/plugin-dialog')
              const save = await ask('Save changes before creating a new file?', {
                title: 'Unsaved Changes', kind: 'warning',
                okLabel: 'Save', cancelLabel: "Don't Save",
              })
              if (save) await handleSave()
            }
            useFrameStore.getState().newFile()
            import('./lib/assetOps').then(({ revokeAllBlobUrls }) => revokeAllBlobUrls())
            break
          }
          case 'open': {
            if (useFrameStore.getState().dirty) {
              const { ask } = await import('@tauri-apps/plugin-dialog')
              const save = await ask('Save changes before opening another file?', {
                title: 'Unsaved Changes', kind: 'warning',
                okLabel: 'Save', cancelLabel: "Don't Save",
              })
              if (save) await handleSave()
            }
            handleOpen()
            break
          }
          case 'quit': {
            const qs = useFrameStore.getState()
            const qHasUnsaved = !qs.filePath && !qs.projectName && qs.root.children.length > 0
            if (qs.dirty || qHasUnsaved) {
              const { ask } = await import('@tauri-apps/plugin-dialog')
              const save = await ask('You have unsaved changes. Save before quitting?', {
                title: 'Unsaved Changes', kind: 'warning',
                okLabel: 'Save', cancelLabel: "Don't Save",
              })
              if (save) await handleSave()
            }
            const { exit } = await import('@tauri-apps/plugin-process')
            await exit(0)
            break
          }
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
            checkForUpdates()
            break
          // Edit menu uses native WebView items (undo/redo/cut/copy/paste/select-all).
          // They are NOT emitted as menu-event — the WebView handles them natively,
          // so they work correctly in inputs, text fields, and dev tools.
          case 'collapse-all':
            useFrameStore.getState().collapseAll()
            break
          case 'expand-all':
            useFrameStore.getState().expandAll()
            break
          case 'reset-workspace':
            setLeftWidth(LEFT_DEFAULT)
            setRightWidth(RIGHT_DEFAULT)
            setLeftCollapsed(false)
            setRightCollapsed(false)
            useFrameStore.getState().expandAll()
            useFrameStore.getState().setStyleNewFrames(true)
            useFrameStore.getState().setSpacingGrid('4px')
            useFrameStore.getState().setCanvasZoom(1)
            useFrameStore.getState().setActiveBreakpoint('base')
            useFrameStore.getState().setPreviewMode(false)
            // Reset section collapse states to defaults
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const key = localStorage.key(i)
              if (key?.startsWith('caja-section-')) localStorage.removeItem(key)
            }
            setLayoutResetKey((k) => k + 1)
            import('@tauri-apps/api/core').then(({ invoke }) => {
              safeMenuSync(invoke, 'toggle-left-panel', true)
              safeMenuSync(invoke, 'toggle-right-panel', true)
              safeMenuSync(invoke, 'style-new-frames', true)
              for (const gid of ['off', '4px', '8px']) {
                safeMenuSync(invoke, `spacing-grid-${gid}`, gid === '4px')
              }
            })
            break
          default:
            // Recent file items: "recent-N" → open file at index N
            if (e.payload.startsWith('recent-')) {
              const index = parseInt(e.payload.slice(7), 10)
              const path = recentFilesRef.current[index]
              if (path) {
                openFilePath(path).then(loadFileFromPath).catch((err) => {
                  console.error('Failed to open recent file:', err)
                  import('@tauri-apps/plugin-dialog').then(({ message }) => {
                    message(err instanceof Error ? err.message : 'Failed to open file', { title: 'Open Failed', kind: 'error' })
                  })
                })
              }
              break
            }
            if (e.payload === 'clear-recent') {
              recentFilesRef.current = []
              break
            }
            // Theme menu items: "theme-<id>" → strip prefix
            if (e.payload.startsWith('theme-')) {
              const themeId = e.payload.slice(6) // "theme-default-dark" → "default-dark"
              switchTheme(themeId)
            }
            // Spacing grid menu items: "spacing-grid-<mode>"
            if (e.payload.startsWith('spacing-grid-')) {
              const mode = e.payload.slice(13) as 'off' | '4px' | '8px' // "spacing-grid-4px" → "4px"
              useFrameStore.getState().setSpacingGrid(mode)
            }
        }
      }).then((fn) => {
        if (active) unlisteners.push(fn); else fn()
      })

      // Check menu events (View toggles) — payload is [id, checked]
      listen<[string, boolean]>('menu-check-event', (e) => {
        const [id, checked] = e.payload
        if (id === 'toggle-left-panel') {
          setLeftCollapsed(!checked)
        } else if (id === 'toggle-right-panel') {
          setRightCollapsed(!checked)
        } else if (id === 'style-new-frames') {
          useFrameStore.getState().setStyleNewFrames(checked)
        }
      }).then((fn) => {
        if (active) unlisteners.push(fn); else fn()
      })
    })
    return () => { active = false; unlisteners.forEach((fn) => fn()) }
  }, [handleOpen, handleSave, handleSaveAs, loadFileFromPath])

  // Re-apply theme when system color scheme changes (only matters when preference is 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      if (getThemePreference() === 'system') switchTheme('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Global keyboard shortcuts (tree-specific shortcuts are in useTreeKeyboard adapters in TreePanel)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const { editingComponentId } = useFrameStore.getState()
        if (editingComponentId) {
          useCatalogStore.getState().undo()
        } else {
          undo()
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === 'z' && e.shiftKey) {
        e.preventDefault()
        const { editingComponentId } = useFrameStore.getState()
        if (editingComponentId) {
          useCatalogStore.getState().redo()
        } else {
          redo()
        }
      }
      // Group / Ungroup
      if ((e.metaKey || e.ctrlKey) && key === 'g' && !e.shiftKey) {
        e.preventDefault()
        const s = useFrameStore.getState()
        const allIds = new Set(s.selectedIds)
        if (s.selectedId) allIds.add(s.selectedId)
        if (allIds.size > 1) {
          s.wrapSelectedInFrame()
        } else if (allIds.size === 1) {
          s.wrapInFrame([...allIds][0])
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === 'g' && e.shiftKey) {
        e.preventDefault()
        const s = useFrameStore.getState()
        if (s.selectedId) s.ungroupFrame(s.selectedId)
      }
      // Delete / Backspace — delete selected frame (global)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          const s = useFrameStore.getState()
          if (s.selectedIds.size > 1) {
            e.preventDefault()
            s.removeSelected()
          } else if (s.selectedId && !isRootId(s.selectedId)) {
            e.preventDefault()
            s.removeFrame(s.selectedId)
          }
        }
      }
      // Arrow keys — reorder selected frame (global)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          const s = useFrameStore.getState()
          if (s.selectedId && !isRootId(s.selectedId)) {
            const display = s.getParentDisplay(s.selectedId)
            const parentDir = display === 'grid' ? 'row' : s.getParentDirection(s.selectedId)
            if (parentDir === 'column' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { /* skip */ }
            else if (parentDir === 'row' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { /* skip */ }
            else {
              e.preventDefault()
              const dir = (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? 'up' : 'down'
              s.reorderFrame(s.selectedId, dir)
            }
          }
        }
      }
      // Cmd+D — duplicate (global, works regardless of active tab)
      if ((e.metaKey || e.ctrlKey) && key === 'd' && !e.shiftKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          const s = useFrameStore.getState()
          if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
        }
      }
      // Cmd+C — copy (global)
      if ((e.metaKey || e.ctrlKey) && key === 'c' && !e.shiftKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          useFrameStore.getState().copySelected()
        }
      }
      // Cmd+X — cut (global)
      if ((e.metaKey || e.ctrlKey) && key === 'x' && !e.shiftKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          useFrameStore.getState().cutSelected()
        }
      }
      // Cmd+V — paste (global)
      if ((e.metaKey || e.ctrlKey) && key === 'v' && !e.shiftKey && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          useFrameStore.getState().pasteClipboard()
        }
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
      // Panel toggles (Cmd+1 / Cmd+2)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '1') {
        e.preventDefault()
        setLeftCollapsed((v) => {
          const next = !v
          if (isTauri) import('@tauri-apps/api/core').then(({ invoke }) => safeMenuSync(invoke, 'toggle-left-panel', !next))
          return next
        })
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '2') {
        e.preventDefault()
        setRightCollapsed((v) => {
          const next = !v
          if (isTauri) import('@tauri-apps/api/core').then(({ invoke }) => safeMenuSync(invoke, 'toggle-right-panel', !next))
          return next
        })
      }
      // Preview mode toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        useFrameStore.getState().togglePreviewMode()
      }
      // Canvas tool shortcuts — only when no modifier and not typing in an input
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          if (key === 'f' && !e.shiftKey) {
            e.preventDefault()
            const s = useFrameStore.getState()
            if (!s.previewMode) s.setCanvasTool('frame')
          }
          if (key === 't') {
            e.preventDefault()
            const s = useFrameStore.getState()
            if (!s.previewMode) s.setCanvasTool('text')
          }
          if (key === 'i') {
            e.preventDefault()
            const s = useFrameStore.getState()
            if (!s.previewMode) {
              s.setCanvasTool('image')
              import('./lib/assetOps').then(({ importLocalAsset }) => {
                importLocalAsset(useFrameStore.getState().filePath).then((result) => {
                  if (result) {
                    useFrameStore.getState().setPendingImageSrc(result.localPath)
                  } else {
                    useFrameStore.getState().setCanvasTool('pointer')
                  }
                })
              })
            }
          }
          if (key === 'v' || key === 'escape') {
            const s = useFrameStore.getState()
            if (s.canvasTool !== 'pointer') {
              e.preventDefault()
              s.setCanvasTool('pointer')
              s.setPendingImageSrc(null)
            }
          }
        }
      }
      // Zoom: Cmd+= / Cmd+- / Cmd+0
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const { canvasZoom } = useFrameStore.getState()
        const next = ZOOM_LEVELS.find((z) => z > canvasZoom + 0.001)
        if (next != null) canvasZoomTo(next)
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '-') {
        e.preventDefault()
        const { canvasZoom } = useFrameStore.getState()
        const prev = [...ZOOM_LEVELS].reverse().find((z) => z < canvasZoom - 0.001)
        if (prev != null) canvasZoomTo(prev)
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === '0') {
        e.preventDefault()
        canvasZoomTo(1)
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [undo, redo, handleSave, handleSaveAs, handleOpen])

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
            {!previewMode && !leftCollapsed && (
              <div style={{ width: leftWidth }} className="shrink-0 border-r border-border relative">
                <TreePanel key={layoutResetKey} />
                <div
                  className="absolute top-0 -right-[3px] bottom-0 w-[7px] cursor-col-resize hover:bg-accent/40 transition-colors z-10"
                  onPointerDown={(e) => startDrag('left', e)}
                />
              </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Canvas />
            </div>
            {!previewMode && !rightCollapsed && (
              <div style={{ width: rightWidth }} className="shrink-0 border-l border-border relative">
                <div
                  className="absolute top-0 -left-[3px] bottom-0 w-[7px] cursor-col-resize hover:bg-accent/40 transition-colors z-10"
                  onPointerDown={(e) => startDrag('right', e)}
                />
                <RightPanel key={layoutResetKey} />
              </div>
            )}
          </WorkspaceDndProvider>
        </div>

        {/* Export modal */}
        <ExportModal open={showExport} onOpenChange={setShowExport} />
        <WelcomeModal open={showWelcome} onOpenChange={setShowWelcome} />

      </div>
    </TooltipProvider>
  )
}

export default App
