import type { Frame, BoxElement } from '../types/frame'
import { cloneTree } from '../store/frameFactories'
import { findInTree } from '../store/frameStore'

/**
 * Resolve a component instance into a renderable frame tree.
 *
 * If the frame has `_componentId`, look up the master in the Components page,
 * deep clone it, apply `_overrides`, and return the result with the instance's
 * own ID and layout position preserved.
 *
 * If the frame is not an instance, returns it unchanged.
 */
export function resolveInstance(
  frame: Frame,
  componentPageRoot: BoxElement | null,
): Frame {
  if (!frame._componentId || !componentPageRoot) return frame

  const master = findInTree(componentPageRoot, frame._componentId)
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
