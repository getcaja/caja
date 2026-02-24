import { useState, useEffect } from 'react'
import { useCatalogStore } from '../../store/catalogStore'
import { exportLibrary } from '../../lib/libraryOps'
import { X } from 'lucide-react'

interface ExportLibraryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportLibraryModal({ open, onOpenChange }: ExportLibraryModalProps) {
  const lastExport = useCatalogStore((s) => s.lastExport)
  const setLastExport = useCatalogStore((s) => s.setLastExport)

  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [version, setVersion] = useState('')
  const [exporting, setExporting] = useState(false)

  // Pre-fill from lastExport when modal opens
  useEffect(() => {
    if (open && lastExport) {
      setName(lastExport.name)
      setAuthor(lastExport.author)
      setDescription(lastExport.description)
      setVersion(lastExport.version)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const handleExport = async () => {
    if (!name.trim()) return
    setExporting(true)
    try {
      const data = useCatalogStore.getState().getPatternData()
      const path = await exportLibrary(data, {
        name: name.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        version: version.trim() || undefined,
      })
      if (path) {
        setLastExport({
          path,
          name: name.trim(),
          author: author.trim(),
          description: description.trim(),
          version: version.trim(),
        })
        onOpenChange(false)
      }
    } catch (err) {
      console.error('Failed to export library:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="bg-surface-1 border border-border rounded-lg shadow-xl w-[360px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold text-text-primary">Export as Library</h2>
          <button
            className="w-5 h-5 c-icon-btn hover:text-text-secondary hover:bg-surface-2/60"
            onClick={() => onOpenChange(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Library Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Library name"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent transition-colors resize-none"
              placeholder="What's in this library?"
              rows={2}
            />
          </div>
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Version</label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-md px-2.5 py-1.5 text-[12px] text-text-primary outline-none focus:border-accent transition-colors"
              placeholder="1.0.0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            className="px-3 py-1.5 rounded-md text-[12px] text-text-secondary hover:text-text-primary hover:bg-surface-2/60 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-md text-[12px] text-text-primary bg-accent hover:bg-accent-hover transition-colors disabled:opacity-50"
            onClick={handleExport}
            disabled={!name.trim() || exporting}
          >
            {exporting ? 'Exporting...' : 'Export .cjl'}
          </button>
        </div>
      </div>
    </div>
  )
}
