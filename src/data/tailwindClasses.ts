/** Curated list of ~280 common Tailwind CSS classes for autocomplete suggestions. */
export const TAILWIND_CLASSES: string[] = [
  // Layout
  'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden',
  'absolute', 'relative', 'fixed', 'sticky', 'static',
  'top-0', 'right-0', 'bottom-0', 'left-0', 'inset-0',
  'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50',

  // Flex/Grid
  'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap',
  'items-start', 'items-center', 'items-end', 'items-stretch',
  'justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around',
  'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8',
  'grow', 'grow-0', 'shrink', 'shrink-0',
  'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6', 'grid-cols-12',
  'col-span-1', 'col-span-2', 'col-span-3', 'col-span-full',

  // Spacing
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12',
  'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-6', 'px-8',
  'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-6', 'py-8',
  'm-0', 'm-1', 'm-2', 'm-4', 'm-auto',
  'mx-auto', 'my-0', 'my-2', 'my-4',
  'mt-0', 'mt-1', 'mt-2', 'mt-4', 'mb-4', 'ml-auto', 'mr-auto',
  'space-x-1', 'space-x-2', 'space-x-4', 'space-y-1', 'space-y-2', 'space-y-4',

  // Sizing
  'w-full', 'w-auto', 'w-screen', 'w-fit', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
  'h-full', 'h-auto', 'h-screen', 'h-fit',
  'min-w-0', 'min-w-full', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-full', 'max-w-screen-xl',
  'min-h-0', 'min-h-full', 'min-h-screen', 'max-h-full', 'max-h-screen',

  // Typography
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-black',
  'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
  'tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider', 'tracking-widest',
  'text-left', 'text-center', 'text-right', 'text-justify',
  'uppercase', 'lowercase', 'capitalize', 'normal-case',
  'italic', 'not-italic',
  'underline', 'line-through', 'no-underline',
  'whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-wrap',
  'truncate', 'text-ellipsis', 'text-clip',
  'break-words', 'break-all',

  // Colors
  'text-white', 'text-black', 'text-transparent', 'text-current',
  'bg-white', 'bg-black', 'bg-transparent', 'bg-current',
  'border-white', 'border-black', 'border-transparent',

  // Borders
  'border', 'border-0', 'border-2', 'border-4',
  'border-t', 'border-r', 'border-b', 'border-l',
  'border-solid', 'border-dashed', 'border-dotted', 'border-none',
  'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
  'divide-x', 'divide-y',
  'ring-0', 'ring-1', 'ring-2', 'ring-4',
  'outline-none', 'outline',

  // Effects
  'shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
  'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
  'blur-none', 'blur-sm', 'blur', 'blur-md', 'blur-lg',
  'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md',

  // Transitions/Animation
  'transition', 'transition-all', 'transition-colors', 'transition-opacity', 'transition-transform',
  'duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500',
  'ease-linear', 'ease-in', 'ease-out', 'ease-in-out',
  'animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce',

  // Transforms
  'scale-0', 'scale-50', 'scale-75', 'scale-90', 'scale-95', 'scale-100', 'scale-105', 'scale-110', 'scale-125', 'scale-150',
  'rotate-0', 'rotate-45', 'rotate-90', 'rotate-180',
  '-rotate-45', '-rotate-90', '-rotate-180',
  'translate-x-0', 'translate-y-0', 'translate-x-full', 'translate-y-full',

  // Overflow
  'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll',
  'overflow-x-auto', 'overflow-y-auto', 'overflow-x-hidden', 'overflow-y-hidden',

  // Cursor
  'cursor-auto', 'cursor-default', 'cursor-pointer', 'cursor-wait', 'cursor-text', 'cursor-move', 'cursor-not-allowed', 'cursor-grab',

  // Interactivity
  'select-none', 'select-text', 'select-all', 'select-auto',
  'pointer-events-none', 'pointer-events-auto',
  'resize', 'resize-none', 'resize-x', 'resize-y',

  // Misc
  'sr-only', 'not-sr-only',
  'aspect-auto', 'aspect-square', 'aspect-video',
  'object-contain', 'object-cover', 'object-fill', 'object-none',
  'list-none', 'list-disc', 'list-decimal',
]

/** Variant prefixes that can be composed with any class. */
export const TAILWIND_VARIANTS: string[] = [
  'hover:', 'focus:', 'active:', 'disabled:', 'group-hover:',
  'first:', 'last:', 'odd:', 'even:',
  'dark:',
  'sm:', 'md:', 'lg:', 'xl:', '2xl:',
]
