import { useState, useCallback, useMemo } from 'react'

export const INPUT_CLASS = 'flex-1 h-5 bg-surface-2 border border-transparent rounded px-1 text-[12px] text-text-primary outline-none focus:border-accent min-w-0 transition-colors'

interface InlineEditState {
  editing: boolean
  value: string
  setValue: (v: string) => void
  start: (initialValue: string) => void
  commit: () => void
  cancel: () => void
  inputProps: {
    value: string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onBlur: () => void
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    onClick: (e: React.MouseEvent<HTMLInputElement>) => void
    autoFocus: true
    className: string
  }
}

export function useInlineEdit(onCommit: (value: string) => void): InlineEditState {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  const commit = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed) onCommit(trimmed)
    setEditing(false)
  }, [value, onCommit])

  const cancel = useCallback(() => {
    setEditing(false)
  }, [])

  const start = useCallback((initialValue: string) => {
    setValue(initialValue)
    setEditing(true)
  }, [])

  const inputProps = useMemo(() => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    onBlur: () => commit(),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commit()
      if (e.key === 'Escape') cancel()
    },
    onClick: (e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation(),
    autoFocus: true as const,
    className: INPUT_CLASS,
  }), [value, commit, cancel])

  return { editing, value, setValue, start, commit, cancel, inputProps }
}
