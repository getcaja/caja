import * as RadixDropdown from '@radix-ui/react-dropdown-menu'

interface DropdownMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

export function DropdownMenu({ open, onOpenChange, trigger, children, side = 'bottom', align = 'start', sideOffset = 4 }: DropdownMenuProps) {
  return (
    <RadixDropdown.Root open={open} onOpenChange={onOpenChange}>
      <RadixDropdown.Trigger asChild>
        {trigger}
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          avoidCollisions
          sticky="always"
          className="bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-[9999] py-1.5 min-w-[120px]"
        >
          {children}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive,
}: {
  children: React.ReactNode
  onSelect: () => void
  destructive?: boolean
}) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={
        destructive
          ? 'flex items-center gap-2 px-3 py-1.5 text-[12px] outline-none cursor-pointer transition-colors text-destructive data-[highlighted]:bg-destructive/10'
          : 'flex items-center gap-2 px-3 py-1.5 text-[12px] outline-none cursor-pointer transition-colors text-text-secondary data-[highlighted]:bg-surface-3/60 data-[highlighted]:text-text-primary'
      }
    >
      {children}
    </RadixDropdown.Item>
  )
}

export const DropdownMenuSeparator = () => (
  <RadixDropdown.Separator className="border-t border-border my-1" />
)
