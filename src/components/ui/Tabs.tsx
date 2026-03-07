import * as RadixTabs from '@radix-ui/react-tabs'

interface TabItem {
  value: string
  label: string
  icon?: React.ReactNode
}

interface TabsProps {
  value: string
  onValueChange: (v: string) => void
  tabs: TabItem[]
  children: React.ReactNode
}

export function Tabs({ value, onValueChange, tabs, children }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className="h-full flex flex-col">
      <RadixTabs.List className="flex items-center gap-2 px-2 py-1.5 border-b border-border shrink-0">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={`flex items-center gap-2 px-2 py-1 text-[12px] rounded-md transition-all ${
              value === tab.value
                ? 'bg-inset fg-default'
                : 'c-dimmed-i'
            }`}
          >
            {tab.icon}
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  )
}

export const TabsContent = RadixTabs.Content
