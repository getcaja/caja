import * as RadixToggleGroup from '@radix-ui/react-toggle-group'

interface ToggleGroupProps<T extends string> {
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (v: T) => void
  className?: string
}

export function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
  className,
}: ToggleGroupProps<T>) {
  return (
    <RadixToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as T) }}
      className={`flex bg-surface-0 rounded-md p-0.5 ${className ?? ''}`}
    >
      {options.map((opt) => (
        <RadixToggleGroup.Item
          key={opt.value}
          value={opt.value}
          className={`flex-1 py-1 px-1.5 text-[12px] rounded transition-all flex items-center justify-center ${
            value === opt.value
              ? 'bg-surface-3 text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          {opt.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  )
}
