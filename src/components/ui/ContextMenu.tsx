import * as RadixContextMenu from '@radix-ui/react-context-menu'

export function ContextMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>
        {trigger}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          className="c-menu-popup min-w-[160px]"
        >
          {children}
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  )
}

export function ContextMenuItem({
  children,
  onSelect,
  destructive,
}: {
  children: React.ReactNode
  onSelect: () => void
  destructive?: boolean
}) {
  return (
    <RadixContextMenu.Item
      onSelect={onSelect}
      className={
        destructive
          ? 'flex items-center gap-2 px-3 py-1.5 text-[12px] outline-none cursor-pointer text-destructive data-[highlighted]:bg-destructive/10'
          : 'c-menu-item outline-none cursor-pointer'
      }
    >
      {children}
    </RadixContextMenu.Item>
  )
}

export const ContextMenuSeparator = () => (
  <RadixContextMenu.Separator className="border-t border-border my-1" />
)
