interface IconProps {
  size?: number
  className?: string
}

/** Two arrows converging on a center line — vertical align middle.
    Matches ArrowUpToLine / ArrowDownToLine pattern from Lucide. */
export function AlignVerticalCenterIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Center line */}
      <line x1="5" y1="12" x2="19" y2="12" />
      {/* Arrow down from top → center */}
      <line x1="12" y1="2" x2="12" y2="9" />
      <polyline points="8,5 12,9 16,5" />
      {/* Arrow up from bottom → center */}
      <line x1="12" y1="22" x2="12" y2="15" />
      <polyline points="8,19 12,15 16,19" />
    </svg>
  )
}

/** Down arrow (left col) + right column rects from LayoutGrid — flex column */
export function FlexColumnIcon({ size = 24, className }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Down arrow — integer coords for pixel-perfect rendering */}
      <line x1="7" y1="3" x2="7" y2="21" />
      <polyline points="4,18 7,21 10,18" />
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
      {/* Right arrow — integer coords for pixel-perfect rendering */}
      <line x1="3" y1="7" x2="21" y2="7" />
      <polyline points="18,4 21,7 18,10" />
      {/* Bottom row rects — same positions as LayoutGrid */}
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </svg>
  )
}
