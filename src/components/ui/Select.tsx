import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  className?: string
}

export function Select({ value, options, onChange, className }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        className={`flex items-center justify-between bg-surface-0 border border-border/60 rounded-md px-2 py-1 text-[12px] text-text-primary outline-none focus:border-accent transition-colors cursor-pointer ${className ?? ''}`}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={10} className="text-text-muted" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-50 overflow-hidden"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="py-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-secondary hover:bg-surface-3/60 hover:text-text-primary outline-none cursor-pointer transition-colors data-[highlighted]:bg-surface-3/60 data-[highlighted]:text-text-primary"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={10} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
