import { useFrameStore } from '../../store/frameStore'
import { exportToJSX } from '../../utils/exportTailwind'
import { exportToHTML, exportToHTMLDocument } from '../../utils/exportHtml'
import { useMemo, useState } from 'react'
import { Dialog } from '../ui/Dialog'
import { X } from 'lucide-react'
import * as RadixTabs from '@radix-ui/react-tabs'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = 'jsx' | 'html' | 'html-doc'

const FORMAT_TABS: { value: ExportFormat; label: string }[] = [
  { value: 'jsx', label: 'JSX' },
  { value: 'html', label: 'HTML' },
  { value: 'html-doc', label: 'Full Page' },
]

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const root = useFrameStore((s) => s.root)
  const [format, setFormat] = useState<ExportFormat>('jsx')
  const [copied, setCopied] = useState(false)

  const code = useMemo(() => {
    if (!open) return ''
    if (root.children.length === 0) return '<!-- Empty -->'

    switch (format) {
      case 'jsx':
        return root.children.map((c) => exportToJSX(c)).join('\n')
      case 'html':
        return root.children.map((c) => exportToHTML(c)).join('\n')
      case 'html-doc':
        return exportToHTMLDocument(root)
    }
  }, [open, root, format])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RadixTabs.Root
        value={format}
        onValueChange={(v) => setFormat(v as ExportFormat)}
        className="bg-surface-1 border border-border rounded-xl w-[640px] max-h-[80vh] flex flex-col shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold fg-default">Export</h2>
          <button className="w-5 h-5 c-icon-btn hover:fg-muted hover:bg-subtle" onClick={() => onOpenChange(false)}>
            <X size={14} />
          </button>
        </div>

        {/* Tabs + Copy */}
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <RadixTabs.List className="flex items-center gap-0.5">
            {FORMAT_TABS.map((tab) => (
              <RadixTabs.Trigger
                key={tab.value}
                value={tab.value}
                className={`px-2.5 py-1.5 text-[12px] rounded-md transition-all ${
                  format === tab.value
                    ? 'bg-emphasis fg-default'
                    : 'fg-subtle hover:fg-muted'
                }`}
              >
                {tab.label}
              </RadixTabs.Trigger>
            ))}
          </RadixTabs.List>
          <button
            type="button"
            className="px-3 py-1.5 text-[12px] bg-accent text-white font-medium rounded-md hover:bg-accent-hover transition-colors"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[12px] fg-default font-mono leading-relaxed">
          {code}
        </pre>
      </RadixTabs.Root>
    </Dialog>
  )
}
