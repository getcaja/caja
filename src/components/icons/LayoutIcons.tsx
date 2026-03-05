interface IconProps {
  size?: number
  className?: string
}

/** Down arrow (left col) + right column rects from LayoutGrid — flex column */
export function FlexColumnIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Down arrow — occupies left column position (centered at x=6.5) */}
      <line x1="6.5" y1="3" x2="6.5" y2="21" />
      <polyline points="4.5,19 6.5,21 8.5,19" />
      {/* Right column rects — same positions as LayoutGrid */}
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  )
}

/** Right arrow (top row) + bottom row rects from LayoutGrid — flex row */
export function FlexRowIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Right arrow — occupies top row position (centered at y=6.5) */}
      <line x1="3" y1="6.5" x2="21" y2="6.5" />
      <polyline points="19,4.5 21,6.5 19,8.5" />
      {/* Bottom row rects — same positions as LayoutGrid */}
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  )
}
