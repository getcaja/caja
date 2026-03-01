import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { Page } from '../types/frame'
import type { ComponentData } from '../store/catalogStore'

const FILE_EXTENSION = 'caja'
const FILE_FILTER = { name: 'Caja Layout', extensions: [FILE_EXTENSION] }

interface CajaFileData {
  pages: Page[]
  activePageId: string
  components?: ComponentData
  // Legacy: may have root instead of pages
  root?: unknown
}

export async function saveFile(pages: Page[], activePageId: string, components: ComponentData, currentPath: string | null): Promise<string | null> {
  if (currentPath) {
    const data: CajaFileData = { pages, activePageId, components }
    await writeTextFile(currentPath, JSON.stringify(data, null, 2))
    return currentPath
  }
  return saveFileAs(pages, activePageId, components)
}

export async function saveFileAs(pages: Page[], activePageId: string, components: ComponentData): Promise<string | null> {
  const path = await save({
    filters: [FILE_FILTER],
    defaultPath: `layout.${FILE_EXTENSION}`,
  })
  if (!path) return null
  const data: CajaFileData = { pages, activePageId, components }
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
