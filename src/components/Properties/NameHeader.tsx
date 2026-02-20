import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { TYPE_BADGE_STYLES, TYPE_BADGE_LABELS, getBadgeKey } from './constants'

export function NameHeader({ frame, isRoot }: { frame: Frame; isRoot: boolean }) {
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const key = getBadgeKey(frame.type, isRoot)

  return (
    <div className="-mx-3 px-3 border-b border-border pb-3 mb-3">
      <div className="flex items-center gap-2">
        <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-medium ${TYPE_BADGE_STYLES[key]}`}>
          {TYPE_BADGE_LABELS[key]}
        </span>
        {!isRoot && (
          <input
            type="text"
            value={frame.name}
            onChange={(e) => renameFrame(frame.id, e.target.value)}
            className="flex-1 c-input min-w-0"
          />
        )}
      </div>
    </div>
  )
}
