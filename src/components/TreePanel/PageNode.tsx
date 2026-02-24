import type { Page } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { File, Pencil, Route, Copy, Trash2 } from 'lucide-react'

interface PageNodeProps {
  page: Page
}

export function PageNode({ page }: PageNodeProps) {
  const activePageId = useFrameStore((s) => s.activePageId)
  const pages = useFrameStore((s) => s.pages)
  const setActivePage = useFrameStore((s) => s.setActivePage)
  const renamePage = useFrameStore((s) => s.renamePage)
  const setPageRoute = useFrameStore((s) => s.setPageRoute)
  const duplicatePage = useFrameStore((s) => s.duplicatePage)
  const removePage = useFrameStore((s) => s.removePage)
  const select = useFrameStore((s) => s.select)

  const isActive = page.id === activePageId

  const nameEdit = useInlineEdit((v) => renamePage(page.id, v))
  const routeEdit = useInlineEdit((v) => setPageRoute(page.id, v))
  const ctxMenu = useContextMenu()

  const handleClick = () => {
    if (!isActive) setActivePage(page.id)
    select(page.root.id)
  }

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer group transition-all ${isActive ? 'bg-surface-2 text-text-primary' : 'text-text-secondary hover:bg-[var(--color-focus)]/8 hover:text-text-primary'}`}
        onClick={handleClick}
        onDoubleClick={() => nameEdit.start(page.name)}
        onContextMenu={ctxMenu.open}
      >
        <span className="shrink-0 text-blue-400 relative">
          <File size={12} />
          {isActive && <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />}
        </span>

        {nameEdit.editing ? (
          <input {...nameEdit.inputProps} />
        ) : routeEdit.editing ? (
          <input {...routeEdit.inputProps} className={`${routeEdit.inputProps.className} font-mono`} />
        ) : (
          <>
            <span className="flex-1 text-[12px] font-semibold truncate">{page.name}</span>
            <span className="text-[10px] text-text-muted font-mono truncate shrink-0 hidden group-hover:inline">{page.route}</span>
          </>
        )}
      </div>

      {ctxMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[160px] z-[9999]"
          style={{ left: ctxMenu.menu.x, top: ctxMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="c-menu-item" onClick={() => { nameEdit.start(page.name); ctxMenu.close() }}>
            <Pencil size={12} /> Rename
          </button>
          <button className="c-menu-item" onClick={() => { routeEdit.start(page.route); ctxMenu.close() }}>
            <Route size={12} /> Set Route
          </button>
          <button className="c-menu-item" onClick={() => { duplicatePage(page.id); ctxMenu.close() }}>
            <Copy size={12} /> Duplicate
          </button>
          <div className="border-t border-border my-1" />
          <button
            className={`c-menu-item text-destructive ${pages.length <= 1 ? 'opacity-40 cursor-default' : ''}`}
            disabled={pages.length <= 1}
            onClick={() => { removePage(page.id); ctxMenu.close() }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </>
  )
}
