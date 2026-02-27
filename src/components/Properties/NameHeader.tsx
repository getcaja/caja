import { Eye, EyeOff } from 'lucide-react'
import type { Frame } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { Select } from '../ui/Select'
import { TYPE_BADGE_STYLES, TYPE_BADGE_LABELS, getBadgeKey, BOX_TAG_OPTIONS, TEXT_TAG_OPTIONS } from './constants'

function getTagOptions(type: Frame['type'], tag?: string) {
  if (type === 'box') return BOX_TAG_OPTIONS
  if (type === 'text' && tag !== 'a') return TEXT_TAG_OPTIONS
  return null
}

function getTagDefault(type: Frame['type']) {
  if (type === 'box') return 'div'
  if (type === 'text') return 'p'
  return ''
}

export function NameHeader({ frame, isRoot }: { frame: Frame; isRoot: boolean }) {
  const renameFrame = useFrameStore((s) => s.renameFrame)
  const updateFrame = useFrameStore((s) => s.updateFrame)
  const toggleHidden = useFrameStore((s) => s.toggleHidden)
  const frameTag = 'tag' in frame ? (frame as { tag?: string }).tag : undefined
  const key = getBadgeKey(frame.type, isRoot, frameTag)
  const tagOptions = getTagOptions(frame.type, frameTag)
  const currentTag = frameTag || getTagDefault(frame.type)

  return (
    <div className="-mx-3 px-3 border-b border-border pb-3 mb-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`text-[12px] px-1.5 py-0.5 rounded-md font-medium ${TYPE_BADGE_STYLES[key]}`}>
          {TYPE_BADGE_LABELS[key]}
        </span>
        {!isRoot && (
          <>
            <input
              type="text"
              value={frame.name}
              onChange={(e) => renameFrame(frame.id, e.target.value)}
              className="flex-1 c-input min-w-0"
            />
            <button
              type="button"
              onClick={() => toggleHidden(frame.id)}
              className={`w-5 h-5 flex items-center justify-center rounded ${
                frame.hidden ? 'text-destructive' : 'text-text-muted hover:text-text-secondary'
              }`}
              title={frame.hidden ? 'Show element' : 'Hide element'}
            >
              {frame.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </>
        )}
      </div>
      {!isRoot && tagOptions && (
        <div className="flex items-center gap-1.5">
          <span className="c-label">Tag</span>
          <Select
            value={currentTag}
            options={tagOptions}
            onChange={(v) => updateFrame(frame.id, { tag: v })}
            className="flex-1"
          />
        </div>
      )}
    </div>
  )
}
