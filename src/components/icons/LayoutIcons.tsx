interface IconProps {
  size?: number
  className?: string
}

/** Two horizontal rects stacked vertically — flex column */
export function FlexColumnIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="6" x="4" y="4" rx="2" />
      <rect width="9" height="6" x="4" y="14" rx="2" />
    </svg>
  )
}

/** Two vertical rects side by side — flex row */
export function FlexRowIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="6" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="9" x="14" y="4" rx="2" />
    </svg>
  )
}
