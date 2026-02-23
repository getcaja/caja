import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { BoxElement } from '../types/frame'
import type { SnippetData } from '../store/snippetStore'

const FILE_EXTENSION = 'caja'
const FILE_FILTER = { name: 'Caja Layout', extensions: [FILE_EXTENSION] }

interface CajaFileData {
  root: BoxElement
  snippets?: SnippetData
}

export async function saveFile(root: BoxElement, snippets: SnippetData, currentPath: string | null): Promise<string | null> {
  if (currentPath) {
    const data: CajaFileData = { root, snippets }
    await writeTextFile(currentPath, JSON.stringify(data, null, 2))
    return currentPath
  }
  return saveFileAs(root, snippets)
}

export async function saveFileAs(root: BoxElement, snippets: SnippetData): Promise<string | null> {
  const path = await save({
    filters: [FILE_FILTER],
    defaultPath: `layout.${FILE_EXTENSION}`,
  })
  if (!path) return null
  const data: CajaFileData = { root, snippets }
  await writeTextFile(path, JSON.stringify(data, null, 2))
  return path
}

export async function openFile(): Promise<{ path: string; data: Record<string, unknown> } | null> {
  const path = await open({
    filters: [FILE_FILTER],
    multiple: false,
    directory: false,
  })
  if (!path) return null
  const content = await readTextFile(path)
  const data = JSON.parse(content)
  return { path, data }
}
