import { useState, useRef, useEffect } from 'react'
import { COLOR_GRID, SPECIAL_COLORS, SHADE_NAMES } from '../../data/colors'
import type { ColorSwatch } from '../../data/colors'
import type { DesignValue } from '../../types/frame'

export function ColorGridPicker({
  value,
  onChange,
  onCommit,
  classPrefix,
}: {
  value: DesignValue<string>
  onChange: (v: DesignValue<string>) => void
  onCommit?: () => void
  classPrefix?: string
}) {
  const currentToken = value.mode === 'token' ? value.token : null
  const [hovered, setHovered] = useState<ColorSwatch | null>(null)

  // Use hovered token for visual highlight (synchronous) to avoid flicker
  const activeToken = hovered ? hovered.token : currentToken

  // Store original value before preview starts
  const originalRef = useRef<DesignValue<string> | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Revert on unmount (popover closes without committing)
  useEffect(() => {
    return () => {
      if (originalRef.current) {
        onChangeRef.current(originalRef.current)
      }
    }
  }, [])

  const label = (token: string) => classPrefix ? `${classPrefix}-${token}` : token

  const handleHover = (swatch: ColorSwatch) => {
    if (!originalRef.current) originalRef.current = value
    setHovered(swatch)
    onChange({ mode: 'token', token: swatch.token, value: swatch.value })
  }

  const handleClick = (swatch: ColorSwatch) => {
    originalRef.current = null
    onChange({ mode: 'token', token: swatch.token, value: swatch.value })
    onCommit?.()
  }

  const handleLeave = () => {
    setHovered(null)
    if (originalRef.current) {
      onChange(originalRef.current)
      originalRef.current = null
    }
  }

  const handleUnlink = () => {
    const base = originalRef.current || value
    originalRef.current = null
    onChange({ mode: 'custom', value: base.value })
    onCommit?.()
  }

  const display = hovered ?? (currentToken
    ? { token: currentToken, value: value.value }
    : null
  )

  return (
    <div className="flex flex-col gap-1.5" onMouseLeave={handleLeave}>
      {/* Special: white, black + unlink */}
      <div className="flex items-center gap-0.5">
        {SPECIAL_COLORS.map((c) => (
          <button
            key={c.token}
            className={`w-4 h-4 rounded-sm border ${
              activeToken === c.token
                ? 'border-accent'
                : 'border-surface-3 hover:border-text-muted'
            }`}
            style={{ backgroundColor: c.value }}
            onMouseEnter={() => handleHover(c)}
            onClick={() => handleClick(c)}
          />
        ))}
        {currentToken && (
          <button
            className="text-[10px] text-text-muted hover:text-text-secondary ml-auto"
            onClick={handleUnlink}
          >
            Unlink
          </button>
        )}
      </div>

      {/* Color grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${SHADE_NAMES.length}, 16px)`,
          gridAutoRows: '16px',
          gap: '2px',
        }}
      >
        {COLOR_GRID.map((family) =>
          family.shades.map((swatch) => (
            <button
              key={swatch.token}
              className={activeToken === swatch.token
                ? 'rounded-[2px] outline outline-1 outline-accent outline-offset-0 z-10 relative'
                : 'rounded-[2px] hover:outline hover:outline-1 hover:outline-text-muted hover:z-10 hover:relative'
              }
              style={{ backgroundColor: swatch.value }}
              onMouseEnter={() => handleHover(swatch)}
              onClick={() => handleClick(swatch)}
            />
          ))
        )}
      </div>

      {/* Info bar */}
      <div className="h-4 flex items-center justify-between text-[10px]">
        {display ? (
          <>
            <span className="text-text-secondary font-medium">{label(display.token)}</span>
            <span className="text-text-muted">{display.value}</span>
          </>
        ) : (
          <span className="text-text-muted">Hover to preview</span>
        )}
      </div>
    </div>
  )
}
