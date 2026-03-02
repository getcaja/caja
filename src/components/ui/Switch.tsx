import * as RadixSwitch from '@radix-ui/react-switch'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (v: boolean) => void
}

export function Switch({ checked, onCheckedChange }: SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={`w-7 h-4 rounded-full ${checked ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <RadixSwitch.Thumb
        className={`block w-3 h-3 rounded-full bg-white ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`}
      />
    </RadixSwitch.Root>
  )
}
