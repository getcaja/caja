import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { ChevronDown, ImageIcon } from 'lucide-react'
import type { Frame, Spacing } from '../../types/frame'
import { frameToClasses } from '../../utils/frameToClasses'
import { useFrameStore } from '../../store/frameStore'
import './FrameRenderer.css'

interface FrameRendererProps {
  frame: Frame
  /** When true, use min-height instead of height so root grows with content */
  rootMinHeight?: boolean
}

const LABEL_MIN_SIZE = 14

function hasSpacing(s: Spacing) {
  return s.top > 0 || s.right > 0 || s.bottom > 0 || s.left > 0
}

function PadLabel({ value, axis }: { value: number; axis: 'h' | 'v' }) {
  if ((axis === 'v' && value < LABEL_MIN_SIZE) || (axis === 'h' && value < LABEL_MIN_SIZE)) return null
  return <span className="overlay-label">{value}</span>
}

function SpacingOverlay({ padding, margin, showValues }: { padding: Spacing; margin: Spacing; showValues: boolean }) {
  const showPad = hasSpacing(padding)
  const showMar = hasSpacing(margin)
  if (!showPad && !showMar) return null

  return (
    <>
      {/* Padding strips — picture-frame: top/bottom full width, left/right fill between */}
      {padding.top > 0 && (
        <div className="overlay-strip overlay-pad" style={{ top: 0, left: 0, right: 0, height: padding.top }}>
          {showValues && <PadLabel value={padding.top} axis="v" />}
        </div>
      )}
      {padding.bottom > 0 && (
        <div className="overlay-strip overlay-pad" style={{ bottom: 0, left: 0, right: 0, height: padding.bottom }}>
          {showValues && <PadLabel value={padding.bottom} axis="v" />}
        </div>
      )}
      {padding.left > 0 && (
        <div className="overlay-strip overlay-pad" style={{ top: padding.top, bottom: padding.bottom, left: 0, width: padding.left }}>
          {showValues && <PadLabel value={padding.left} axis="h" />}
        </div>
      )}
      {padding.right > 0 && (
        <div className="overlay-strip overlay-pad" style={{ top: padding.top, bottom: padding.bottom, right: 0, width: padding.right }}>
          {showValues && <PadLabel value={padding.right} axis="h" />}
        </div>
      )}

      {/* Margin strips — top/bottom include corners, left/right fill middle */}
      {margin.top > 0 && (
        <div className="overlay-strip overlay-margin" style={{ top: -margin.top, left: -margin.left, right: -margin.right, height: margin.top }} />
      )}
      {margin.bottom > 0 && (
        <div className="overlay-strip overlay-margin" style={{ bottom: -margin.bottom, left: -margin.left, right: -margin.right, height: margin.bottom }} />
      )}
      {margin.left > 0 && (
        <div className="overlay-strip overlay-margin" style={{ top: 0, bottom: 0, left: -margin.left, width: margin.left }} />
      )}
      {margin.right > 0 && (
        <div className="overlay-strip overlay-margin" style={{ top: 0, bottom: 0, right: -margin.right, width: margin.right }} />
      )}
    </>
  )
}

interface GapStrip {
  left: number
  top: number
  width: number
  height: number
}

function GapOverlay({ containerRef, gap, showValues }: {
  containerRef: React.RefObject<HTMLDivElement | null>
  gap: number
  showValues: boolean
}) {
  const [strips, setStrips] = useState<GapStrip[]>([])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || gap <= 0) {
      setStrips(prev => prev.length === 0 ? prev : [])
      return
    }

    // Only measure actual frame children, not overlay elements
    const children = Array.from(el.children).filter(
      child => (child as HTMLElement).hasAttribute('data-frame-id')
    )
    if (children.length < 2) {
      setStrips(prev => prev.length === 0 ? prev : [])
      return
    }

    const cr = el.getBoundingClientRect()
    const result: GapStrip[] = []

    for (let i = 0; i < children.length - 1; i++) {
      const a = children[i].getBoundingClientRect()
      const b = children[i + 1].getBoundingClientRect()

      // Horizontal gap (items side by side)
      if (b.left > a.right + 0.5) {
        result.push({
          left: a.right - cr.left,
          top: Math.min(a.top, b.top) - cr.top,
          width: b.left - a.right,
          height: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top),
        })
      }

      // Vertical gap (next row or column items)
      if (b.top > a.bottom + 0.5) {
        result.push({
          left: 0,
          top: a.bottom - cr.top,
          width: cr.width,
          height: b.top - a.bottom,
        })
      }
    }

    setStrips(prev => {
      if (prev.length !== result.length) return result
      const same = prev.every((p, i) =>
        Math.abs(p.left - result[i].left) < 0.5 &&
        Math.abs(p.top - result[i].top) < 0.5 &&
        Math.abs(p.width - result[i].width) < 0.5 &&
        Math.abs(p.height - result[i].height) < 0.5
      )
      return same ? prev : result
    })
  })

  if (strips.length === 0) return null

  return (
    <>
      {strips.map((s, i) => (
        <div
          key={i}
          className="overlay-strip overlay-gap"
          style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
        >
          {showValues && s.width >= LABEL_MIN_SIZE && s.height >= LABEL_MIN_SIZE && (
            <span className="overlay-label is-gap">{gap}</span>
          )}
        </div>
      ))}
    </>
  )
}

export function FrameRenderer({ frame, rootMinHeight }: FrameRendererProps) {
  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const showSpacingOverlays = useFrameStore((s) => s.showSpacingOverlays)
  const showOverlayValues = useFrameStore((s) => s.showOverlayValues)

  const [editingText, setEditingText] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isSelected = selectedId === frame.id
  const isHovered = hoveredId === frame.id && !isSelected
  const isBox = frame.type === 'box'
  const isText = frame.type === 'text'
  const isImage = frame.type === 'image'
  const isButton = frame.type === 'button'
  const isInput = frame.type === 'input'
  const isTextarea = frame.type === 'textarea'
  const isSelect = frame.type === 'select'
  const hasFixedSize = frame.width.mode === 'fixed' || frame.height.mode === 'fixed'
  const isEmpty = isBox && frame.children.length === 0 && !hasFixedSize && !frame.bg

  // Tailwind classes (source of truth for export & display)
  const tailwind = frameToClasses(frame)

  // Compose editor state classes
  const stateClasses = [
    'frame-node',
    isHovered && 'is-hovered',
    isEmpty && 'is-empty',
    editingText && 'is-editing',
    rootMinHeight && frame.height.mode === 'fill' && 'is-root-fill',
  ].filter(Boolean).join(' ')

  useEffect(() => {
    if (editingText && textRef.current) {
      textRef.current.focus()
      const range = document.createRange()
      range.selectNodeContents(textRef.current)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [editingText])

  useEffect(() => {
    if (!isSelected && editingText) {
      setEditingText(false)
    }
  }, [isSelected, editingText])

  const commitText = () => {
    if (textRef.current && isText) {
      const newContent = textRef.current.textContent || ''
      updateFrame(frame.id, { content: newContent })
    }
    setEditingText(false)
  }

  return (
    <div
      ref={containerRef}
      data-frame-id={frame.id}
      className={`${tailwind} ${stateClasses}`}
      onClick={(e) => {
        e.stopPropagation()
        if (!editingText) select(frame.id)
      }}
      onDoubleClick={(e) => {
        if (isText) {
          e.stopPropagation()
          setEditingText(true)
        }
      }}
      onMouseEnter={(e) => {
        e.stopPropagation()
        hover(frame.id)
      }}
      onMouseLeave={() => hover(null)}
    >
      {isSelected && <div className="frame-selection" />}
      {isSelected && showSpacingOverlays && (
        <SpacingOverlay padding={frame.padding} margin={frame.margin} showValues={showOverlayValues} />
      )}
      {isSelected && showSpacingOverlays && isBox && frame.gap > 0 && (
        <GapOverlay containerRef={containerRef} gap={frame.gap} showValues={showOverlayValues} />
      )}

      {isText && (
        editingText ? (
          <div
            ref={textRef}
            className="frame-text-editing"
            contentEditable
            suppressContentEditableWarning
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                commitText()
              }
            }}
          >
            {frame.content}
          </div>
        ) : (
          frame.content
        )
      )}
      {isImage && (
        frame.src ? (
          <img
            src={frame.src}
            alt={frame.alt}
            className={`frame-img ${frameToClasses(frame)}`}
            draggable={false}
          />
        ) : (
          <div className="frame-img-placeholder w-full h-full flex items-center justify-center bg-surface-2/50 text-text-muted">
            <ImageIcon size={24} />
          </div>
        )
      )}
      {isButton && (
        <span className="frame-btn-label">{frame.label}</span>
      )}
      {isInput && (
        <input
          className="frame-form-control"
          type={frame.inputType}
          placeholder={frame.placeholder}
          disabled={frame.disabled}
          readOnly
        />
      )}
      {isTextarea && (
        <textarea
          className="frame-form-control"
          placeholder={frame.placeholder}
          rows={frame.rows}
          disabled={frame.disabled}
          readOnly
        />
      )}
      {isSelect && (
        <>
          <select className="frame-form-control" disabled={frame.disabled}>
            {frame.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="frame-select-chevron" />
        </>
      )}
      {isBox && frame.children.map((child) => (
        <FrameRenderer key={child.id} frame={child} />
      ))}
    </div>
  )
}
