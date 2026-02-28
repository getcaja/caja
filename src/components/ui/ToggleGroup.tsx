import * as RadixToggleGroup from '@radix-ui/react-toggle-group'
import { Tooltip } from './Tooltip'

interface ToggleGroupProps<T extends string> {
  value: T
  options: { value: T; label: React.ReactNode; tooltip?: string; disabled?: boolean }[]
  onChange: (v: T) => void
  className?: string
  compact?: boolean
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  className,
  compact,
}: ToggleGroupProps<T>) {
  return (
    <RadixToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as T) }}
      className={`flex bg-surface-2 rounded ${className ?? ''}`}
    >
      {options.map((opt) => {
        const itemCls = `${compact ? '' : 'flex-1 '}h-6 px-1.5 text-[12px] rounded flex items-center justify-center ${
          opt.disabled
            ? 'text-text-muted/40 cursor-not-allowed'
            : value === opt.value
              ? 'bg-surface-3 text-text-primary'
              : 'text-text-muted hover:text-text-secondary'
        }`

        return opt.tooltip ? (
          <Tooltip key={opt.value} content={opt.tooltip}>
            <RadixToggleGroup.Item value={opt.value} className={itemCls} disabled={opt.disabled}>
              {opt.label}
            </RadixToggleGroup.Item>
          </Tooltip>
        ) : (
          <RadixToggleGroup.Item key={opt.value} value={opt.value} className={itemCls} disabled={opt.disabled}>
            {opt.label}
          </RadixToggleGroup.Item>
        )
      })}
    </RadixToggleGroup.Root>
  )
}
