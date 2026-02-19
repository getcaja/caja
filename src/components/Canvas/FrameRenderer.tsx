import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { ImageIcon } from 'lucide-react'
import type { Frame, Spacing } from '../../types/frame'
import { frameToClasses } from '../../utils/frameToClasses'
import { frameToPreviewStyle } from '../../utils/frameToPreviewStyle'
import { useFrameStore } from '../../store/frameStore'

interface FrameRendererProps {
  frame: Frame
  /** When true, use min-height instead of height so root grows with content */
  rootMinHeight?: boolean
}

const HIGHLIGHT_COLOR = '#0D99FF'
const HIGHLIGHT_HOVER = 'rgba(13, 153, 255, 0.4)'
const PAD_COLOR = 'rgba(147, 196, 125, 0.55)'
const MARGIN_COLOR = 'rgba(246, 178, 107, 0.66)'
const GAP_FILL = 'rgba(127, 32, 210, 0.3)'
const GAP_HATCH = 'rgba(127, 32, 210, 0.8)'
const LABEL_COLOR = 'rgba(0, 0, 0, 0.7)'
const LABEL_MIN_SIZE = 14

function hasSpacing(s: Spacing) {
  return s.top > 0 || s.right > 0 || s.bottom > 0 || s.left > 0
}

const stripBase: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'monospace',
  color: LABEL_COLOR,
  lineHeight: 1,
  userSelect: 'none',
}

function PadLabel({ value, axis }: { value: number; axis: 'h' | 'v' }) {
  if ((axis === 'v' && value < LABEL_MIN_SIZE) || (axis === 'h' && value < LABEL_MIN_SIZE)) return null
  return <span style={labelStyle}>{value}</span>
}

function SpacingOverlay({ padding, margin, showValues }: { padding: Spacing; margin: Spacing; showValues: boolean }) {
  const showPad = hasSpacing(padding)
  const showMar = hasSpacing(margin)
  if (!showPad && !showMar) return null

  return (
    <>
      {/* Padding strips — picture-frame: top/bottom full width, left/right fill between */}
      {padding.top > 0 && (
        <div style={{ ...stripBase, top: 0, left: 0, right: 0, height: padding.top, background: PAD_COLOR }}>
          {showValues && <PadLabel value={padding.top} axis="v" />}
        </div>
      )}
      {padding.bottom > 0 && (
        <div style={{ ...stripBase, bottom: 0, left: 0, right: 0, height: padding.bottom, background: PAD_COLOR }}>
          {showValues && <PadLabel value={padding.bottom} axis="v" />}
        </div>
      )}
      {padding.left > 0 && (
        <div style={{ ...stripBase, top: padding.top, bottom: padding.bottom, left: 0, width: padding.left, background: PAD_COLOR }}>
          {showValues && <PadLabel value={padding.left} axis="h" />}
        </div>
      )}
      {padding.right > 0 && (
        <div style={{ ...stripBase, top: padding.top, bottom: padding.bottom, right: 0, width: padding.right, background: PAD_COLOR }}>
          {showValues && <PadLabel value={padding.right} axis="h" />}
        </div>
      )}

      {/* Margin strips — top/bottom include corners, left/right fill middle */}
      {margin.top > 0 && (
        <div style={{ ...stripBase, top: -margin.top, left: -margin.left, right: -margin.right, height: margin.top, background: MARGIN_COLOR }} />
      )}
      {margin.bottom > 0 && (
        <div style={{ ...stripBase, bottom: -margin.bottom, left: -margin.left, right: -margin.right, height: margin.bottom, background: MARGIN_COLOR }} />
      )}
      {margin.left > 0 && (
        <div style={{ ...stripBase, top: 0, bottom: 0, left: -margin.left, width: margin.left, background: MARGIN_COLOR }} />
      )}
      {margin.right > 0 && (
        <div style={{ ...stripBase, top: 0, bottom: 0, right: -margin.right, width: margin.right, background: MARGIN_COLOR }} />
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
          style={{
            ...stripBase,
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            background: `repeating-linear-gradient(-45deg, ${GAP_HATCH}, ${GAP_HATCH} 1px, transparent 1px, transparent 6px), ${GAP_FILL}`,
          }}
        >
          {showValues && s.width >= LABEL_MIN_SIZE && s.height >= LABEL_MIN_SIZE && (
            <span style={{ ...labelStyle, color: '#fff', textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>{gap}</span>
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
  const hasFixedSize = frame.width.mode === 'fixed' || frame.height.mode === 'fixed'
  const isEmpty = isBox && frame.children.length === 0 && !hasFixedSize && !frame.bg

  // Tailwind classes (source of truth for export & display)
  const classes = frameToClasses(frame)

  // Inline styles for canvas preview (dynamic values Tailwind can't generate at build time)
  const previewStyle = frameToPreviewStyle(frame)

  // Root frame: use min-height so it grows with content instead of clipping
  if (rootMinHeight && frame.height.mode === 'fill') {
    previewStyle.minHeight = '100%'
    previewStyle.height = 'auto'
  }

  // Editor-only styles (hover outline, empty state)
  const editorStyle: React.CSSProperties = {
    position: 'relative',
    outline: isSelected
      ? 'none'
      : isHovered
        ? `1px solid ${HIGHLIGHT_HOVER}`
        : isEmpty
          ? '1px dashed var(--color-surface-3)'
          : 'none',
    outlineOffset: '-1px',
    minHeight: isEmpty ? 40 : undefined,
    minWidth: isEmpty ? 40 : undefined,
    cursor: editingText ? 'text' : 'pointer',
  }

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
      className={classes}
      style={{ ...previewStyle, ...editorStyle }}
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
      {isSelected && (
        <div style={{ position: 'absolute', inset: 0, border: `2px solid ${HIGHLIGHT_COLOR}`, pointerEvents: 'none', zIndex: 10 }} />
      )}
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
            contentEditable
            suppressContentEditableWarning
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                commitText()
              }
            }}
            style={{ outline: 'none', minWidth: 1, position: 'relative', zIndex: 2 }}
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
            className={frameToClasses(frame)}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: frame.objectFit }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2/50 text-text-muted" style={{ minHeight: 40, minWidth: 40 }}>
            <ImageIcon size={24} />
          </div>
        )
      )}
      {isButton && (
        <span style={{ pointerEvents: 'none', userSelect: 'none' }}>{frame.label}</span>
      )}
      {isInput && (
        <input
          type={frame.inputType}
          placeholder={frame.placeholder}
          disabled={frame.disabled}
          readOnly
          style={{ pointerEvents: 'none', width: '100%', background: 'transparent', outline: 'none', fontSize: 'inherit', color: 'inherit' }}
        />
      )}
      {isBox && frame.children.map((child) => (
        <FrameRenderer key={child.id} frame={child} />
      ))}
    </div>
  )
}
