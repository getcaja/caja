import type { Page } from '../../types/frame'
import { useFrameStore } from '../../store/frameStore'
import { useContextMenu } from './hooks/useContextMenu'
import { useInlineEdit } from './hooks/useInlineEdit'
import { TreeRow } from './TreeRow'
import { Check, Copy, File, Trash2 } from 'lucide-react'

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
      <TreeRow
        id={page.id}
        depth={0}
        icon={<File size={12} />}
        name={page.name}
        nameClassName="font-semibold"
        isSelected={isActive}
        isMulti={false}
        mergeTop={false}
        mergeBottom={false}
        editing={nameEdit.editing}
        editValue={nameEdit.value}
        onEditChange={nameEdit.setValue}
        onEditCommit={nameEdit.commit}
        onEditCancel={nameEdit.cancel}
        onClick={handleClick}
        onDoubleClick={() => nameEdit.start(page.name)}
        onContextMenu={ctxMenu.open}
        chevron="none"
        trailing={isActive ? <Check size={12} className="shrink-0 text-text-secondary" /> : undefined}
      />

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
