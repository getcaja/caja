// Resource readers for MCP — expose Caja state as read-only resources

import { useFrameStore } from '../store/frameStore'
import { exportToJSX } from '../utils/exportTailwind'
import type { Frame } from '../types/frame'

function findInTree(root: Frame, id: string): Frame | null {
  if (root.id === id) return root
  if (root.type === 'box') {
    for (const child of root.children) {
      const found = findInTree(child, id)
      if (found) return found
    }
  }
  return null
}

export interface Resource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export const resourceDefinitions: Resource[] = [
  {
    uri: 'caja://tree',
    name: 'Frame Tree',
    description: 'The complete layout tree as JSON',
    mimeType: 'application/json',
  },
  {
    uri: 'caja://selected',
    name: 'Selected Frame',
    description: 'The currently selected frame, or null',
    mimeType: 'application/json',
  },
  {
    uri: 'caja://export',
    name: 'Tailwind JSX Export',
    description: 'The current layout exported as Tailwind JSX code',
    mimeType: 'text/plain',
  },
]

export function readResource(uri: string): { content: string; mimeType: string } | null {
  const store = useFrameStore.getState()

  if (uri === 'caja://tree') {
    return {
      content: JSON.stringify(store.root, null, 2),
      mimeType: 'application/json',
    }
  }

  if (uri.startsWith('caja://tree/')) {
    const id = uri.slice('caja://tree/'.length)
    const frame = findInTree(store.root, id)
    if (!frame) return null
    return {
      content: JSON.stringify(frame, null, 2),
      mimeType: 'application/json',
    }
  }

  if (uri === 'caja://selected') {
    const selected = store.getSelected()
    return {
      content: JSON.stringify(selected, null, 2),
      mimeType: 'application/json',
    }
  }

  if (uri === 'caja://export') {
    const code = store.root.children.length > 0
      ? store.root.children.map((child) => exportToJSX(child)).join('\n\n')
      : '// Empty layout'
    return {
      content: code,
      mimeType: 'text/plain',
    }
  }

  return null
}
