import { useCatalogStore } from '../../store/catalogStore'
import { importLibrary, removeLibraryFile, loadLibraryIndex, saveLibraryIndex, loadLibraryData, rebuildLibraryIndex } from '../../lib/libraryOps'
import { X, Trash2, Upload, Library } from 'lucide-react'
import { useState } from 'react'

interface ManageLibrariesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageLibrariesModal({ open, onOpenChange }: ManageLibrariesModalProps) {
  const libraryIndex = useCatalogStore((s) => s.libraryIndex)
  const installLibrary = useCatalogStore((s) => s.installLibrary)
  const removeLibrary = useCatalogStore((s) => s.removeLibrary)
  const [importing, setImporting] = useState(false)

  if (!open) return null

  const handleImport = async () => {
    setImporting(true)
    try {
      const result = await importLibrary()
      if (result) {
        installLibrary(result.meta, result.data)
        // Persist index
        const index = useCatalogStore.getState().libraryIndex
        await saveLibraryIndex(index)
      }
    } catch (err) {
      console.error('Failed to import library:', err)
    } finally {
      setImporting(false)
    }
  }

  const handleRemove = async (id: string) => {
    const meta = libraryIndex.find((m) => m.id === id)
    if (!meta) return

    removeLibrary(id)
    await removeLibraryFile(meta)
    const index = useCatalogStore.getState().libraryIndex
    await saveLibraryIndex(index)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="bg-surface-1 border border-border rounded-lg shadow-xl w-[400px] max-h-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold text-text-primary">Manage Libraries</h2>
          <button
            className="w-5 h-5 c-icon-btn hover:text-text-secondary hover:bg-surface-2/60"
            onClick={() => onOpenChange(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {libraryIndex.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-[12px]">
              <Library size={24} className="mx-auto mb-2 opacity-40" />
              No libraries installed.
              <br />
              Import a .cjl library to get started.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {libraryIndex.map((lib) => (
                <div
                  key={lib.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-2/40 group"
                >
                  <Library size={14} className="shrink-0 text-text-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-text-primary truncate">{lib.name}</div>
                    {lib.author && (
                      <div className="text-[10px] text-text-muted truncate">by {lib.author}</div>
                    )}
                  </div>
                  {lib.version && (
                    <span className="text-[10px] text-text-muted shrink-0">v{lib.version}</span>
                  )}
                  <button
                    className="w-5 h-5 c-icon-btn opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    onClick={() => handleRemove(lib.id)}
                    title="Remove library"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border">
          <button
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-surface-0 font-medium bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
            onClick={handleImport}
            disabled={importing}
          >
            <Upload size={12} />
            {importing ? 'Importing...' : 'Import .cjl Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Load all installed libraries on startup */
export async function initializeLibraries() {
  try {
    let index = await loadLibraryIndex()

    // Auto-recovery: if index is empty but .cjl files exist on disk, rebuild it
    if (index.length === 0) {
      index = await rebuildLibraryIndex()
      if (index.length === 0) return
      await saveLibraryIndex(index)
    }

    useCatalogStore.getState().setLibraryIndex(index)

    // Lazy-load library data
    for (const meta of index) {
      try {
        const data = await loadLibraryData(meta)
        useCatalogStore.getState().setLibraryData(meta.id, data)
      } catch {
        console.warn(`Failed to load library data for ${meta.name}`)
      }
    }
  } catch {
    // Silently fail — libraries are optional
  }
}
