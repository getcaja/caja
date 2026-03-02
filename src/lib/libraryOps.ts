import { save, open } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { ComponentData } from '../store/catalogStore'

/** .cjl file format — Caja Library */
export interface CjlFileData {
  version: 1
  name: string
  author?: string
  description?: string
  libraryVersion?: string
  components: ComponentData
}

/** Open file dialog to read a .cjl file. Returns parsed data or null if cancelled. */
export async function readCjlFile(): Promise<CjlFileData | null> {
  const path = await open({
    filters: [{ name: 'Caja Library', extensions: ['cjl'] }],
    multiple: false,
    directory: false,
  })
  if (!path) return null

  const content = await readTextFile(path)
  const parsed = JSON.parse(content) as CjlFileData

  if (!parsed.components || !parsed.name) {
    throw new Error('Invalid .cjl file: missing name or components')
  }

  return parsed
}

/** Export components as a .cjl library file. Returns the save path or null if cancelled. */
export async function exportLibrary(
  data: ComponentData,
  meta: { name: string; author?: string; description?: string; version?: string }
): Promise<string | null> {
  const path = await save({
    filters: [{ name: 'Caja Library', extensions: ['cjl'] }],
    defaultPath: `${meta.name.toLowerCase().replace(/\s+/g, '-')}.cjl`,
  })
  if (!path) return null

  const cjl: CjlFileData = {
    version: 1,
    name: meta.name,
    author: meta.author,
    description: meta.description,
    libraryVersion: meta.version,
    components: data,
  }

  await writeTextFile(path, JSON.stringify(cjl, null, 2))
  return path
}

/** Save (overwrite) a .cjl library file to a known path — no file dialog. */
export async function saveLibrary(
  data: ComponentData,
  meta: { name: string; author?: string; description?: string; version?: string },
  path: string
): Promise<void> {
  const cjl: CjlFileData = {
    version: 1,
    name: meta.name,
    author: meta.author,
    description: meta.description,
    libraryVersion: meta.version,
    components: data,
  }
  await writeTextFile(path, JSON.stringify(cjl, null, 2))
}
