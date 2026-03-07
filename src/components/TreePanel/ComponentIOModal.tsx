import { useState, useEffect } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { readCjlFile, exportLibrary } from '../../lib/libraryOps'
import type { CjlFileData } from '../../lib/libraryOps'
import type { Component } from '../../types/component'
import { X, Check } from 'lucide-react'
import { Dialog } from '../ui/Dialog'

interface ComponentIOModalProps {
  open: boolean
  mode: 'import' | 'export'
  onOpenChange: (open: boolean) => void
}

export function ComponentIOModal({ open, mode, onOpenChange }: ComponentIOModalProps) {
  // Import state
  const [cjlData, setCjlData] = useState<CjlFileData | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Shared selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Export metadata
  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('')
  const [exporting, setExporting] = useState(false)

  // Internal components for export mode
  const components = useCatalogStore((s) => s.components)

  // On open in import mode: trigger file dialog
  useEffect(() => {
    if (!open) {
      setCjlData(null)
      setImportError(null)
      setSelected(new Set())
      return
    }
    if (mode === 'import') {
      setImportLoading(true)
      setImportError(null)
      readCjlFile()
        .then((data) => {
          if (!data) {
            // User cancelled the dialog
            onOpenChange(false)
            return
          }
          setCjlData(data)
          // Select all by default
          setSelected(new Set(data.components.items.map((c) => c.id)))
        })
        .catch((err) => {
          setImportError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => setImportLoading(false))
    } else {
      // Export mode: select all internal components
      setSelected(new Set(components.map((c) => c.id)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  // ── Import mode ──
  if (mode === 'import') {
    if (importLoading) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <div className="c-modal w-[360px] p-6 text-center">
            <span className="text-[12px] fg-subtle">Reading .cjl file...</span>
          </div>
        </Dialog>
      )
    }

    if (importError) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <div className="c-modal w-[360px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-[13px] font-semibold fg-default">Import Error</h2>
              <button className="w-5 h-5 c-icon-btn" onClick={() => onOpenChange(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-[12px] text-destructive">{importError}</p>
            </div>
            <div className="px-4 py-3 border-t border-border flex justify-end">
              <button className="px-3 py-1.5 rounded-md text-[12px] fg-muted hover:fg-default hover:bg-subtle" onClick={() => onOpenChange(false)}>
                Close
              </button>
            </div>
          </div>
        </Dialog>
      )
    }

    if (!cjlData) return null

    const items = cjlData.components.items
    const allSelected = items.length > 0 && selected.size === items.length

    const toggleItem = (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }

    const toggleAll = () => {
      if (allSelected) setSelected(new Set())
      else setSelected(new Set(items.map((c) => c.id)))
    }

    const handleImport = () => {
      const existingNames = new Set(useCatalogStore.getState().components.map((c) => c.name))
      for (const item of items) {
        if (!selected.has(item.id)) continue
        const component: Component = {
          ...item,
          id: crypto.randomUUID(), // fresh ID to avoid collisions
          name: existingNames.has(item.name) ? `${item.name} (imported)` : item.name,
          createdAt: new Date().toISOString(),
        }
        existingNames.add(component.name)
        useCatalogStore.getState().registerComponent(component)
      }
      onOpenChange(false)
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <div className="c-modal w-[360px] max-h-[500px] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <h2 className="text-[13px] font-semibold fg-default">Import from {cjlData.name}</h2>
              {cjlData.author && <p className="text-[12px] fg-subtle">By {cjlData.author}</p>}
            </div>
            <button className="w-5 h-5 c-icon-btn" onClick={() => onOpenChange(false)}>
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-center text-[12px] fg-subtle">No components in this file.</div>
            ) : (
              <>
                {/* Select all */}
                <button
                  className="w-full flex items-center gap-2 px-4 py-2 text-[12px] fg-muted hover:bg-subtle border-b border-border"
                  onClick={toggleAll}
                >
                  <div className={`c-checkbox shrink-0 ${allSelected ? 'is-checked' : ''}`}>
                    {allSelected && <Check size={10} className="fg-default" />}
                  </div>
                  Select all ({items.length})
                </button>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-[12px] fg-default hover:bg-subtle"
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className={`c-checkbox shrink-0 ${selected.has(item.id) ? 'is-checked' : ''}`}>
                      {selected.has(item.id) && <Check size={10} className="fg-default" />}
                    </div>
                    <span className="truncate">{item.name}</span>
                    {item.tags.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] leading-none font-medium rounded bg-inset fg-subtle ml-auto shrink-0">{item.tags[0]}</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded-md text-[12px] fg-muted hover:fg-default hover:bg-subtle" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button
              className="px-3 py-1.5 rounded-md text-[12px] fg-default font-medium bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
              onClick={handleImport}
              disabled={selected.size === 0}
            >
              Import {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </Dialog>
    )
  }

  // ── Export mode ──
  const allSelected = components.length > 0 && selected.size === components.length

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(components.map((c) => c.id)))
  }

  const handleExport = async () => {
    if (!name.trim()) return
    setExporting(true)
    try {
      const allData = useCatalogStore.getState().getComponentData()
      const filteredData = {
        items: allData.items.filter((c) => selected.has(c.id)),
        order: allData.order.filter((id) => selected.has(id)),
        categories: allData.categories,
      }
      const path = await exportLibrary(filteredData, {
        name: name.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        version: version.trim() || undefined,
      })
      if (path) {
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Failed to export library:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="c-modal w-[360px] max-h-[600px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold fg-default">Export .cjl</h2>
          <button className="w-5 h-5 c-icon-btn" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        {/* Metadata form */}
        <div className="p-4 flex flex-col gap-2 border-b border-border">
          <div>
            <label className="text-[11px] fg-subtle block mb-1">Library Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full c-input h-auto py-1.5"
              placeholder="Library name"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] fg-subtle block mb-1">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full c-input h-auto py-1.5"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-[11px] fg-subtle block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full c-input h-auto py-1.5 resize-none"
              placeholder="What's in this library?"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[11px] fg-subtle block mb-1">Version</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full c-input h-auto py-1.5"
              placeholder="1.0.0"
            />
          </div>
        </div>

        {/* Component picker */}
        <div className="flex-1 overflow-y-auto">
          {components.length === 0 ? (
            <div className="p-4 text-center text-[12px] fg-subtle">No components to export.</div>
          ) : (
            <>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-[12px] fg-muted hover:bg-subtle border-b border-border"
                onClick={toggleAll}
              >
                <div className={`c-checkbox shrink-0 ${allSelected ? 'is-checked' : ''}`}>
                  {allSelected && <Check size={10} className="fg-default" />}
                </div>
                Select all ({components.length})
              </button>
              {components.map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 px-4 py-1.5 text-[12px] fg-default hover:bg-subtle"
                  onClick={() => toggleItem(c.id)}
                >
                  <div className={`c-checkbox shrink-0 ${selected.has(c.id) ? 'is-checked' : ''}`}>
                    {selected.has(c.id) && <Check size={10} className="fg-default" />}
                  </div>
                  <span className="truncate">{c.name}</span>
                  {c.tags.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] leading-none font-medium rounded bg-inset fg-subtle ml-auto shrink-0">{c.tags[0]}</span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded-md text-[12px] fg-muted hover:fg-default hover:bg-subtle" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-[12px] fg-default font-medium bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
            onClick={handleExport}
            disabled={!name.trim() || selected.size === 0 || exporting}
          >
            {exporting ? 'Exporting...' : `Export .cjl (${selected.size})`}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
