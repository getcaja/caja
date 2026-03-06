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
      className={`flex rounded bg-inset ${className ?? ''}`}
    >
      {options.map((opt) => (
        <RadixToggleGroup.Item
          key={opt.value}
          value={opt.value}
          title={opt.tooltip}
          className={`${compact ? '' : 'flex-1 '}h-6 px-1.5 text-[12px] rounded flex items-center justify-center ${
            opt.disabled
              ? 'fg-disabled cursor-not-allowed'
              : value === opt.value
                ? 'fg-default bg-emphasis'
                : 'fg-subtle hover:fg-muted'
          }`}
          disabled={opt.disabled}
        >
          {opt.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  )
}
