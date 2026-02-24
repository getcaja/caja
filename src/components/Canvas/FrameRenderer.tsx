import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { ImageIcon, GripVertical } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { frameToClasses } from '../../utils/frameToClasses'
import { useFrameStore, isRootId } from '../../store/frameStore'
import { resolveCanvasDrop } from '../../utils/canvasDrop'
import './FrameRenderer.css'

interface FrameRendererProps {
  frame: Frame
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
 *  All types use their real semantic tag — same as export.
 *  Exception: body → div (React 19 singleton), empty image → div (placeholder). */
export function resolveTag(frame: Frame): keyof React.JSX.IntrinsicElements {
  switch (frame.type) {
    case 'box': {
      const tag = frame.tag || 'div'
      return (tag === 'body' ? 'div' : tag) as keyof React.JSX.IntrinsicElements
    }
    case 'text': return (frame.tag || 'p') as keyof React.JSX.IntrinsicElements
    case 'button': return 'button'
    case 'image': return frame.src ? 'img' : 'div'
    case 'input': return 'input'
    case 'textarea': return 'textarea'
    case 'select': return 'select'
  }
}

export function FrameRenderer({ frame }: FrameRendererProps) {
  if (frame.hidden) return null

  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const expandToFrame = useFrameStore((s) => s.expandToFrame)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const canvasDragOver = useFrameStore((s) => s.canvasDragOver)

  const [editingText, setEditingText] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const Tag = resolveTag(frame)

  const isSelected = !previewMode && selectedId === frame.id
  const isHovered = !previewMode && hoveredId === frame.id && selectedId !== frame.id
  const isRoot = isRootId(frame.id)
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
  const isDropTarget = isBox && canvasDragOver?.parentId === frame.id

  // Elements that can host arbitrary children (overlays, drag handle)
  const canHostChildren = isBox || isText || isButton || (isImage && !frame.src)
  const showHandle = isSelected && !isRoot && !editingText && !previewMode && canHostChildren

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

  // Tailwind classes (source of truth — same in editor and export)
  const tailwind = frameToClasses(frame)

  // In preview mode, infer cursor from semantic tag
  const previewCursor = previewMode && 'tag' in frame && (frame.tag === 'a' || frame.tag === 'button' || frame.type === 'button')
    ? 'cursor-pointer' : ''

  // Editor state classes (selection/hover via CSS outline, no layout impact)
  const stateClasses = [
    isRoot && 'min-h-screen',
    isSelected && 'is-selected',
    isHovered && 'is-hovered',
    !previewMode && isEmpty && !isRoot && 'is-empty',
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

  // Editor event handlers
  const editorHandlers = !previewMode ? {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      if (e.metaKey && isText && frame.tag === 'a' && frame.href) {
        const { pages, setActivePage } = useFrameStore.getState()
        const targetPage = pages.find((p) => p.route === frame.href)
        if (targetPage) {
          setActivePage(targetPage.id)
          return
        }
      }
      if (!editingText) {
        expandToFrame(frame.id)
        select(frame.id)
      }
    },
    onDoubleClick: isText ? (e: React.MouseEvent) => {
      e.stopPropagation()
      setEditingText(true)
    } : undefined,
    onMouseOver: (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!useFrameStore.getState().canvasDragId) hover(frame.id)
    },
  } : {}

  // --- Void elements (img, input) — can't have React children ---
  if (Tag === 'img') {
    return (
      <img
        data-frame-id={frame.id}
        className={`${tailwind} ${stateClasses}`}
        src={isImage ? frame.src : ''}
        alt={isImage ? frame.alt : ''}
        draggable={false}
        {...editorHandlers}
        {...(!previewMode ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {})}
      />
    )
  }

  if (Tag === 'input') {
    return (
      <input
        data-frame-id={frame.id}
        className={`${tailwind} ${stateClasses}`}
        type={isInput ? frame.inputType : 'text'}
        placeholder={isInput ? frame.placeholder : ''}
        disabled={isInput ? frame.disabled : false}
        readOnly={!previewMode}
        {...editorHandlers}
        {...(!previewMode ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {})}
      />
    )
  }

  // --- Non-void elements ---
  return (
    <Tag
      data-frame-id={frame.id}
      className={`${tailwind} ${stateClasses}`}
      {...editorHandlers}
      {...(isText && frame.tag === 'a' && frame.href
        ? previewMode
          ? { href: frame.href }
          : { 'data-navigable': true }
        : {})}
      {...(isTextarea ? {
        placeholder: frame.placeholder,
        rows: frame.rows,
        disabled: frame.disabled,
        readOnly: !previewMode,
      } : {})}
      {...((isTextarea || isSelect) && !previewMode ? {
        onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      } : {})}
    >
      {/* Drag handle — only on elements that can host children */}
      {showHandle && (
        <span className="frame-drag-handle" onPointerDown={onHandlePointerDown}>
          <GripVertical size={12} />
        </span>
      )}

      {/* Text content */}
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

      {/* Image placeholder (no src — editor authoring state, renders as div) */}
      {isImage && !frame.src && (
        <span className="frame-img-placeholder w-full h-full flex items-center justify-center text-text-muted/30">
          <ImageIcon size={16} />
        </span>
      )}

      {/* Button content */}
      {isButton && renderMultiline(frame.content)}

      {/* Select options */}
      {isSelect && frame.options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}

      {/* Box children */}
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
