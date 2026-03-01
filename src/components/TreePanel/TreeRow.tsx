import { useEffect, useRef } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { INPUT_CLASS } from './hooks/useInlineEdit'

export interface TreeRowProps {
  id: string
  depth: number
  icon?: React.ReactNode
  name: string
  nameClassName?: string
  isSelected: boolean
  isMulti: boolean
  editing: boolean
  editValue: string
  onEditChange: (v: string) => void
  onEditCommit: () => void
  onEditCancel: () => void
  onClick: (e: React.MouseEvent) => void
  onDoubleClick?: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  onMouseEnter?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
  chevron?: 'expanded' | 'collapsed' | 'leaf' | 'none'
  onChevronClick?: () => void
  trailing?: React.ReactNode
  isDragging?: boolean
  dropPosition?: 'before' | 'after' | 'inside' | null
  className?: string
  rowRef?: React.Ref<HTMLDivElement>
  dndProps?: Record<string, unknown>
  colorDot?: string
  selectionStyle?: 'accent' | 'neutral'
}

export function TreeRow({
  depth,
  icon,
  name,
  nameClassName,
  isSelected,
  isMulti,
  editing,
  editValue,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onClick,
  onDoubleClick,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  chevron,
  onChevronClick,
  trailing,
  isDragging,
  dropPosition,
  className,
  rowRef,
  dndProps,
  colorDot,
  selectionStyle = 'accent',
}: TreeRowProps) {
  const internalRef = useRef<HTMLDivElement>(null)

  // Scroll into view when selected
  useEffect(() => {
    if (!isSelected) return
    const el = rowRef
      ? (typeof rowRef === 'function' ? null : rowRef.current)
      : internalRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [isSelected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drop indicators
  let dropIndicator: React.ReactNode = null
  if (dropPosition === 'before') {
    dropIndicator = (
      <div
        className="absolute left-0 right-0 top-0 h-[2px] bg-accent z-10 pointer-events-none"
        style={{ marginLeft: depth * 16 + 8 }}
      />
    )
  } else if (dropPosition === 'after') {
    dropIndicator = (
      <div
        className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none"
        style={{ marginLeft: depth * 16 + 8 }}
      />
    )
  }

  // Chevron rendering
  let chevronEl: React.ReactNode = null
  if (chevron && chevron !== 'none') {
    chevronEl = (
      <span
        className={`w-3.5 h-4 flex items-center justify-center shrink-0 text-text-muted select-none ${chevron !== 'leaf' ? 'cursor-pointer' : ''}`}
        onClick={(e: React.MouseEvent) => {
          if (chevron !== 'leaf') {
            e.stopPropagation()
            onChevronClick?.()
          }
        }}
      >
        {chevron === 'expanded' ? <ChevronDown size={10} /> :
         chevron === 'collapsed' ? <ChevronRight size={10} /> :
         <ChevronRight size={10} className="opacity-50" />}
      </span>
    )
  }

  return (
    <div className="relative" style={isDragging ? { opacity: 0.3 } : undefined}>
      {dropIndicator}
      <div
        ref={rowRef ?? internalRef}
        {...(dndProps ?? {})}
        className={`flex items-center gap-1.5 py-1 cursor-default group ${
          isSelected
            ? `${selectionStyle === 'neutral' ? 'tree-node-selected-neutral' : isMulti ? 'tree-node-multi-selected' : 'tree-node-selected'} text-text-primary`
            : dropPosition === 'inside'
              ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
              : 'hover:bg-[var(--color-accent)]/8 text-text-secondary hover:text-text-primary'
        } ${className ?? ''}`}
        style={{ paddingLeft: depth * 16 + 8, paddingRight: 8 }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {chevronEl}

        {/* Type icon */}
        {icon && <span className="shrink-0">{icon}</span>}

        {/* Color dot */}
        {colorDot && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colorDot }}
          />
        )}

        {/* Name / inline edit */}
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditCommit()
              if (e.key === 'Escape') onEditCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={INPUT_CLASS}
          />
        ) : (
          <span className={`flex-1 h-5 flex items-center text-[12px] truncate ${nameClassName ?? ''}`}>
            {name}
          </span>
        )}

        {/* Trailing slot (visibility toggle, checkmark, etc.) */}
        {trailing}
      </div>
    </div>
  )
}
