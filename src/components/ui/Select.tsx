import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  className?: string
  tooltip?: string
}

export function Select({ value, options, onChange, className, tooltip }: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        title={tooltip}
        className={`c-input flex items-center justify-between cursor-pointer ${className ?? ''}`}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={10} className="fg-icon-subtle" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          className="bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-50 overflow-hidden min-w-[var(--radix-select-trigger-width)]"
          position="popper"
          sideOffset={4}
        >
          <RadixSelect.Viewport className="py-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="c-menu-item outline-none cursor-pointer"
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
