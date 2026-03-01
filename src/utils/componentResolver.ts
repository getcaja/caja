import type { Frame, BoxElement } from '../types/frame'
import { cloneTree } from '../store/frameFactories'
import { findInTree } from '../store/frameStore'
import { useCatalogStore } from '../store/catalogStore'

/**
 * Resolve a component instance into a renderable frame tree.
 *
 * Lookup order:
 * 1. Components page (masters created via createComponent)
 * 2. catalogStore (components saved via "Save as Component")
 * 3. Library data (installed .cjl libraries)
 *
 * If the frame is not an instance, returns it unchanged.
 */
export function resolveInstance(
  frame: Frame,
  componentPageRoot: BoxElement | null,
): Frame {
  if (!frame._componentId) return frame

  // Try Components page first
  let master: Frame | null = componentPageRoot
    ? findInTree(componentPageRoot, frame._componentId)
    : null

  // Fallback: look in catalogStore (internal components + libraries)
  if (!master) {
    const catalog = useCatalogStore.getState()
    // Check internal components
    const comp = catalog.getComponent(frame._componentId)
    if (comp) {
      master = comp.frame
    } else {
      // Check libraries
      for (const [libId] of catalog.libraries) {
        const libComp = catalog.getLibraryComponent(libId, frame._componentId)
        if (libComp) {
          master = libComp.frame
          break
        }
      }
    }
  }

  if (!master) return frame // master deleted — render as-is

  // Deep clone master tree
  const resolved = cloneTree(master)

  // Keep instance's own ID, name, and position/size
  resolved.id = frame.id
  resolved.name = frame.name

  // Apply instance-level overrides
  const overrides = frame._overrides
  if (overrides && Object.keys(overrides).length > 0) {
    applyOverrides(resolved, overrides)
  }

  // Preserve component link on the resolved root
  resolved._componentId = frame._componentId
  resolved._overrides = frame._overrides

  return resolved
}

/**
 * Walk the resolved tree and apply overrides by matching child IDs from the master.
 * Override keys are master child IDs; values are partial props to merge.
 */
function applyOverrides(
  frame: Frame,
  overrides: Record<string, Record<string, unknown>>,
) {
  // Check if this frame's ID (master ID) has overrides
  // Note: the resolved tree has master IDs for children
  const myOverrides = overrides[frame.id]
  if (myOverrides) {
    Object.assign(frame, myOverrides)
  }

  // Recurse into children
  if (frame.type === 'box') {
    for (const child of frame.children) {
      applyOverrides(child, overrides)
    }
  }
}
