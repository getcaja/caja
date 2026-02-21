import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { TYPE_BADGE_STYLES, TYPE_BADGE_LABELS, getBadgeKey } from './constants'

export function NameHeader({ frame, isRoot }: { frame: Frame; isRoot: boolean }) {
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const key = getBadgeKey(frame.type, isRoot)

  return (
    <div className="-mx-3 px-3 border-b border-border pb-3 mb-3 flex flex-col gap-2">
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
      {!isRoot && (
        <div className="flex gap-1.5">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={frame.className}
              onChange={(e) => updateFrame(frame.id, { className: e.target.value })}
              placeholder="class"
              className="w-full c-input text-[11px] font-mono"
            />
          </div>
          <div className="w-[80px] shrink-0">
            <input
              type="text"
              value={frame.htmlId}
              onChange={(e) => updateFrame(frame.id, { htmlId: e.target.value })}
              placeholder="id"
              className="w-full c-input text-[11px] font-mono"
            />
          </div>
        </div>
      )}
    </div>
  )
}
