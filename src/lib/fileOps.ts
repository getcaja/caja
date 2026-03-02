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

/** Validate that the parsed JSON has a recognizable .caja structure */
function validateCajaData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const d = data as Record<string, unknown>
  // Must have either pages array (new format) or root object (legacy)
  const hasPages = Array.isArray(d.pages) && d.pages.length > 0
  const hasRoot = d.root != null && typeof d.root === 'object'
  if (!hasPages && !hasRoot) return false
  // If pages exist, each must have id and root
  if (hasPages) {
    for (const page of d.pages as unknown[]) {
      if (!page || typeof page !== 'object') return false
      const p = page as Record<string, unknown>
      if (typeof p.id !== 'string' || !p.root || typeof p.root !== 'object') return false
    }
  }
  return true
}

export async function openFile(): Promise<{ path: string; data: Record<string, unknown> } | null> {
  const path = await open({
    filters: [FILE_FILTER],
    multiple: false,
    directory: false,
  })
  if (!path) return null
  const content = await readTextFile(path)
  let data: unknown
  try {
    data = JSON.parse(content)
  } catch {
    throw new Error('File is not valid JSON')
  }
  if (!validateCajaData(data)) {
    throw new Error('File is not a valid .caja file (missing pages or root)')
  }
  return { path, data }
}
