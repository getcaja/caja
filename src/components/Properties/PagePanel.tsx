import { Globe } from 'lucide-react'
import { useFrameStore } from '../../store/frameStore'
import { Section } from '../ui/Section'

export function PagePanel() {
  const pages = useFrameStore((s) => s.pages)
  const activePageId = useFrameStore((s) => s.activePageId)
  const renamePage = useFrameStore((s) => s.renamePage)
  const setPageRoute = useFrameStore((s) => s.setPageRoute)

  const page = pages.find((p) => p.id === activePageId)
  if (!page || page.isComponentPage) return null

  return (
    <div className="h-full overflow-y-auto">
      <Section title="Properties">
        <div className="flex flex-col gap-2">
          {/* Badge + name */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] px-1.5 py-0.5 rounded-md font-medium bg-accent/15 text-accent">
              Page
            </span>
            <input
              type="text"
              value={page.name}
              onChange={(e) => renamePage(page.id, e.target.value)}
              className="flex-1 c-input min-w-0"
              placeholder="Page name"
            />
            <div className="c-slot-spacer" />
          </div>

          {/* Route */}
          <div className="flex items-center gap-2">
            <div className="c-scale-input flex-1 flex items-center overflow-hidden cursor-text">
              <span title="Page Route" className="w-4 shrink-0 flex items-center justify-center c-dimmed">
                <Globe size={12} />
              </span>
              <input
                type="text"
                value={page.route}
                onChange={(e) => setPageRoute(page.id, e.target.value)}
                className="flex-1 min-w-0 text-[12px] fg-default"
                placeholder="/page-route"
              />
            </div>
            <div className="c-slot-spacer" />
          </div>
        </div>
      </Section>
    </div>
  )
}
