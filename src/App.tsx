import { useEffect, useState, useCallback, useRef } from 'react'
import { useFrameStore } from './store/frameStore'
import { TreePanel } from './components/TreePanel/TreePanel'
import { Canvas } from './components/Canvas/Canvas'
import { RightPanel } from './components/RightPanel/RightPanel'
import { VIEWPORT_MODES, MODE_WIDTH } from './components/RightPanel/ViewportBar'
import { ExportModal } from './components/Export/ExportModal'
import { WelcomeModal } from './components/WelcomeModal'
import { TooltipProvider } from './components/ui/Tooltip'
import { saveFile, saveFileAs, openFile, openFilePath } from './lib/fileOps'
import { useCatalogStore, loadComponentsFromStorage } from './store/catalogStore'
import { WorkspaceDndProvider } from './components/TreePanel/WorkspaceDndContext'

import { startMcpBridge, stopMcpBridge } from './mcp/bridge'
import { TitleBar } from './components/TitleBar/TitleBar'
import { ZOOM_LEVELS } from './components/Canvas/ZoomBar'
import { isRootId, findParent } from './store/treeHelpers'
import { pushNav, undoNav, redoNav } from './store/selectionHistory'
import { canvasZoomTo } from './components/Canvas/CanvasInline'
import { switchTheme, getThemePreference, getActiveTheme } from './lib/theme'
import { checkForUpdates, checkForUpdatesOnStartup } from './lib/updater'
import { askUnsavedChanges } from './lib/unsavedDialog'

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
  // Tracks whether the DOM paste event fired after ⌘V keydown (see paste handling comment)
  const pasteHandledRef = useRef(false)

  // Persist panel state on change
  useEffect(() => {
    savePanelState({ leftWidth, rightWidth })
  }, [leftWidth, rightWidth])
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const isResizing = resizingSide !== null
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

  /** Add path to recent files and re-sync the local ref */
  const addToRecent = useCallback((path: string) => {
    if (!isTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('add_recent_file', { path })
        .then(() => invoke<string[]>('get_recent_files'))
        .then((files) => { recentFilesRef.current = files })
        .catch((err: unknown) => console.warn('Failed to add recent file:', err))
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

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isTauri) return false
    try {
      const store = useFrameStore.getState()
      const componentData = useCatalogStore.getState().getComponentData()
      const path = await saveFile(store.pages, store.activePageId, componentData, store.filePath)
      if (path) {
        store.setFilePath(path)
        store.markClean()
        addToRecent(path)
        return true
      }
      return false
    } catch (err) {
      console.error('Save failed:', err)
      const { message } = await import('@tauri-apps/plugin-dialog')
      message(err instanceof Error ? err.message : 'Unknown error saving file', { title: 'Save Failed', kind: 'error' })
      return false
    }
  }, [addToRecent])

  const handleSaveAs = useCallback(async () => {
    if (!isTauri) return
    try {
      const store = useFrameStore.getState()
      const componentData = useCatalogStore.getState().getComponentData()
      const path = await saveFileAs(store.pages, store.activePageId, componentData)
      if (path) {
        store.setFilePath(path)
        store.markClean()
        addToRecent(path)
      }
    } catch (err) {
      console.error('Save As failed:', err)
      const { message } = await import('@tauri-apps/plugin-dialog')
      message(err instanceof Error ? err.message : 'Unknown error saving file', { title: 'Save Failed', kind: 'error' })
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
        safeMenuSync(invoke, 'show-hints', useFrameStore.getState().showHints)
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

    if (isTauri) {
      checkForUpdatesOnStartup()
    }

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
          const choice = await askUnsavedChanges(projectName || 'Untitled')
          if (choice === 'cancel') return
          if (choice === 'save') {
            const saved = await handleSaveRef.current()
            if (!saved) return // User cancelled save dialog — abort close
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
              const choice = await askUnsavedChanges(useFrameStore.getState().projectName || 'Untitled')
              if (choice === 'cancel') break
              if (choice === 'save') {
                const saved = await handleSave()
                if (!saved) break // User cancelled save dialog — abort new
              }
            }
            useFrameStore.getState().newFile()
            import('./lib/assetOps').then(({ revokeAllBlobUrls }) => revokeAllBlobUrls())
            break
          }
          case 'open': {
            if (useFrameStore.getState().dirty) {
              const choice = await askUnsavedChanges(useFrameStore.getState().projectName || 'Untitled')
              if (choice === 'cancel') break
              if (choice === 'save') {
                const saved = await handleSave()
                if (!saved) break // User cancelled save dialog — abort open
              }
            }
            handleOpen()
            break
          }
          case 'quit': {
            const qs = useFrameStore.getState()
            const qHasUnsaved = !qs.filePath && !qs.projectName && qs.root.children.length > 0
            if (qs.dirty || qHasUnsaved) {
              const choice = await askUnsavedChanges(qs.projectName || 'Untitled')
              if (choice === 'cancel') break
              if (choice === 'save') {
                const saved = await handleSave()
                if (!saved) break // User cancelled save dialog — abort quit
              }
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
          // Edit menu — custom items with accelerators fire menu-event.
          // Check activeElement to route: text input → execCommand, canvas → app logic.
          case 'edit-undo': {
            const el = document.activeElement as HTMLElement
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) {
              document.execCommand('undo')
            } else {
              const { editingComponentId } = useFrameStore.getState()
              if (editingComponentId) {
                useCatalogStore.getState().undo()
              } else {
                const nav = undoNav(useFrameStore.getState().selectedId)
                if (nav) {
                  const s = useFrameStore.getState()
                  if (nav.id) s.expandToFrame(nav.id)
                  s.select(nav.id)
                } else {
                  undo()
                }
              }
            }
            break
          }
          case 'edit-redo': {
            const el = document.activeElement as HTMLElement
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) {
              document.execCommand('redo')
            } else {
              const { editingComponentId } = useFrameStore.getState()
              if (editingComponentId) {
                useCatalogStore.getState().redo()
              } else {
                const nav = redoNav(useFrameStore.getState().selectedId)
                if (nav) {
                  const s = useFrameStore.getState()
                  if (nav.id) s.expandToFrame(nav.id)
                  s.select(nav.id)
                } else {
                  redo()
                }
              }
            }
            break
          }
          // Cut/Copy/Paste/Select All use predefined menu items (NSResponder chain)
          // — they don't fire menu-event. Canvas operations are handled by DOM
          // copy/paste/cut event listeners registered in the keyboard shortcut effect.
          case 'edit-duplicate': {
            const el = document.activeElement as HTMLElement
            if (el?.tagName !== 'INPUT' && el?.tagName !== 'TEXTAREA' && !el?.isContentEditable) {
              const s = useFrameStore.getState()
              if (s.selectedId && !isRootId(s.selectedId)) s.duplicateFrame(s.selectedId)
            }
            break
          }
          case 'collapse-all':
            useFrameStore.getState().collapseAll()
            break
          case 'expand-all':
            useFrameStore.getState().expandAll()
            break
          case 'open-docs':
            window.open('https://docs.getcaja.app', '_blank')
            break
          case 'send-feedback':
            window.open('https://github.com/getcaja/caja/issues', '_blank')
            break
          case 'keyboard-shortcuts':
            window.dispatchEvent(new Event('show-keyboard-shortcuts'))
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
              const theme = switchTheme(themeId)
              // Sync macOS window appearance so vibrancy matches
              import('@tauri-apps/api/core').then(({ invoke: inv }) => {
                inv('set_appearance', {
                  appearance: themeId === 'system' ? 'system' : theme.dark ? 'dark' : 'light',
                }).catch(() => {})
              })
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
        } else if (id === 'show-hints') {
          useFrameStore.getState().setShowHints(checked)
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
    const syncAppearance = (theme: { dark: boolean }) => {
      if (isTauri) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          const pref = getThemePreference()
          invoke('set_appearance', {
            appearance: pref === 'system' ? 'system' : theme.dark ? 'dark' : 'light',
          }).catch(() => {})
        })
      }
    }
    const onChange = () => {
      if (getThemePreference() === 'system') {
        const theme = switchTheme('system')
        syncAppearance(theme)
      }
    }
    mq.addEventListener('change', onChange)
    // Sync on mount
    syncAppearance(getActiveTheme())
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Global keyboard shortcuts (tree-specific shortcuts are in useTreeKeyboard adapters in TreePanel)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return
        e.preventDefault()
        const { editingComponentId } = useFrameStore.getState()
        if (editingComponentId) {
          useCatalogStore.getState().undo()
        } else {
          // Undo selection navigation first, then tree mutations
          const nav = undoNav(useFrameStore.getState().selectedId)
          if (nav) {
            const s = useFrameStore.getState()
            if (nav.id) s.expandToFrame(nav.id)
            s.select(nav.id)
          } else {
            undo()
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && key === 'z' && e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return
        e.preventDefault()
        const { editingComponentId } = useFrameStore.getState()
        if (editingComponentId) {
          useCatalogStore.getState().redo()
        } else {
          // Redo selection navigation first, then tree mutations
          const nav = redoNav(useFrameStore.getState().selectedId)
          if (nav) {
            const s = useFrameStore.getState()
            if (nav.id) s.expandToFrame(nav.id)
            s.select(nav.id)
          } else {
            redo()
          }
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
      // Escape — select parent frame (walk up hierarchy), deselect at root
      if (e.key === 'Escape' && !e.defaultPrevented) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          const s = useFrameStore.getState()
          if (s.selectedId && !isRootId(s.selectedId)) {
            e.preventDefault()
            pushNav(s.selectedId)
            const parent = findParent(s.root, s.selectedId)
            if (parent && !isRootId(parent.id)) {
              s.select(parent.id)
            } else {
              s.select(null)
            }
          }
        }
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
      // Cmd+C — copy (skip defaultPrevented: predefined Copy menu item sets it)
      if ((e.metaKey || e.ctrlKey) && key === 'c' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          useFrameStore.getState().copySelected()
          // Write text marker to system clipboard so read_clipboard_image returns
          // null on next paste (prevents stale image from overriding frame paste)
          navigator.clipboard?.writeText('__caja_copy__').catch(() => {})
        }
      }
      // Cmd+X — cut (skip defaultPrevented: predefined Cut menu item sets it)
      if ((e.metaKey || e.ctrlKey) && key === 'x' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          useFrameStore.getState().cutSelected()
          navigator.clipboard?.writeText('__caja_copy__').catch(() => {})
        }
      }
      // Cmd+V — paste: The predefined Paste menu item dispatches a DOM paste event
      // via NSResponder, but ONLY when the clipboard has text/HTML. When the clipboard
      // has only image data (e.g. "Copy Image" from Safari), no DOM paste event fires.
      // We detect this by setting a flag here and checking it after a microtask.
      // If the paste event fired, the onPaste handler clears the flag.
      // If not (image-only clipboard), we call read_clipboard_image directly.
      if ((e.metaKey || e.ctrlKey) && key === 'v' && !e.shiftKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable && isTauri) {
          pasteHandledRef.current = false
          setTimeout(() => {
            if (!pasteHandledRef.current) {
              // No paste event fired — clipboard likely has only image data
              // Use save_clipboard_image: Rust writes to disk directly (no base64 over IPC)
              import('@tauri-apps/api/core').then(({ invoke }) =>
                invoke<{ local_path: string; mime: string; width: number; height: number } | null>('save_clipboard_image', {
                  projectPath: useFrameStore.getState().filePath,
                })
              ).then(async (result) => {
                if (!result) return
                const { dvNum } = await import('./store/frameFactories')
                const s = useFrameStore.getState()
                const overrides: Record<string, unknown> = { src: result.local_path }
                if (result.width > 0 && result.height > 0) {
                  overrides.width = { mode: 'custom' as const, value: dvNum(result.width) }
                  overrides.height = { mode: 'custom' as const, value: dvNum(result.height) }
                }
                s.addChild(s.selectedId || s.root.id, 'image', overrides)
                // Populate blob cache async (frame renders with correct size immediately)
                const assetOps = await import('./lib/assetOps')
                assetOps.restoreAssetUrl(result.local_path)
              }).catch(() => {})
            }
          }, 50)
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
      // Cmd+Arrow — cycle viewport modes: LG ←→ MD ←→ SM (clamps at edges)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName
        const isEditable = (e.target as HTMLElement).isContentEditable
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !isEditable) {
          e.preventDefault()
          const { canvasWidth, setCanvasWidth } = useFrameStore.getState()
          const currentIdx = VIEWPORT_MODES.findIndex((m) => MODE_WIDTH[m] === canvasWidth)
          const dir = e.key === 'ArrowRight' ? 1 : -1
          const nextIdx = Math.max(0, Math.min(VIEWPORT_MODES.length - 1, (currentIdx === -1 ? 0 : currentIdx) + dir))
          setCanvasWidth(MODE_WIDTH[VIEWPORT_MODES[nextIdx]])
        }
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

    // DOM clipboard events — handle copy/cut/paste for canvas frames.
    // These fire from both keyboard shortcuts (via NSResponder chain on macOS)
    // and Edit menu clicks (predefined items trigger NSResponder → DOM event).
    // For text inputs, the events bubble but we let the default action run.
    const onCopy = (e: Event) => {
      const el = document.activeElement as HTMLElement
      if (el?.tagName !== 'INPUT' && el?.tagName !== 'TEXTAREA' && !el?.isContentEditable) {
        e.preventDefault()
        useFrameStore.getState().copySelected()
        navigator.clipboard?.writeText('__caja_copy__').catch(() => {})
      }
    }
    const onCut = (e: Event) => {
      const el = document.activeElement as HTMLElement
      if (el?.tagName !== 'INPUT' && el?.tagName !== 'TEXTAREA' && !el?.isContentEditable) {
        e.preventDefault()
        useFrameStore.getState().cutSelected()
        navigator.clipboard?.writeText('__caja_copy__').catch(() => {})
      }
    }
    const onPaste = (e: Event) => {
      pasteHandledRef.current = true // Signal to ⌘V keydown that paste event fired
      const el = document.activeElement as HTMLElement
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
      if (!isTauri) { e.preventDefault(); useFrameStore.getState().pasteClipboard(); return }

      const ce = e as ClipboardEvent
      const cd = ce.clipboardData
      if (!cd) { e.preventDefault(); useFrameStore.getState().pasteClipboard(); return }

      // 1. Check files (drag-drop, screenshots)
      const file = cd.files?.length
        ? [...cd.files].find(f => f.type.startsWith('image/'))
        : undefined

      // 2. Check items (browser "Copy Image" puts blob in items, not files)
      const item = !file && cd.items?.length
        ? [...cd.items].find(i => i.type.startsWith('image/'))
        : undefined

      // 3. Check HTML for <img src="..."> (browser "Copy Image" also includes HTML)
      const html = !file && !item ? cd.getData('text/html') : ''
      const imgMatch = html ? html.match(/<img[^>]+src=["']([^"']+)["']/) : null
      const imgUrl = imgMatch?.[1]

      if (file || item || imgUrl) {
        e.preventDefault()
        const insertImage = async () => {
          const assetOps = await import('./lib/assetOps')
          const filePath = useFrameStore.getState().filePath

          if (file || item) {
            // Get blob from file or item
            const blob = file || item!.getAsFile()
            if (!blob) return
            const buf = await blob.arrayBuffer()
            const result = await assetOps.saveImageBytes(new Uint8Array(buf), blob.type, filePath)
            const s = useFrameStore.getState()
            s.addChild(s.selectedId || s.root.id, 'image', { src: result.localPath })
          } else if (imgUrl) {
            // Download external image URL
            const result = await assetOps.downloadAsset(imgUrl, filePath)
            const s = useFrameStore.getState()
            s.addChild(s.selectedId || s.root.id, 'image', { src: result.localPath })
          }
        }
        insertImage().catch(err => console.warn('Failed to paste image:', err))
        return
      }

      // No image in clipboardData — try NSPasteboard first (Tauri), fall back to internal clipboard.
      // The __caja_copy__ marker written during ⌘C ensures read_clipboard_image returns null
      // after copying frames, so internal clipboard is used correctly.
      e.preventDefault()
      if (isTauri) {
        import('@tauri-apps/api/core').then(({ invoke }) =>
          // First check for URL-only (animated GIF/WebP) via lightweight read
          invoke<{ data: string; mime: string; url: string } | null>('read_clipboard_image')
            .then(async (peek) => {
              if (peek?.url && !peek.data) {
                // URL-only: download original file (preserves GIF animation)
                const assetOps = await import('./lib/assetOps')
                const filePath = useFrameStore.getState().filePath
                const saved = await assetOps.downloadAsset(peek.url, filePath)
                const s = useFrameStore.getState()
                s.addChild(s.selectedId || s.root.id, 'image', { src: saved.localPath })
                return
              }
              // Save image directly to disk (no base64 over IPC)
              const result = await invoke<{ local_path: string; mime: string; width: number; height: number } | null>('save_clipboard_image', {
                projectPath: useFrameStore.getState().filePath,
              })
              if (result) {
                const { dvNum } = await import('./store/frameFactories')
                const s = useFrameStore.getState()
                const overrides: Record<string, unknown> = { src: result.local_path }
                if (result.width > 0 && result.height > 0) {
                  overrides.width = { mode: 'custom' as const, value: dvNum(result.width) }
                  overrides.height = { mode: 'custom' as const, value: dvNum(result.height) }
                }
                s.addChild(s.selectedId || s.root.id, 'image', overrides)
                // Populate blob cache async
                const assetOps = await import('./lib/assetOps')
                assetOps.restoreAssetUrl(result.local_path)
              } else {
                // No image on system clipboard — use internal clipboard
                useFrameStore.getState().pasteClipboard()
              }
            })
        ).catch(() => {
          // read_clipboard_image failed — fall back to internal clipboard
          useFrameStore.getState().pasteClipboard()
        })
      } else {
        useFrameStore.getState().pasteClipboard()
      }
    }

    // Deep-select mode: Cmd held → bypass drill-down for hover + click
    const onMetaDown = (e: KeyboardEvent) => { if (e.key === 'Meta') useFrameStore.getState().setDeepSelect(true) }
    const onMetaUp = (e: KeyboardEvent) => { if (e.key === 'Meta') useFrameStore.getState().setDeepSelect(false) }

    window.addEventListener('keydown', handler)
    window.addEventListener('keydown', onMetaDown)
    window.addEventListener('keyup', onMetaUp)
    window.addEventListener('blur', () => useFrameStore.getState().setDeepSelect(false))
    document.addEventListener('copy', onCopy)
    document.addEventListener('cut', onCut)
    document.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keydown', onMetaDown)
      window.removeEventListener('keyup', onMetaUp)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('cut', onCut)
      document.removeEventListener('paste', onPaste)
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
    setResizingSide(side)

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
      setResizingSide(null)
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
                  className="absolute top-0 -right-1 bottom-0 w-2 cursor-col-resize z-10 group"
                  onPointerDown={(e) => startDrag('left', e)}
                >
                  <div className={`absolute inset-y-0 left-0.5 w-1 group-hover:bg-accent ${resizingSide === 'left' ? 'bg-accent' : ''}`} />
                </div>
              </div>
            )}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Canvas />
            </div>
            {!previewMode && !rightCollapsed && (
              <div style={{ width: rightWidth }} className="shrink-0 border-l border-border relative">
                <div
                  className="absolute top-0 -left-1 bottom-0 w-2 cursor-col-resize z-10 group"
                  onPointerDown={(e) => startDrag('right', e)}
                >
                  <div className={`absolute inset-y-0 right-0.5 w-1 group-hover:bg-accent ${resizingSide === 'right' ? 'bg-accent' : ''}`} />
                </div>
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
