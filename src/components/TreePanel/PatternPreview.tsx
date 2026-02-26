import { useEffect, useRef, useCallback, memo } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Fragment } from 'react'
import { X } from 'lucide-react'
import { TAILWIND_THEME, CANVAS_RESET_CSS } from '../Canvas/canvasStyles'
import { applyTheme, getActiveTheme } from '../../lib/theme'
import { frameToClasses } from '../../utils/frameToClasses'
import type { Frame } from '../../types/frame'

/** Stateless FrameRenderer — no store, no selection, no drag. Pure visual output. */
function StaticFrame({ frame, style }: { frame: Frame; style?: React.CSSProperties }) {
  if (frame.hidden) return null

  const classes = frameToClasses(frame)
  const isBox = frame.type === 'box'
  const isText = frame.type === 'text'
  const isImage = frame.type === 'image'
  const isButton = frame.type === 'button'
  const isSelect = frame.type === 'select'

  const renderMultiline = (text: string) => {
    if (!text.includes('\n')) return text
    return text.split('\n').map((line, i, arr) => (
      <Fragment key={i}>{line}{i < arr.length - 1 && <br />}</Fragment>
    ))
  }

  let Tag: keyof React.JSX.IntrinsicElements = 'div'
  switch (frame.type) {
    case 'box': Tag = (frame.tag === 'body' ? 'div' : frame.tag || 'div') as typeof Tag; break
    case 'text': Tag = (frame.tag || 'p') as typeof Tag; break
    case 'button': Tag = 'button'; break
    case 'image': Tag = frame.src ? 'img' : 'div'; break
    case 'input': Tag = 'input'; break
    case 'textarea': Tag = 'textarea'; break
    case 'select': Tag = 'select'; break
  }

  if (Tag === 'img') {
    return <img className={classes} src={isImage ? frame.src : ''} alt="" style={style} draggable={false} />
  }
  if (Tag === 'input') {
    const it = frame.type === 'input' ? frame.inputType : 'text'
    return <input className={classes} style={style} type={it} {...(it === 'range' ? { min: frame.type === 'input' ? frame.min : 0, max: frame.type === 'input' ? frame.max : 100 } : {})} placeholder={frame.type === 'input' ? frame.placeholder : ''} readOnly />
  }

  return (
    <Tag className={classes} style={style}>
      {isText && renderMultiline(frame.content)}
      {isButton && renderMultiline(frame.content)}
      {isSelect && frame.options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
      {isBox && frame.children.map((child) => (
        <StaticFrame key={child.id} frame={child} />
      ))}
    </Tag>
  )
}

/** Inline display styles — forces display via inline style (beats any CSS specificity). */
const INLINE_DISPLAYS = new Set(['inline-flex', 'inline-block', 'inline'])
function getRootStyle(frame: Frame): React.CSSProperties | undefined {
  if (INLINE_DISPLAYS.has(frame.display)) return { display: frame.display as any }
  return undefined
}

// Fixed layout — compact thumbnail
const IFRAME_W = 800
const VIS_W = 240
const VIS_H = 150
const SCALE = VIS_W / IFRAME_W // 0.3
const PAD = 10
const POPUP_W = VIS_W + PAD * 2
const POPUP_H_EST = 48 + VIS_H + 72 // header + preview + footer ≈ 270

const PREVIEW_CSS = `
html, body { height: auto !important; min-height: 0 !important; overflow: hidden !important; }
body { padding: 16px; background: #ffffff; }
::-webkit-scrollbar { display: none !important; }
* { pointer-events: none !important; }
`

export interface PatternPreviewProps {
  frame: Frame | null
  name: string
  sourceName: string
  anchorY: number
  panelRight: number
  onInsert: () => void
  onClose: () => void
  onPopupEnter: () => void
  onPopupLeave: () => void
}

export const PatternPreview = memo(function PatternPreview({
  frame, name, sourceName, anchorY, panelRight,
  onInsert, onClose, onPopupEnter, onPopupLeave,
}: PatternPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rootRef = useRef<Root | null>(null)
  const frameRef = useRef(frame)
  frameRef.current = frame
  const readyRef = useRef(false)

  // Bootstrap iframe ONCE
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write('<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>')
    doc.close()

    const theme = doc.createElement('style')
    theme.setAttribute('type', 'text/tailwindcss')
    theme.textContent = TAILWIND_THEME
    doc.head.appendChild(theme)

    applyTheme(getActiveTheme(), doc)

    const reset = doc.createElement('style')
    reset.textContent = CANVAS_RESET_CSS + PREVIEW_CSS
    doc.head.appendChild(reset)

    const script = doc.createElement('script')
    script.src = '/tailwindcss-browser.js'
    script.onload = () => {
      const mount = doc.getElementById('root')
      if (!mount) return
      const reactRoot = createRoot(mount)
      rootRef.current = reactRoot
      readyRef.current = true

      if (frameRef.current) {
        const f = frameRef.current
        reactRoot.render(
          <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <StaticFrame frame={f} style={getRootStyle(f)} />
          </div>
        )
      }
    }
    doc.head.appendChild(script)

    return () => {
      rootRef.current?.unmount()
      rootRef.current = null
      readyRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update content when frame changes
  const renderFrame = useCallback((f: Frame) => {
    if (!rootRef.current || !readyRef.current) return
    rootRef.current.render(
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <StaticFrame frame={f} style={getRootStyle(f)} />
      </div>
    )
  }, [])

  useEffect(() => {
    if (frame) renderFrame(frame)
  }, [frame, renderFrame])

  const visible = frame !== null
  const maxTop = window.innerHeight - POPUP_H_EST - 8
  const top = Math.max(8, Math.min(anchorY, maxTop))

  return (
    <div
      style={{
        position: 'fixed',
        left: panelRight + 8,
        top,
        width: POPUP_W,
        borderRadius: 8,
        background: 'var(--color-surface-1)',
        zIndex: 9999,
        display: visible ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      onMouseEnter={onPopupEnter}
      onMouseLeave={onPopupLeave}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: `${PAD}px ${PAD}px 0` }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: '16px' }}>Details</div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 1,
            lineHeight: '14px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {sourceName}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: 4,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Preview iframe */}
      <div style={{
        width: VIS_W,
        height: VIS_H,
        overflow: 'hidden',
        borderRadius: 6,
        margin: `8px ${PAD}px 0`,
        background: '#ffffff',
      }}>
        <iframe
          ref={iframeRef}
          title="Pattern preview"
          style={{
            width: IFRAME_W,
            height: VIS_H / SCALE,
            border: 'none',
            display: 'block',
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Footer: name + insert */}
      <div style={{ padding: `8px ${PAD}px ${PAD}px` }}>
        <div style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          lineHeight: '16px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 8,
        }}>
          {name}
        </div>
        <button
          onClick={onInsert}
          className="preview-insert-btn"
          style={{
            width: '100%',
            height: 30,
            borderRadius: 6,
            border: 'none',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Insert instance
        </button>
      </div>
    </div>
  )
})
