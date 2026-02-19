import * as RadixContextMenu from '@radix-ui/react-context-menu'

export function ContextMenu({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>
        {trigger}
      </RadixContextMenu.Trigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content
          className="bg-surface-2 border border-border-accent rounded-lg shadow-2xl z-50 py-1.5 min-w-[160px]"
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
          ? 'flex items-center gap-2 px-3 py-1.5 text-[12px] outline-none cursor-pointer transition-colors text-destructive data-[highlighted]:bg-destructive/10'
          : 'flex items-center gap-2 px-3 py-1.5 text-[12px] outline-none cursor-pointer transition-colors text-text-secondary data-[highlighted]:bg-surface-3/60 data-[highlighted]:text-text-primary'
      }
    >
      {children}
    </RadixContextMenu.Item>
  )
}

export const ContextMenuSeparator = () => (
  <RadixContextMenu.Separator className="border-t border-border/60 my-1" />
)
