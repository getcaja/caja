import { useState, useRef, useEffect, useLayoutEffect, useCallback, useSyncExternalStore, Fragment } from 'react'
import { ImageIcon } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { frameToClasses } from '../../utils/frameToClasses'
import { toContainerQueries } from '../../utils/responsiveClasses'
import { useFrameStore, isRootId, findInTree } from '../../store/frameStore'
import { resolveCanvasDrop, getFrameDepth } from '../../utils/canvasDrop'
import { resolveRenderSrc, subscribeAssets, getAssetSnapshot } from '../../lib/assetOps'

import './FrameRenderer.css'

// Module-level flag: skip the next click after a drag completes
let _skipNextClick = false

interface FrameRendererProps {
  frame: Frame
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
    case 'button': return frame.href ? 'a' : 'button'
    case 'image': return frame.src ? 'img' : 'div'
    case 'input': return 'input'
    case 'textarea': return 'textarea'
    case 'select': return 'select'
  }
}

export function FrameRenderer({ frame: rawFrame }: FrameRendererProps) {
  const activeBreakpoint = useFrameStore((s) => s.activeBreakpoint)
  const getEffectiveFrame = useFrameStore((s) => s.getEffectiveFrame)

  // Merge responsive overrides for the active breakpoint so the canvas
  // renders the correct visual at each breakpoint without CSS container queries.
  // Subscribing to activeBreakpoint ensures re-render when breakpoint changes.
  const frame = activeBreakpoint === 'base' ? rawFrame : getEffectiveFrame(rawFrame)

  // Re-render when blob cache is updated (e.g. after restoreAllAssets on app load)
  useSyncExternalStore(subscribeAssets, getAssetSnapshot)

  const selectedId = useFrameStore((s) => s.selectedId)
  const hoveredId = useFrameStore((s) => s.hoveredId)
  const select = useFrameStore((s) => s.select)
  const hover = useFrameStore((s) => s.hover)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const expandToFrame = useFrameStore((s) => s.expandToFrame)
  const previewMode = useFrameStore((s) => s.previewMode)
  const canvasTool = useFrameStore((s) => s.canvasTool)
  const pendingTextEdit = useFrameStore((s) => s.pendingTextEdit)
  const canvasDragId = useFrameStore((s) => s.canvasDragId)
  const isMcpHighlighted = useFrameStore((s) => s.mcpHighlightIds.has(frame.id))

  const [editingText, setEditingText] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const clickPosRef = useRef<{ x: number; y: number } | null>(null)
  const pendingInsertRef = useRef(false)
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
  // A childless box that would collapse to 0×0 without min-size assist
  const hasVisualPresence = isBox && (
    frame.width.mode === 'fixed' || frame.height.mode === 'fixed'
    || frame.width.mode === 'fill' || frame.height.mode === 'fill'
    || frame.bg.value || frame.bgImage
    || frame.minHeight.value > 0 || frame.minWidth.value > 0
  )
  const isEmpty = isBox && frame.children.length === 0 && !hasVisualPresence
  const isDragged = canvasDragId === frame.id

  // Tailwind classes — effective frame already has overrides merged,
  // so base classes reflect the active breakpoint. toContainerQueries
  // only needed for any user-added responsive classes in tailwindClasses.
  const tailwind = toContainerQueries(frameToClasses(frame))

  // In preview mode, infer cursor from semantic tag
  const previewCursor = previewMode && 'tag' in frame && (frame.tag === 'a' || frame.tag === 'button' || frame.type === 'button')
    ? 'cursor-pointer' : ''

  // Editor state classes (selection/hover via CSS outline, no layout impact)
  const stateClasses = [
    isSelected && 'is-selected',
    isHovered && 'is-hovered',
    !previewMode && isEmpty && !isRoot && 'is-empty',
    isDragged && 'is-line-drop',
    isMcpHighlighted && 'mcp-highlight',
    !previewMode && (editingText ? 'cursor-text' : canvasTool === 'text' ? (isText ? 'cursor-text' : 'cursor-crosshair') : canvasTool === 'frame' ? 'cursor-crosshair' : 'cursor-default'),
    previewCursor,
  ].filter(Boolean).join(' ')

  // Focus immediately (useLayoutEffect = before paint), then position caret
  // after browser has laid out the new contentEditable span (rAF = after paint).
  useLayoutEffect(() => {
    if (editingText && textRef.current) {
      const el = textRef.current
      el.focus()
      const pos = clickPosRef.current
      if (pos) {
        clickPosRef.current = null
        requestAnimationFrame(() => {
          const doc = el.ownerDocument
          const range = doc.caretRangeFromPoint(pos.x, pos.y)
          if (range) {
            const sel = doc.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(range)
          }
        })
      }
    }
  }, [editingText])

  useEffect(() => {
    if (!isSelected && editingText) {
      setEditingText(false)
    }
  }, [isSelected, editingText])

  // Auto-enter edit mode for newly inserted text (text tool)
  useEffect(() => {
    if (pendingTextEdit === frame.id && isText && isSelected) {
      pendingInsertRef.current = true
      setEditingText(true)
      useFrameStore.getState().clearPendingTextEdit()
    }
  }, [pendingTextEdit, frame.id, isText, isSelected])

  const commitText = () => {
    if (textRef.current && isText) {
      const newContent = textRef.current.textContent || ''
      // If this was a pending insert and the user left it empty, remove the frame
      if (pendingInsertRef.current && !newContent.trim()) {
        pendingInsertRef.current = false
        setEditingText(false)
        useFrameStore.getState().removeFrame(frame.id)
        return
      }
      pendingInsertRef.current = false
      updateFrame(frame.id, { content: newContent })
    }
    setEditingText(false)
  }

  // Click+drag to move elements — pointer-capture system with line mode + Cmd nesting
  const onDragPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const pointerId = e.pointerId
    const captureTarget = e.target as HTMLElement
    const doc = captureTarget.ownerDocument
    let dragging = false
    let lastTarget: { parentId: string; index: number } | null = null
    let maxDropDepth: number | null = null
    let cmdHeld = false
    let lastCx = 0
    let lastCy = 0
    let resolveRaf = 0

    const cleanup = (commit: boolean) => {
      cancelAnimationFrame(resolveRaf)
      try { captureTarget.releasePointerCapture(pointerId) } catch { /* expected: browser may have already released capture */ }
      if (dragging) {
        const s = useFrameStore.getState()
        if (commit) {
          // Synchronous resolve at final pointer position — avoids stale rAF state
          const result = resolveCanvasDrop(doc, lastCx, lastCy, frame.id, s.root, cmdHeld ? null : maxDropDepth)
          if (result) {
            const { parentId, index: visualIdx } = result
            // Visual → logical: moveFrame extracts first, then inserts at index
            const parentFrame = findInTree(s.root, parentId)
            let idx = visualIdx
            if (parentFrame?.type === 'box') {
              const dragPos = parentFrame.children.findIndex(c => c.id === frame.id)
              if (dragPos >= 0 && visualIdx > dragPos) idx--
            }
            s.moveFrame(frame.id, parentId, idx)
          }
        }
        s.setCanvasDragOver(null)
        s.setCanvasDrag(null)
        requestAnimationFrame(() => { _skipNextClick = false })
      }
      doc.removeEventListener('pointermove', onMove)
      doc.removeEventListener('pointerup', onUp)
      doc.removeEventListener('keydown', onKeyDown)
      doc.removeEventListener('keyup', onKeyUp)
    }

    const resolveAndApply = (cx: number, cy: number) => {
      const s = useFrameStore.getState()
      const next = resolveCanvasDrop(doc, cx, cy, frame.id, s.root, cmdHeld ? null : maxDropDepth)

      if (lastTarget && next && lastTarget.parentId === next.parentId && lastTarget.index === next.index) return
      if (!lastTarget && !next) return
      lastTarget = next

      s.setCanvasDragOver(next)
    }

    const onMove = (ev: PointerEvent) => {
      if (!dragging && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) {
        dragging = true
        _skipNextClick = true
        captureTarget.setPointerCapture(pointerId)
        const srcEl = doc.querySelector(`[data-frame-id="${frame.id}"]`) as HTMLElement | null
        if (srcEl) maxDropDepth = getFrameDepth(srcEl) - 1
        const s = useFrameStore.getState()
        s.expandToFrame(frame.id)
        s.select(frame.id)
        s.setCanvasDrag(frame.id)
      }
      if (dragging) {
        lastCx = ev.clientX
        lastCy = ev.clientY
        cancelAnimationFrame(resolveRaf)
        resolveRaf = requestAnimationFrame(() => resolveAndApply(lastCx, lastCy))
      }
    }

    const onUp = () => cleanup(true)

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { cleanup(false); return }
      if (ev.key === 'Meta' && !cmdHeld && dragging) {
        cmdHeld = true
        lastTarget = null
        resolveAndApply(lastCx, lastCy)
      }
    }

    const onKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'Meta' && cmdHeld && dragging) {
        cmdHeld = false
        lastTarget = null
        resolveAndApply(lastCx, lastCy)
      }
    }

    doc.addEventListener('pointermove', onMove)
    doc.addEventListener('pointerup', onUp)
    doc.addEventListener('keydown', onKeyDown)
    doc.addEventListener('keyup', onKeyUp)
  }, [frame.id])

  // Hidden frames — checked after all hooks to comply with React rules.
  // May change per breakpoint via getEffectiveFrame.
  if (frame.hidden) return null

  // Editor event handlers
  const editorHandlers = !previewMode ? {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      if (_skipNextClick) { _skipNextClick = false; return }

      // Frame tool: click on box → insert frame child; click on non-box → insert in root
      if (canvasTool === 'frame') {
        const store = useFrameStore.getState()
        const parentId = isBox ? frame.id : store.root.id
        store.addChild(parentId, 'box')
        return
      }

      // Text tool: click on existing text → edit it; click on box → insert new text child
      if (canvasTool === 'text') {
        if (isText) {
          select(frame.id)
          clickPosRef.current = { x: e.clientX, y: e.clientY }
          setEditingText(true)
        } else {
          const store = useFrameStore.getState()
          const parentId = isBox ? frame.id : store.root.id
          store.addChild(parentId, 'text', { content: '' })
          const newId = useFrameStore.getState().selectedId
          if (newId) useFrameStore.setState({ pendingTextEdit: newId })
        }
        return
      }

      // Triple-click: select all text when editing
      if (editingText && e.detail >= 3 && textRef.current) {
        const doc = textRef.current.ownerDocument
        const range = doc.createRange()
        range.selectNodeContents(textRef.current)
        const sel = doc.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
        return
      }
      const frameHref = (isText && frame.tag === 'a' && frame.href) || (isButton && frame.href)
      if (e.metaKey && frameHref) {
        const { pages, setActivePage } = useFrameStore.getState()
        const targetPage = pages.find((p) => p.route === frameHref)
        if (targetPage) {
          setActivePage(targetPage.id)
          return
        }
      }
      if (!editingText) {
        expandToFrame(frame.id)
        if (e.shiftKey) {
          useFrameStore.getState().selectRange(frame.id)
        } else if (e.metaKey) {
          useFrameStore.getState().selectMulti(frame.id)
        } else {
          select(frame.id)
        }
      }
    },
    onMouseDown: isText && !editingText ? (e: React.MouseEvent) => {
      // Prevent browser's native word selection on double-click (visual flash)
      if (e.detail >= 2) e.preventDefault()
    } : undefined,
    onDoubleClick: isText ? (e: React.MouseEvent) => {
      e.stopPropagation()
      clickPosRef.current = { x: e.clientX, y: e.clientY }
      setEditingText(true)
    } : undefined,
    onPointerDown: !isRoot && !editingText ? onDragPointerDown : undefined,
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

        src={isImage ? resolveRenderSrc(frame.src) : ''}
        alt={isImage ? frame.alt : ''}
        draggable={false}
        {...editorHandlers}
        {...(!previewMode ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {})}
      />
    )
  }

  if (frame.type === 'input') {
    const it = frame.inputType
    return (
      <input
        data-frame-id={frame.id}
        className={`${tailwind} ${stateClasses}`}

        type={it === 'range' ? 'range' : it}
        {...(it !== 'checkbox' && it !== 'radio' && it !== 'range' ? { placeholder: frame.placeholder } : {})}
        {...(it === 'checkbox' || it === 'radio' ? { defaultChecked: frame.checked } : {})}
        {...(it === 'radio' && frame.inputName ? { name: frame.inputName } : {})}
        {...(it === 'radio' && frame.inputValue ? { value: frame.inputValue } : {})}
        {...(it === 'range' ? { min: frame.min, max: frame.max, step: frame.step, defaultValue: frame.defaultValue } : {})}
        disabled={frame.disabled}
        {...(it !== 'checkbox' && it !== 'radio' && it !== 'range' ? { readOnly: !previewMode } : {})}
        {...editorHandlers}
        {...(!previewMode ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {})}
      />
    )
  }

  // --- Textarea (void-like in React — no children) ---
  if (isTextarea) {
    return (
      <textarea
        data-frame-id={frame.id}
        className={`${tailwind} ${stateClasses}`}
        placeholder={frame.placeholder}
        rows={frame.rows}
        disabled={frame.disabled}
        readOnly={!previewMode}
        {...editorHandlers}
        {...(!previewMode ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {})}
      />
    )
  }

  // --- Inline style for bgImage (spaces in paths break Tailwind arbitrary values) ---
  const bgStyle = frame.bgImage
    ? { backgroundImage: `url('${resolveRenderSrc(frame.bgImage)}')` }
    : undefined

  // --- Non-void elements ---
  return (
    <Tag
      data-frame-id={frame.id}
      className={`${tailwind} ${stateClasses}`}
      style={bgStyle}
      {...editorHandlers}
      {...(((isText && frame.tag === 'a') || (isButton && frame.href)) && frame.href
        ? previewMode
          ? { href: frame.href }
          : { 'data-navigable': true }
        : {})}
      {...(isSelect && !previewMode ? {
        onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
      } : {})}
    >
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
                useFrameStore.getState().setCanvasTool('pointer')
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
      {isBox && frame.children.map((child) => (
        <FrameRenderer key={child.id} frame={child} />
      ))}
    </Tag>
  )
}
