import { useEffect, useCallback } from 'react'
import { Square, Type, ImageIcon, RectangleHorizontal, TextCursorInput } from 'lucide-react'

interface AddMenuProps {
  x: number
  y: number
  onAdd: (type: 'box' | 'text' | 'image' | 'button' | 'input') => void
  onClose: () => void
}

export function AddMenu({ x, y, onAdd, onClose }: AddMenuProps) {
  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = () => handleClose()
    const id = setTimeout(() => {
      window.addEventListener('click', handler)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('click', handler)
    }
  }, [handleClose])

  return (
    <div
      className="fixed c-menu-popup min-w-[120px]"
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
    </div>
  )
}
