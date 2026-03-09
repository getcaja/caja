import * as RadixToggleGroup from '@radix-ui/react-toggle-group'

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
      className={`flex rounded overflow-hidden h-6 ${className ?? ''}`}
      style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--input-border)' }}
    >
      {options.map((opt) => (
        <RadixToggleGroup.Item
          key={opt.value}
          value={opt.value}
          title={opt.tooltip}
          className={`${compact ? '' : 'flex-1 '}px-1.5 text-[12px] flex items-center justify-center ${
            opt.disabled
              ? 'fg-disabled cursor-not-allowed'
              : value === opt.value
                ? 'fg-default c-segment-active'
                : 'c-dimmed-i'
          }`}
          disabled={opt.disabled}
        >
          {opt.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  )
}
