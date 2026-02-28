import type { Page } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { Check, Copy, Trash2 } from 'lucide-react'

interface PageNodeProps {
  page: Page
}

export function PageNode({ page }: PageNodeProps) {
  const activePageId = useFrameStore((s) => s.activePageId)
  const pages = useFrameStore((s) => s.pages)
  const setActivePage = useFrameStore((s) => s.setActivePage)
  const renamePage = useFrameStore((s) => s.renamePage)
  const duplicatePage = useFrameStore((s) => s.duplicatePage)
  const removePage = useFrameStore((s) => s.removePage)
  const select = useFrameStore((s) => s.select)

  const isActive = page.id === activePageId

  const nameEdit = useInlineEdit((v) => renamePage(page.id, v))
  const ctxMenu = useContextMenu()

  const handleClick = () => {
    if (!isActive) setActivePage(page.id)
    select(null)
  }

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-default group transition-all ${isActive ? 'text-text-primary' : 'text-text-secondary hover:bg-[var(--color-accent)]/8 hover:text-text-primary'}`}
        onClick={handleClick}
        onDoubleClick={() => nameEdit.start(page.name)}
        onContextMenu={ctxMenu.open}
      >
        {nameEdit.editing ? (
          <input {...nameEdit.inputProps} className="flex-1 h-5 bg-surface-2 border border-accent rounded px-1 text-[12px] font-semibold text-text-primary outline-none min-w-0" />
        ) : (
          <>
            <span className="flex-1 h-5 flex items-center text-[12px] font-semibold truncate">{page.name}</span>
            {isActive && (
              <Check size={12} className="shrink-0 text-text-secondary" />
            )}
          </>
        )}
      </div>

      {ctxMenu.backdrop}
      {ctxMenu.menu && (
        <div
          className="fixed c-menu-popup min-w-[160px] z-50"
          style={{ left: ctxMenu.menu.x, top: ctxMenu.menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="c-menu-item" onClick={() => { duplicatePage(page.id); ctxMenu.close() }}>
            <Copy size={12} /> Duplicate
          </button>
          <div className="border-t border-border my-1" />
          <button
            className={`c-menu-item ${pages.length <= 1 ? 'opacity-40 cursor-default' : ''}`}
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
