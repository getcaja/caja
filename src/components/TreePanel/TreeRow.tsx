import { useEffect, useRef, memo } from 'react'
import { ChevronRight } from 'lucide-react'
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
  badges?: React.ReactNode
  trailing?: React.ReactNode
  indent?: number
  isDragging?: boolean
  dropPosition?: 'before' | 'after' | 'inside' | null
  className?: string
  rowRef?: React.Ref<HTMLDivElement>
  dndProps?: Record<string, unknown>
  selectionStyle?: 'accent' | 'neutral'
}

export const TreeRow = memo(function TreeRow({
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
  badges,
  trailing,
  indent,
  isDragging,
  dropPosition,
  className,
  rowRef,
  dndProps,
  selectionStyle = 'accent',
}: TreeRowProps) {
  const internalRef = useRef<HTMLDivElement>(null)

  // Scroll into view when selected
  useEffect(() => {
    if (!isSelected) return
    const el = internalRef.current
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
        style={{ marginLeft: indent ?? (depth * 16 + 16) }}
      />
    )
  } else if (dropPosition === 'after') {
    dropIndicator = (
      <div
        className="absolute left-0 right-0 bottom-0 h-[2px] bg-accent z-10 pointer-events-none"
        style={{ marginLeft: indent ?? (depth * 16 + 16) }}
      />
    )
  }

  // Chevron — absolute positioned, visible on hover (always visible when collapsed)
  let chevronEl: React.ReactNode = null
  if (chevron === 'expanded' || chevron === 'collapsed') {
    const isExpanded = chevron === 'expanded'
    chevronEl = (
      <ChevronRight
        size={12}
        className={`absolute top-1/2 -translate-y-1/2 fg-icon-subtle cursor-pointer select-none opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto ${isExpanded ? 'rotate-90' : ''}`}
        style={{ left: depth * 16 + 4 }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation()
          onChevronClick?.()
        }}
      />
    )
  }

  return (
    <div className="relative" style={isDragging ? { opacity: 0.3 } : undefined}>
      {dropIndicator}
      <div
        ref={(el: HTMLDivElement | null) => {
          internalRef.current = el
          if (typeof rowRef === 'function') rowRef(el)
          else if (rowRef) (rowRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        {...(dndProps ?? {})}
        className={`relative flex items-center gap-1.5 py-1 cursor-default group ${
          isSelected
            ? `${selectionStyle === 'neutral' ? 'tree-node-selected-neutral' : isMulti ? 'tree-node-multi-selected' : 'tree-node-selected'} fg-default`
            : dropPosition === 'inside'
              ? 'bg-[var(--color-accent)]/10 outline outline-1 outline-[var(--color-accent)]/40'
              : 'hover:bg-subtle fg-muted hover:fg-default'
        } ${className ?? ''}`}
        style={{ paddingLeft: indent ?? (depth * 16 + 16), paddingRight: 16 }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {chevronEl}

        {/* Type icon — fixed width slot */}
        {icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{icon}</span>}

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
          <span className={`flex-1 h-5 flex items-center gap-2 text-[12px] truncate ${nameClassName ?? ''}`}>
            <span className="truncate">{name}</span>
            {badges}
          </span>
        )}

        {/* Trailing slot (visibility toggle, checkmark, etc.) */}
        {trailing}
      </div>
    </div>
  )
})
