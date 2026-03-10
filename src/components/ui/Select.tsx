import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'

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
  const setPropertyHint = useFrameStore((s) => s.setPropertyHint)
  const hintHandlers = tooltip ? {
    onMouseEnter: () => setPropertyHint(tooltip),
    onMouseLeave: () => setPropertyHint(null),
  } : {}

  return (
    <div className={`min-w-0 ${className ?? ''}`} {...hintHandlers}>
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger
          className="c-scale-input w-full flex items-center cursor-pointer"
        >
          {inlineLabel && (
            <span className={`w-4 shrink-0 flex items-center justify-center c-dimmed ${isInitial ? '' : 'is-active'}`}>
              {inlineLabel}
            </span>
          )}
          <span className={`flex-1 text-[12px] truncate text-left c-dimmed ${isInitial ? '' : 'is-active'}`}>
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
