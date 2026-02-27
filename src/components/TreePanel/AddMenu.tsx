import { Square, Type, ImageIcon, RectangleHorizontal, TextCursorInput, AlignLeft, ChevronDown, Link } from 'lucide-react'

interface AddMenuProps {
  x: number
  y: number
  onAdd: (type: 'box' | 'text' | 'image' | 'button' | 'input' | 'textarea' | 'select' | 'link') => void
  onClose: () => void
}

export function AddMenu({ x, y, onAdd, onClose }: AddMenuProps) {
  return (
    <>
      {/* Backdrop catches clicks outside menu (including on iframe) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed c-menu-popup min-w-[120px] z-50"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
      <button
        className="c-menu-item"
        onClick={() => onAdd('box')}
      >
        <Square size={12} /> Frame
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('text')}
      >
        <Type size={12} /> Text
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('link')}
      >
        <Link size={12} /> Link
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('image')}
      >
        <ImageIcon size={12} /> Image
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('button')}
      >
        <RectangleHorizontal size={12} /> Button
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('input')}
      >
        <TextCursorInput size={12} /> Input
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('textarea')}
      >
        <AlignLeft size={12} /> Textarea
      </button>
      <button
        className="c-menu-item"
        onClick={() => onAdd('select')}
      >
        <ChevronDown size={12} /> Select
      </button>
    </div>
    </>
  )
}
