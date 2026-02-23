import { useState, useRef, useEffect, useLayoutEffect, useCallback, Fragment } from 'react'
import { ImageIcon, GripVertical, Code } from 'lucide-react'
import type { Frame, Spacing, DesignValue, BoxElement } from '../../types/frame'
import { frameToClasses } from '../../utils/frameToClasses'
import { useFrameStore, findInTree } from '../../store/frameStore'
import { useSnippetStore } from '../../store/snippetStore'
import { resolveCanvasDrop } from '../../utils/canvasDrop'
import './FrameRenderer.css'

interface FrameRendererProps {
  frame: Frame
}

const LABEL_MIN_SIZE = 14

function hasSpacing(s: Spacing) {
  return s.top.value > 0 || s.right.value > 0 || s.bottom.value > 0 || s.left.value > 0
}

function isAutoToken(dv: DesignValue<number>): boolean {
  return dv.mode === 'token' && dv.token === 'auto'
}

function hasMargin(s: Spacing) {
  return hasSpacing(s) || isAutoToken(s.top) || isAutoToken(s.right) || isAutoToken(s.bottom) || isAutoToken(s.left)
}

function PadLabel({ value, axis }: { value: number; axis: 'h' | 'v' }) {
  if ((axis === 'v' && value < LABEL_MIN_SIZE) || (axis === 'h' && value < LABEL_MIN_SIZE)) return null
  return <span className="overlay-label">{value}</span>
}

function SpacingOverlay({ padding, margin, showValues, elementRef }: {
  padding: Spacing; margin: Spacing; showValues: boolean
  elementRef: React.RefObject<HTMLElement | null>
}) {
  const showPad = hasSpacing(padding)
  const showMar = hasMargin(margin)

  // Measure computed auto margins from DOM (browser resolves `auto` to actual px)
  const [autoMargins, setAutoMargins] = useState({ top: 0, right: 0, bottom: 0, left: 0 })
  const hasAuto = isAutoToken(margin.top) || isAutoToken(margin.right) || isAutoToken(margin.bottom) || isAutoToken(margin.left)

  useLayoutEffect(() => {
    if (!hasAuto || !elementRef.current) return
    const el = elementRef.current
    const parent = el.parentElement
    if (!parent) return

    const elRect = el.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    const pcs = getComputedStyle(parent)
    const cs = getComputedStyle(el)

    // Cross-axis has no siblings → getBoundingClientRect is accurate
    // Main-axis has siblings → use getComputedStyle instead
    const isFlex = pcs.display.includes('flex')
    const isCol = isFlex && pcs.flexDirection.startsWith('column')
    const hIsCross = !isFlex || isCol // block or flex-col: horizontal is cross-axis

    // Parent content box edges
    const cl = parentRect.left + (parseFloat(pcs.borderLeftWidth) || 0) + (parseFloat(pcs.paddingLeft) || 0)
    const cr = parentRect.right - (parseFloat(pcs.borderRightWidth) || 0) - (parseFloat(pcs.paddingRight) || 0)
    const ct = parentRect.top + (parseFloat(pcs.borderTopWidth) || 0) + (parseFloat(pcs.paddingTop) || 0)
    const cb = parentRect.bottom - (parseFloat(pcs.borderBottomWidth) || 0) - (parseFloat(pcs.paddingBottom) || 0)

    const next = {
      top: Math.round(hIsCross ? (parseFloat(cs.marginTop) || 0) : Math.max(0, elRect.top - ct)),
      right: Math.round(hIsCross ? Math.max(0, cr - elRect.right) : (parseFloat(cs.marginRight) || 0)),
      bottom: Math.round(hIsCross ? (parseFloat(cs.marginBottom) || 0) : Math.max(0, cb - elRect.bottom)),
      left: Math.round(hIsCross ? Math.max(0, elRect.left - cl) : (parseFloat(cs.marginLeft) || 0)),
    }
    setAutoMargins(prev => {
      if (prev.top === next.top && prev.right === next.right && prev.bottom === next.bottom && prev.left === next.left) return prev
      return next
    })
  })

  if (!showPad && !showMar) return null

  const pt = padding.top.value
  const pr = padding.right.value
  const pb = padding.bottom.value
  const pl = padding.left.value
  const mt = isAutoToken(margin.top) ? autoMargins.top : margin.top.value
  const mr = isAutoToken(margin.right) ? autoMargins.right : margin.right.value
  const mb = isAutoToken(margin.bottom) ? autoMargins.bottom : margin.bottom.value
  const ml = isAutoToken(margin.left) ? autoMargins.left : margin.left.value

  return (
    <>
      {/* Padding strips — picture-frame: top/bottom full width, left/right fill between */}
      {pt > 0 && (
        <span className="overlay-strip overlay-pad" style={{ top: 0, left: 0, right: 0, height: pt }}>
          {showValues && <PadLabel value={pt} axis="v" />}
        </span>
      )}
      {pb > 0 && (
        <span className="overlay-strip overlay-pad" style={{ bottom: 0, left: 0, right: 0, height: pb }}>
          {showValues && <PadLabel value={pb} axis="v" />}
        </span>
      )}
      {pl > 0 && (
        <span className="overlay-strip overlay-pad" style={{ top: pt, bottom: pb, left: 0, width: pl }}>
          {showValues && <PadLabel value={pl} axis="h" />}
        </span>
      )}
      {pr > 0 && (
        <span className="overlay-strip overlay-pad" style={{ top: pt, bottom: pb, right: 0, width: pr }}>
          {showValues && <PadLabel value={pr} axis="h" />}
        </span>
      )}

      {/* Margin strips — top/bottom include corners, left/right fill middle */}
      {mt > 0 && (
        <span className="overlay-strip overlay-margin" style={{ top: -mt, left: -ml, right: -mr, height: mt }} />
      )}
      {mb > 0 && (
        <span className="overlay-strip overlay-margin" style={{ bottom: -mb, left: -ml, right: -mr, height: mb }} />
      )}
      {ml > 0 && (
        <span className="overlay-strip overlay-margin" style={{ top: 0, bottom: 0, left: -ml, width: ml }} />
      )}
      {mr > 0 && (
        <span className="overlay-strip overlay-margin" style={{ top: 0, bottom: 0, right: -mr, width: mr }} />
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
  containerRef: React.RefObject<HTMLElement | null>
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
        <span
          key={i}
          className="overlay-strip overlay-gap"
          style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
        >
          {showValues && s.width >= LABEL_MIN_SIZE && s.height >= LABEL_MIN_SIZE && (
            <span className="overlay-label is-gap">{gap}</span>
          )}
        </span>
      ))}
    </>
  )
}

function DropIndicator({ direction }: { direction: string }) {
  const isRow = direction === 'row' || direction === 'row-reverse'
  return <span className={`frame-drop-indicator ${isRow ? 'is-row' : 'is-column'}`} />
}

function renderMultiline(text: string) {
  if (!text.includes('\n')) return text
  const lines = text.split('\n')
  return lines.map((line, i) => (
    <Fragment key={i}>{line}{i < lines.length - 1 && <br />}</Fragment>
  ))
}

/** Resolve the HTML tag for the canvas element.
 *  React 19 treats <body> as a singleton — can't nest it inside the iframe's
 *  existing <body>. Use 'div' in the canvas; export still uses the real tag. */
function resolveTag(frame: Frame): keyof React.JSX.IntrinsicElements {
  switch (frame.type) {
    case 'box': {
      const tag = frame.tag || 'div'
      return (tag === 'body' ? 'div' : tag) as keyof React.JSX.IntrinsicElements
    }
    case 'text': return (frame.tag || 'p') as keyof React.JSX.IntrinsicElements
    case 'button': return 'button'
    // void/form elements need a wrapper for editor chrome (overlays, handles)
    default: return 'div'
  }
}

export function FrameRenderer({ frame }: FrameRendererProps) {
  // Hidden frames are not rendered in the canvas at all
  if (frame.hidden) return null

  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const expandToFrame = useFrameStore((s) => s.expandToFrame)
  const showSpacingOverlays = useFrameStore((s) => s.showSpacingOverlays)
  const showOverlayValues = useFrameStore((s) => s.showOverlayValues)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  const [editingText, setEditingText] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const Tag = resolveTag(frame)

  const isSelected = !previewMode && selectedId === frame.id
  const isHovered = !previewMode && hoveredId === frame.id && selectedId !== frame.id
  const isRoot = frame.id === '__root__'
  const isBox = frame.type === 'box'
  const isText = frame.type === 'text'
  const isImage = frame.type === 'image'
  const isButton = frame.type === 'button'
  const isInput = frame.type === 'input'
  const isTextarea = frame.type === 'textarea'
  const isSelect = frame.type === 'select'
  const hasFixedSize = frame.width.mode === 'fixed' || frame.height.mode === 'fixed'
  const isEmpty = isBox && frame.children.length === 0 && !hasFixedSize && !frame.bg.value
  const isDragged = canvasDragId === frame.id
  const showHandle = isSelected && !isRoot && !editingText && !previewMode
  const isDropTarget = isBox && canvasDragOver?.parentId === frame.id

  // --- Canvas drag handle ---
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const doc = e.currentTarget.ownerDocument
    useFrameStore.getState().setCanvasDrag(frame.id)

    const onMove = (ev: PointerEvent) => {
      const { root: currentRoot, setCanvasDragOver: setOver } = useFrameStore.getState()
      const result = resolveCanvasDrop(doc, ev.clientX, ev.clientY, frame.id, currentRoot)
      setOver(result)
    }

    const onUp = () => {
      const { canvasDragOver, moveFrame: move, setCanvasDrag: setDrag, setCanvasDragOver: setOver } = useFrameStore.getState()
      if (canvasDragOver) {
        move(frame.id, canvasDragOver.parentId, canvasDragOver.index)
      }
      setDrag(null)
      setOver(null)
      doc.removeEventListener('pointermove', onMove)
      doc.removeEventListener('pointerup', onUp)
    }

    doc.addEventListener('pointermove', onMove)
    doc.addEventListener('pointerup', onUp)
  }, [frame.id])

  // Tailwind classes (source of truth for export & display)
  const tailwind = frameToClasses(frame)

  // In preview mode, infer cursor from semantic tag
  const previewCursor = previewMode && 'tag' in frame && (frame.tag === 'a' || frame.tag === 'button' || frame.type === 'button')
    ? 'cursor-pointer' : ''

  // Compose editor state classes
  const stateClasses = [
    !previewMode && 'frame-node',
    !previewMode && isEmpty && 'is-empty',
    editingText && 'is-editing',
    isDragged && 'is-dragging',
    isDropTarget && 'is-drop-target',
    previewCursor,
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
    <Tag
      ref={containerRef}
      data-frame-id={frame.id}
      className={`${tailwind} ${stateClasses}`}
      {...(!previewMode ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation()
          if (!editingText) {
            expandToFrame(frame.id)
            select(frame.id)
          }
        },
        onDoubleClick: (e: React.MouseEvent) => {
          if (isText) {
            e.stopPropagation()
            setEditingText(true)
          }
        },
        onMouseOver: (e: React.MouseEvent) => {
          e.stopPropagation()
          if (!useFrameStore.getState().canvasDragId) hover(frame.id)
        },
      } : {})}
    >
      {isSelected && (
        <span className="frame-selection">
          {showHandle && (
            <>
              <span className="frame-drag-handle" onPointerDown={onHandlePointerDown}>
                <GripVertical size={12} />
              </span>
              <span
                className="frame-snippet-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  const store = useFrameStore.getState()
                  const f = findInTree(store.root, frame.id)
                  if (f) {
                    useSnippetStore.getState().saveSnippet(f.name || 'Snippet', [], f)
                    store.setTreePanelTab('snippets')
                  }
                }}
                title="Save as snippet"
              >
                <Code size={10} />
              </span>
            </>
          )}
        </span>
      )}
      {isHovered && <span className="frame-hover" />}
      {isSelected && showSpacingOverlays && (
        <SpacingOverlay padding={frame.padding} margin={frame.margin} showValues={showOverlayValues} elementRef={containerRef} />
      )}
      {isSelected && showSpacingOverlays && isBox && frame.gap.value > 0 && (
        <GapOverlay containerRef={containerRef} gap={frame.gap.value} showValues={showOverlayValues} />
      )}

      {isText && (
        editingText ? (
          <span
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
          </span>
        ) : (
          renderMultiline(frame.content)
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
          <span className="frame-img-placeholder w-full h-full flex items-center justify-center text-text-muted/30">
            <ImageIcon size={16} />
          </span>
        )
      )}
      {isButton && renderMultiline(frame.content)}
      {isInput && (
        <input
          className="frame-form-control"
          type={frame.inputType}
          placeholder={frame.placeholder}
          disabled={frame.disabled}
          readOnly={!previewMode}
        />
      )}
      {isTextarea && (
        <textarea
          className="frame-form-control"
          placeholder={frame.placeholder}
          rows={frame.rows}
          disabled={frame.disabled}
          readOnly={!previewMode}
        />
      )}
      {isSelect && (
        <select className="frame-form-control" disabled={!previewMode && frame.disabled}>
          {frame.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {isBox && frame.children.map((child, i) => (
        <Fragment key={child.id}>
          {isDropTarget && canvasDragOver.index === i && (
            <DropIndicator direction={frame.direction} />
          )}
          <FrameRenderer frame={child} />
        </Fragment>
      ))}
      {isBox && isDropTarget && canvasDragOver.index >= frame.children.length && (
        <DropIndicator direction={frame.direction} />
      )}
    </Tag>
  )
}
