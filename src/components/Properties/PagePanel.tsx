import { useFrameStore } from '../../store/frameStore'

export function PagePanel() {
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const renamePage = useFrameStore((s) => s.renamePage)
  const setPageRoute = useFrameStore((s) => s.setPageRoute)

  const page = pages.find((p) => p.id === activePageId)
  if (!page) return null

  return (
    <div className="h-full bg-surface-1 p-3 overflow-y-auto">
      {/* Header */}
      <div className="-mx-3 px-3 border-b border-border pb-3 mb-3 flex items-center gap-2">
        <span className="text-[12px] px-1.5 py-0.5 rounded-md font-medium bg-accent/15 text-accent">
          Page
        </span>
        <span className="text-[12px] text-text-primary font-semibold truncate">{page.name}</span>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="c-label">Name</span>
          <input
            type="text"
            value={page.name}
            onChange={(e) => renamePage(page.id, e.target.value)}
            className="c-input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="c-label">Route</span>
          <input
            type="text"
            value={page.route}
            onChange={(e) => setPageRoute(page.id, e.target.value)}
            className="c-input font-mono"
            placeholder="/page-route"
          />
        </div>
      </div>
    </div>
  )
}
