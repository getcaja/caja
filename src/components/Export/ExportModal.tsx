import { useFrameStore } from '../../store/frameStore'
import { exportToJSX } from '../../utils/exportTailwind'
import { useState } from 'react'
import { Dialog } from '../ui/Dialog'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const root = useFrameStore((s) => s.root)
  const [copied, setCopied] = useState(false)

  const code = root.children.length > 0
    ? root.children.map((child) => exportToJSX(child)).join('\n\n')
    : '// Empty'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-surface-1 border border-border-accent rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[12px] text-text-primary font-semibold">Export — Tailwind JSX</span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 text-[12px] bg-accent text-white rounded-md hover:opacity-85 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              className="px-3 py-1.5 text-[12px] text-text-muted hover:text-text-primary bg-surface-2 hover:bg-surface-3 rounded-md transition-all"
              onClick={() => onOpenChange(false)}
            >
              Close
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[12px] text-text-primary font-mono leading-relaxed">
          {code}
        </pre>
      </div>
    </Dialog>
  )
}
