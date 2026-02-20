import { useState, useRef } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { frameToClasses } from '../../utils/frameToClasses'
import { Section } from '../ui/Section'

function ClassPill({
  label,
  computed,
  onRemove,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  label: string
  computed?: boolean
  onRemove?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  isDragOver?: boolean
}) {
  return (
    <span
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`c-pill ${
        computed
          ? 'bg-surface-2 text-text-muted'
          : 'bg-accent/15 text-accent'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragOver ? 'ring-1 ring-accent' : ''
      }`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-destructive/20 hover:text-destructive text-current opacity-70 hover:opacity-100 transition-all"
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}

export function AdvancedSection({ frame }: { frame: Frame }) {
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const computedClasses = frameToClasses(frame).split(' ').filter(Boolean)
  const manualClasses = frame.tailwindClasses.split(' ').filter(Boolean)
  const allText = [...computedClasses, ...manualClasses].join(' ')

  const copyAll = () => {
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const addClasses = (raw: string) => {
    const newCls = raw.split(/\s+/).filter(Boolean)
    if (newCls.length === 0) return
    const existing = new Set(manualClasses)
    const toAdd = newCls.filter((c) => !existing.has(c))
    if (toAdd.length === 0) return
    updateFrame(frame.id, { tailwindClasses: [...manualClasses, ...toAdd].join(' ') })
  }

  const removeClass = (cls: string) => {
    updateFrame(frame.id, { tailwindClasses: manualClasses.filter((c) => c !== cls).join(' ') })
  }

  const reorder = (from: number, to: number) => {
    if (from === to) return
    const arr = [...manualClasses]
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    updateFrame(frame.id, { tailwindClasses: arr.join(' ') })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addClasses(draft)
      setDraft('')
    }
    if (e.key === 'Backspace' && draft === '' && manualClasses.length > 0) {
      removeClass(manualClasses[manualClasses.length - 1])
    }
  }

  return (
    <Section title="Classes">
      <div className="flex flex-col gap-2">
        <div
          className="c-input px-1.5 py-1.5 flex flex-wrap gap-1 min-h-[32px] cursor-text"
          onClick={() => inputRef.current?.focus()}
          onDragOver={(e) => e.preventDefault()}
        >
          {computedClasses.map((cls, i) => (
            <ClassPill key={`c-${i}`} label={cls} computed />
          ))}
          {manualClasses.map((cls, i) => (
            <ClassPill
              key={`m-${i}-${cls}`}
              label={cls}
              onRemove={() => removeClass(cls)}
              draggable
              isDragOver={overIdx === i && dragIdx !== i}
              onDragStart={(e) => {
                setDragIdx(i)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setOverIdx(i)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (dragIdx !== null) reorder(dragIdx, i)
                setDragIdx(null)
                setOverIdx(null)
              }}
            />
          ))}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (draft.trim()) { addClasses(draft); setDraft('') }
            }}
            placeholder={manualClasses.length === 0 && computedClasses.length === 0 ? 'Add classes...' : ''}
            className="flex-1 min-w-[60px] bg-transparent text-[11px] font-mono text-text-primary placeholder:text-text-muted outline-none py-0.5"
          />
        </div>

        {allText && (
          <button
            onClick={copyAll}
            className="self-start flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-text-muted hover:text-text-primary rounded hover:bg-surface-2 transition-all"
          >
            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy all</>}
          </button>
        )}
      </div>
    </Section>
  )
}
