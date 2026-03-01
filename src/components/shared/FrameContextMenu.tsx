/**
 * Shared context menu for frames — used in both the tree panel and canvas.
 * Renders menu items only (no backdrop/positioning wrapper).
 */
import { useFrameStore, findInTree } from '../../store/frameStore'
import type { BoxElement } from '../../types/frame'

function Shortcut({ children }: { children: string }) {
  return <span className="ml-auto text-text-muted text-[11px] pl-4">{children}</span>
}

interface FrameContextMenuProps {
  frameId: string | null
  close: () => void
}

export function FrameContextMenu({
  frameId,
  close,
}: FrameContextMenuProps) {
  const store = useFrameStore.getState()
  const { selectedIds } = store
  const isRoot = frameId ? frameId.startsWith('__root__') : false
  const frame = frameId ? findInTree(store.root, frameId) : null
  const isBox = frame?.type === 'box'
  const multiSelected = selectedIds.size > 1
  const canUngroup = isBox && !isRoot && (frame as BoxElement).children.length > 0
  const isInstance = !!frame?._componentId
  const isOnComponentPage = store.pages.find((p) => p.id === store.activePageId)?.isComponentPage ?? false
  const editingComponentId = store.editingComponentId
  const isMaster = isOnComponentPage && !editingComponentId && !isRoot && !!frame

  const act = (fn: () => void) => { fn(); close() }

  return (
    <>
      {/* ── Structure actions ── */}
      {frameId && !isRoot && (
        <>
          <button
            className="c-menu-item"
            onClick={() => act(() => {
              if (multiSelected) store.wrapSelectedInFrame()
              else store.wrapInFrame(frameId)
            })}
          >
            {multiSelected ? 'Group Selected' : 'Group'}
            <Shortcut>⌘G</Shortcut>
          </button>
          {canUngroup && (
            <button
              className="c-menu-item"
              onClick={() => act(() => store.ungroupFrame(frameId))}
            >
              Ungroup
              <Shortcut>⌘⇧G</Shortcut>
            </button>
          )}
          <button
            className="c-menu-item"
            onClick={() => act(() => store.duplicateFrame(frameId))}
          >
            Duplicate
          </button>
        </>
      )}

      {/* ── Component actions ── */}
      {frameId && !isRoot && !isInstance && !isMaster && (
        <button
          className="c-menu-item"
          onClick={() => act(() => store.createComponent(frameId))}
        >
          Create Component
        </button>
      )}
      {isMaster && (
        <button
          className="c-menu-item"
          onClick={() => act(() => {
            store.setTreePanelTab('layers')
            requestAnimationFrame(() => {
              useFrameStore.getState().insertInstance(frameId!, useFrameStore.getState().root.id)
            })
          })}
        >
          Insert Instance
        </button>
      )}
      {isInstance && frameId && (
        <>
          <button
            className="c-menu-item"
            onClick={() => act(() => {
              if (frame?._componentId) store.enterComponentEditMode(frame._componentId)
            })}
          >
            Edit Master
          </button>
          <button
            className="c-menu-item"
            onClick={() => act(() => store.resetInstance(frameId))}
          >
            Reset Instance
          </button>
          <button
            className="c-menu-item"
            onClick={() => act(() => store.detachInstance(frameId))}
          >
            Detach Instance
          </button>
        </>
      )}

      {/* ── Destructive ── */}
      {frameId && !isRoot && (
        <>
          <div className="border-t border-border my-1" />
          <button
            className="c-menu-item"
            onClick={() => act(() => store.removeFrame(frameId))}
          >
            Delete
          </button>
        </>
      )}
    </>
  )
}
