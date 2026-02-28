import { Type, Globe } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'

export function PagePanel() {
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const renamePage = useFrameStore((s) => s.renamePage)
  const setPageRoute = useFrameStore((s) => s.setPageRoute)

  const page = pages.find((p) => p.id === activePageId)
  if (!page) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 border-b border-border flex flex-col gap-2">
        {/* Header: badge */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] px-1.5 py-0.5 rounded-md font-medium bg-accent/15 text-accent">
            Page
          </span>
          <div className="flex-1" />
        </div>

        {/* Name */}
        <div className="flex items-center gap-2">
          <div className="c-scale-input flex-1 flex items-center gap-0.5 overflow-hidden cursor-text">
            <span title="Page Name" className="w-4 shrink-0 flex items-center justify-center text-text-muted">
              <Type size={12} />
            </span>
            <input
              type="text"
              value={page.name}
              onChange={(e) => renamePage(page.id, e.target.value)}
              className="flex-1 min-w-0 text-[12px] text-text-primary"
              placeholder="Page name"
            />
          </div>
          <div className="w-5 shrink-0" />
        </div>

        {/* Route */}
        <div className="flex items-center gap-2">
          <div className="c-scale-input flex-1 flex items-center gap-0.5 overflow-hidden cursor-text">
            <span title="Page Route" className="w-4 shrink-0 flex items-center justify-center text-text-muted">
              <Globe size={12} />
            </span>
            <input
              type="text"
              value={page.route}
              onChange={(e) => setPageRoute(page.id, e.target.value)}
              className="flex-1 min-w-0 text-[12px] text-text-primary"
              placeholder="/page-route"
            />
          </div>
          <div className="w-5 shrink-0" />
        </div>
      </div>
    </div>
  )
}
