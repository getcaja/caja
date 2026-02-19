import * as RadixScrollArea from '@radix-ui/react-scroll-area'

interface ScrollAreaProps {
  children: React.ReactNode
  className?: string
}

export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <RadixScrollArea.Root className={`overflow-hidden ${className ?? ''}`}>
      <RadixScrollArea.Viewport className="h-full w-full">
        {children}
      </RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar
        orientation="vertical"
        className="flex select-none touch-none p-0.5 transition-colors duration-150 hover:bg-surface-2/50 data-[orientation=vertical]:w-2"
      >
        <RadixScrollArea.Thumb className="flex-1 bg-surface-3 rounded-full relative before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[20px] before:min-h-[20px]" />
      </RadixScrollArea.Scrollbar>
    </RadixScrollArea.Root>
  )
}
