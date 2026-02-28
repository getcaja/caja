// Resource readers for MCP — expose Caja state as read-only resources

import { useFrameStore, findInTree } from '../store/frameStore'
import { useCatalogStore } from '../store/catalogStore'
import { exportToJSX } from '../utils/exportTailwind'
import { exportToHTML } from '../utils/exportHtml'

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
  {
    uri: 'caja://export/html',
    name: 'Tailwind HTML Export',
    description: 'The current layout exported as Tailwind HTML code',
    mimeType: 'text/html',
  },
  {
    uri: 'caja://patterns',
    name: 'Components',
    description: 'All components (formerly patterns) in the current file as JSON',
    mimeType: 'application/json',
  },
  {
    uri: 'caja://components',
    name: 'Components',
    description: 'Alias for caja://patterns — all components in the current file',
    mimeType: 'application/json',
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

  if (uri === 'caja://export/html') {
    const code = store.root.children.length > 0
      ? store.root.children.map((child) => exportToHTML(child)).join('\n')
      : '<!-- Empty layout -->'
    return {
      content: code,
      mimeType: 'text/html',
    }
  }

  if (uri === 'caja://patterns' || uri === 'caja://snippets' || uri === 'caja://components') {
    const catalogStore = useCatalogStore.getState()
    const all = catalogStore.allComponents()
    return {
      content: JSON.stringify(all.map(({ id, name, tags, meta, createdAt }) => ({ id, name, tags, meta, createdAt })), null, 2),
      mimeType: 'application/json',
    }
  }

  return null
}
