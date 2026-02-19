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
      className="fixed bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-[9999] py-1.5 min-w-[120px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
        onClick={() => onAdd('box')}
      >
        <Square size={12} /> Frame
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
        onClick={() => onAdd('text')}
      >
        <Type size={12} /> Text
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
        onClick={() => onAdd('image')}
      >
        <ImageIcon size={12} /> Image
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
        onClick={() => onAdd('button')}
      >
        <RectangleHorizontal size={12} /> Button
      </button>
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary transition-colors"
        onClick={() => onAdd('input')}
      >
        <TextCursorInput size={12} /> Input
      </button>
    </div>
  )
}
