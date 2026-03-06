import { Keyboard, X } from 'lucide-react'
import { useState } from 'react'

const MAC = navigator.platform.startsWith('Mac')
const CMD = MAC ? '\u2318' : 'Ctrl'
const SHIFT = MAC ? '\u21E7' : 'Shift'
const DEL = MAC ? '\u232B' : 'Del'

const sections: { title: string; shortcuts: [string, string][] }[] = [
  {
    title: 'Selection',
    shortcuts: [
      ['Select parent', 'Esc'],
      ['Drill into frame', 'Double Click'],
      [`Deep select`, `${CMD} Click`],
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      ['Copy', `${CMD} C`],
      ['Cut', `${CMD} X`],
      ['Paste', `${CMD} V`],
      ['Duplicate', `${CMD} D`],
      ['Delete', DEL],
      ['Undo', `${CMD} Z`],
      ['Redo', `${CMD} ${SHIFT} Z`],
    ],
  },
  {
    title: 'Structure',
    shortcuts: [
      ['Group', `${CMD} G`],
      ['Ungroup', `${CMD} ${SHIFT} G`],
      ['Reorder', '\u2191 \u2193 \u2190 \u2192'],
    ],
  },
  {
    title: 'Tools',
    shortcuts: [
      ['Pointer', 'V'],
      ['Frame', 'F'],
      ['Text', 'T'],
      ['Image', 'I'],
    ],
  },
  {
    title: 'View',
    shortcuts: [
      ['Toggle left panel', `${CMD} 1`],
      ['Toggle right panel', `${CMD} 2`],
      ['Preview mode', `${CMD} ${SHIFT} P`],
      ['Zoom in', `${CMD} +`],
      ['Zoom out', `${CMD} -`],
      ['Zoom 100%', `${CMD} 0`],
    ],
  },
  {
    title: 'File',
    shortcuts: [
      ['Save', `${CMD} S`],
      ['Save As', `${CMD} ${SHIFT} S`],
      ['Open', `${CMD} O`],
    ],
  },
]

export function ShortcutsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface-1 border border-border rounded-lg shadow-xl w-[360px] max-h-[480px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[13px] font-medium text-text-primary">Keyboard Shortcuts</span>
          <button onClick={onClose} className="fg-icon-subtle hover:fg-icon-muted">
            <X size={14} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-[11px] uppercase tracking-wider fg-subtle px-1 mb-1.5">{section.title}</div>
              {section.shortcuts.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between px-1 py-1">
                  <span className="text-[12px] fg-muted">{label}</span>
                  <kbd className="text-[11px] fg-subtle bg-surface-2 px-1.5 py-0.5 rounded border border-border min-w-[24px] text-center">{keys}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ShortcutsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-5 h-5 flex items-center justify-center rounded fg-icon-subtle hover:fg-icon-muted hover:bg-inset"
        title="Keyboard Shortcuts"
      >
        <Keyboard size={12} />
      </button>
      <ShortcutsPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
