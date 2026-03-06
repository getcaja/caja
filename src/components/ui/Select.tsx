import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

interface SelectProps {
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  className?: string
  tooltip?: string
  inlineLabel?: React.ReactNode
  initialValue?: string
}

export function Select({ value, options, onChange, className, tooltip, inlineLabel, initialValue }: SelectProps) {
  const isInitial = initialValue !== undefined && value === initialValue

  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger
          title={tooltip}
          className="c-scale-input w-full flex items-center gap-0.5 cursor-pointer"
        >
          {inlineLabel && (
            <span className={`w-4 shrink-0 flex items-center justify-center ${isInitial ? 'fg-subtle' : 'fg-muted'}`}>
              {inlineLabel}
            </span>
          )}
          <span className={`flex-1 text-[12px] truncate text-left ${isInitial ? 'fg-subtle' : 'fg-default'}`}>
            <RadixSelect.Value />
          </span>
          <RadixSelect.Icon className="shrink-0">
            <ChevronDown size={10} className="fg-icon-subtle" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="c-menu-popup overflow-hidden min-w-[var(--radix-select-trigger-width)]"
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
                  {opt.hint && <span className="ml-auto fg-subtle text-[11px] pl-3">{opt.hint}</span>}
                  <RadixSelect.ItemIndicator>
                    <Check size={10} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
